-- Quote and Invoice Number Generation Functions
-- These functions generate sequential numbers for quotes and invoices per company

-- Function to generate quote numbers
CREATE OR REPLACE FUNCTION generate_quote_number(company_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    next_number INTEGER;
    quote_number TEXT;
BEGIN
    -- Get the next quote number for this company
    SELECT COALESCE(MAX(CAST(SUBSTRING(quote_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
    INTO next_number
    FROM quotes
    WHERE company_id = company_uuid
    AND quote_number ~ '^QT-[0-9]+$';
    
    -- Format as QT-000001
    quote_number := 'QT-' || LPAD(next_number::TEXT, 6, '0');
    
    RETURN quote_number;
END;
$$ LANGUAGE plpgsql;

-- Function to generate invoice numbers
CREATE OR REPLACE FUNCTION generate_invoice_number(company_uuid UUID)
RETURNS TEXT AS $$
DECLARE
    next_number INTEGER;
    invoice_number TEXT;
BEGIN
    -- Get the next invoice number for this company
    SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
    INTO next_number
    FROM invoices
    WHERE company_id = company_uuid
    AND invoice_number ~ '^INV-[0-9]+$';
    
    -- Format as INV-000001
    invoice_number := 'INV-' || LPAD(next_number::TEXT, 6, '0');
    
    RETURN invoice_number;
END;
$$ LANGUAGE plpgsql;

-- Create quotes table if it doesn't exist (following existing schema pattern)
CREATE TABLE IF NOT EXISTS quotes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    load_id UUID REFERENCES loads(id) ON DELETE SET NULL,
    quote_number VARCHAR(50) NOT NULL,
    quote_date DATE NOT NULL DEFAULT CURRENT_DATE,
    valid_until DATE NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    currency currency_code NOT NULL DEFAULT 'USD',
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'rejected', 'expired', 'converted')),
    converted_to_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    notes TEXT,
    terms TEXT,
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    sent_at TIMESTAMP WITH TIME ZONE,
    accepted_at TIMESTAMP WITH TIME ZONE,
    rejected_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, quote_number)
);

-- Create quote_items table if it doesn't exist
CREATE TABLE IF NOT EXISTS quote_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
    unit_price DECIMAL(12,2) NOT NULL DEFAULT 0,
    line_total DECIMAL(12,2) NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on quotes table
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for quotes
CREATE POLICY "Company users can view company quotes" ON quotes
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    );

CREATE POLICY "Dispatchers and above can manage quotes" ON quotes
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM profiles 
            WHERE id = auth.uid() AND role IN ('company_admin', 'manager', 'dispatcher', 'super_admin')
        )
    );

-- Enable RLS on quote_items table
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for quote_items
CREATE POLICY "Company users can view company quote items" ON quote_items
    FOR SELECT USING (
        quote_id IN (
            SELECT id FROM quotes WHERE company_id IN (
                SELECT company_id FROM profiles WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Dispatchers and above can manage quote items" ON quote_items
    FOR ALL USING (
        quote_id IN (
            SELECT id FROM quotes WHERE company_id IN (
                SELECT company_id FROM profiles 
                WHERE id = auth.uid() AND role IN ('company_admin', 'manager', 'dispatcher', 'super_admin')
            )
        )
    );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_quotes_company_id ON quotes(company_id);
CREATE INDEX IF NOT EXISTS idx_quotes_customer_id ON quotes(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotes_load_id ON quotes(load_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_quote_date ON quotes(quote_date);
CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON quotes(created_at);

CREATE INDEX IF NOT EXISTS idx_quote_items_quote_id ON quote_items(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_items_sort_order ON quote_items(sort_order);

-- Create trigger to update quote totals when items change
CREATE OR REPLACE FUNCTION update_quote_totals()
RETURNS TRIGGER AS $$
BEGIN
    -- Update quote totals based on quote items
    UPDATE quotes 
    SET 
        subtotal = (
            SELECT COALESCE(SUM(line_total), 0) 
            FROM quote_items 
            WHERE quote_id = COALESCE(NEW.quote_id, OLD.quote_id)
        ),
        total_amount = (
            SELECT COALESCE(SUM(line_total), 0) 
            FROM quote_items 
            WHERE quote_id = COALESCE(NEW.quote_id, OLD.quote_id)
        ) + COALESCE((
            SELECT tax_amount 
            FROM quotes 
            WHERE id = COALESCE(NEW.quote_id, OLD.quote_id)
        ), 0),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.quote_id, OLD.quote_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for quote items
DROP TRIGGER IF EXISTS trigger_update_quote_totals_insert ON quote_items;
CREATE TRIGGER trigger_update_quote_totals_insert
    AFTER INSERT ON quote_items
    FOR EACH ROW
    EXECUTE FUNCTION update_quote_totals();

DROP TRIGGER IF EXISTS trigger_update_quote_totals_update ON quote_items;
CREATE TRIGGER trigger_update_quote_totals_update
    AFTER UPDATE ON quote_items
    FOR EACH ROW
    EXECUTE FUNCTION update_quote_totals();

DROP TRIGGER IF EXISTS trigger_update_quote_totals_delete ON quote_items;
CREATE TRIGGER trigger_update_quote_totals_delete
    AFTER DELETE ON quote_items
    FOR EACH ROW
    EXECUTE FUNCTION update_quote_totals();

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_quotes_updated_at ON quotes;
CREATE TRIGGER trigger_quotes_updated_at
    BEFORE UPDATE ON quotes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON quotes TO authenticated;
GRANT ALL ON quote_items TO authenticated;
GRANT EXECUTE ON FUNCTION generate_quote_number(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION generate_invoice_number(UUID) TO authenticated;
