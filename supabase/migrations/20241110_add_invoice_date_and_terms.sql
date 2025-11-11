-- Align invoices table with application expectations

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'invoices'
          AND column_name = 'invoice_date'
    ) THEN
        ALTER TABLE invoices
            ADD COLUMN invoice_date DATE;
    END IF;
END
$$;

UPDATE invoices
SET invoice_date = COALESCE(invoice_date, issue_date)
WHERE invoice_date IS DISTINCT FROM issue_date;

ALTER TABLE invoices
    ALTER COLUMN invoice_date SET NOT NULL;
