DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'quotes'
          AND column_name = 'dispatcher_id'
    ) THEN
        ALTER TABLE quotes
            ADD COLUMN dispatcher_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
    END IF;
END;
$$;
