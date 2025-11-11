DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'quotes'
          AND column_name = 'subtotal'
    ) THEN
        ALTER TABLE quotes
            ADD COLUMN subtotal NUMERIC(14,2) NOT NULL DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'quotes'
          AND column_name = 'tax_rate'
    ) THEN
        ALTER TABLE quotes
            ADD COLUMN tax_rate NUMERIC(6,3) NOT NULL DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'quotes'
          AND column_name = 'tax_amount'
    ) THEN
        ALTER TABLE quotes
            ADD COLUMN tax_amount NUMERIC(14,2) NOT NULL DEFAULT 0;
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'quotes'
          AND column_name = 'total_amount'
    ) THEN
        ALTER TABLE quotes
            ADD COLUMN total_amount NUMERIC(14,2) NOT NULL DEFAULT 0;
    END IF;
END;
$$;
