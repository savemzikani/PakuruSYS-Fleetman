-- Extend invoices schema to support line items and payment details

ALTER TABLE invoices
    ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(6,3) DEFAULT 0;

ALTER TABLE invoices
    ADD COLUMN IF NOT EXISTS payment_terms INTEGER DEFAULT 30;

ALTER TABLE invoices
    ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;

-- Backfill existing rows
UPDATE invoices
SET payment_terms = COALESCE(payment_terms, 30),
    items = COALESCE(items, '[]'::jsonb);
