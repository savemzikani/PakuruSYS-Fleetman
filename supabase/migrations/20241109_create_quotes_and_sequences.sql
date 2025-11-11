-- Quotes, document sequences, and customer defaults

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Quotes master table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quotes'
    ) THEN
        CREATE TABLE quotes (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
            customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
            dispatcher_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
            quote_number TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'approved', 'accepted', 'rejected', 'expired', 'converted')),
            valid_from DATE,
            valid_until DATE,
            currency TEXT NOT NULL DEFAULT 'USD',
            subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
            tax_rate NUMERIC(6,3) NOT NULL DEFAULT 0,
            tax_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
            total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
            notes TEXT,
            converted_load_id UUID REFERENCES loads(id) ON DELETE SET NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE (company_id, quote_number)
        );
    END IF;
END$$;

CREATE INDEX IF NOT EXISTS quotes_company_customer_idx ON quotes(company_id, customer_id);

-- Quote line items
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quote_items'
    ) THEN
        CREATE TABLE quote_items (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
            line_number INTEGER NOT NULL,
            description TEXT NOT NULL,
            quantity NUMERIC(14,3) NOT NULL DEFAULT 1,
            unit_price NUMERIC(14,2) NOT NULL DEFAULT 0,
            line_total NUMERIC(14,2) NOT NULL DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE (quote_id, line_number)
        );
    END IF;
END$$;

CREATE INDEX IF NOT EXISTS quote_items_quote_idx ON quote_items(quote_id);

-- Document sequencing per customer & document type
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'document_sequences'
    ) THEN
        CREATE TABLE document_sequences (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
            customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
            document_type TEXT NOT NULL,
            current_value INTEGER NOT NULL DEFAULT 0,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            UNIQUE (company_id, customer_id, document_type)
        );
    END IF;
END$$;

CREATE INDEX IF NOT EXISTS document_sequences_lookup_idx ON document_sequences(company_id, customer_id, document_type);

-- Maintain updated_at columns
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_quotes_updated_at') THEN
        CREATE TRIGGER update_quotes_updated_at
            BEFORE UPDATE ON quotes
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_quote_items_updated_at') THEN
        CREATE TRIGGER update_quote_items_updated_at
            BEFORE UPDATE ON quote_items
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_document_sequences_updated_at') THEN
        CREATE TRIGGER update_document_sequences_updated_at
            BEFORE UPDATE ON document_sequences
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END$$;

-- Row level security policies
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_sequences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Company users can view quotes" ON quotes;
CREATE POLICY "Company users can view quotes" ON quotes
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Managers can manage quotes" ON quotes;
CREATE POLICY "Managers can manage quotes" ON quotes
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM profiles
            WHERE id = auth.uid() AND role IN ('super_admin', 'company_admin', 'manager', 'dispatcher')
        )
    )
    WITH CHECK (
        company_id IN (
            SELECT company_id FROM profiles
            WHERE id = auth.uid() AND role IN ('super_admin', 'company_admin', 'manager', 'dispatcher')
        )
    );

DROP POLICY IF EXISTS "Company users can view quote items" ON quote_items;
CREATE POLICY "Company users can view quote items" ON quote_items
    FOR SELECT USING (
        quote_id IN (
            SELECT id FROM quotes
            WHERE company_id IN (
                SELECT company_id FROM profiles WHERE id = auth.uid()
            )
        )
    );

DROP POLICY IF EXISTS "Managers can manage quote items" ON quote_items;
CREATE POLICY "Managers can manage quote items" ON quote_items
    FOR ALL USING (
        quote_id IN (
            SELECT id FROM quotes
            WHERE company_id IN (
                SELECT company_id FROM profiles
                WHERE id = auth.uid() AND role IN ('super_admin', 'company_admin', 'manager', 'dispatcher')
            )
        )
    )
    WITH CHECK (
        quote_id IN (
            SELECT id FROM quotes
            WHERE company_id IN (
                SELECT company_id FROM profiles
                WHERE id = auth.uid() AND role IN ('super_admin', 'company_admin', 'manager', 'dispatcher')
            )
        )
    );

-- By default, document_sequences remains inaccessible to end users; access occurs via security definer functions.

-- Customer defaults for automation
ALTER TABLE customers
    ADD COLUMN IF NOT EXISTS default_payment_terms INTEGER,
    ADD COLUMN IF NOT EXISTS default_currency TEXT,
    ADD COLUMN IF NOT EXISTS default_tax_rate NUMERIC(6,3),
    ADD COLUMN IF NOT EXISTS auto_email_invoices BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS requires_po_number BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS invoice_delivery_email TEXT;

-- Link documents together
ALTER TABLE loads
    ADD COLUMN IF NOT EXISTS quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS origin_metadata JSONB;

ALTER TABLE invoices
    ADD COLUMN IF NOT EXISTS quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS source_load_id UUID REFERENCES loads(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS origin_metadata JSONB;

-- Document number generation helper
CREATE OR REPLACE FUNCTION next_document_number(doc_type TEXT, in_company_id UUID, in_customer_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    seq_value INTEGER;
    customer_name TEXT;
    customer_code TEXT;
    normalized TEXT;
    today DATE := CURRENT_DATE;
BEGIN
    SELECT name
    INTO customer_name
    FROM customers
    WHERE id = in_customer_id
      AND company_id = in_company_id
    LIMIT 1;

    normalized := COALESCE(customer_name, 'CST');
    normalized := UPPER(REGEXP_REPLACE(normalized, '[^A-Za-z0-9]', '', 'g'));
    IF LENGTH(normalized) >= 3 THEN
        customer_code := SUBSTRING(normalized FROM 1 FOR 3);
    ELSE
        customer_code := RPAD(normalized, 3, 'X');
    END IF;

    INSERT INTO document_sequences (company_id, customer_id, document_type, current_value)
    VALUES (in_company_id, in_customer_id, doc_type, 1)
    ON CONFLICT (company_id, customer_id, document_type)
    DO UPDATE SET current_value = document_sequences.current_value + 1, updated_at = NOW()
    RETURNING current_value INTO seq_value;

    IF doc_type = 'quote' THEN
        RETURN FORMAT('QT-%s-%s%s-%s', customer_code, TO_CHAR(today, 'YYYY'), TO_CHAR(today, 'MM'), LPAD(seq_value::TEXT, 3, '0'));
    ELSIF doc_type = 'load' THEN
        RETURN FORMAT('LD-%s-%s%s-%s', customer_code, TO_CHAR(today, 'YY'), TO_CHAR(today, 'MM'), LPAD(seq_value::TEXT, 3, '0'));
    ELSIF doc_type = 'invoice' THEN
        RETURN FORMAT('INV-%s-%s-%s', customer_code, TO_CHAR(today, 'YYYY'), LPAD(seq_value::TEXT, 4, '0'));
    ELSE
        RAISE EXCEPTION 'Unsupported document type: %', doc_type USING ERRCODE = '22023';
    END IF;
END;
$$;

COMMENT ON FUNCTION next_document_number(TEXT, UUID, UUID) IS 'Generates the next per-customer document number for quotes, loads, or invoices.';
