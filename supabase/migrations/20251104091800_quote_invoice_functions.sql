-- Quote and invoice helpers plus scoped RLS
SET statement_timeout = 0;

CREATE OR REPLACE FUNCTION public.generate_quote_number(company_uuid UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  next_number INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(quote_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
  INTO next_number
  FROM public.quotes
  WHERE company_id = company_uuid
    AND quote_number ~ '^QT-[0-9]+$';

  RETURN 'QT-' || LPAD(next_number::TEXT, 6, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_invoice_number(company_uuid UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  next_number INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(invoice_number FROM '[0-9]+$') AS INTEGER)), 0) + 1
  INTO next_number
  FROM public.invoices
  WHERE company_id = company_uuid
    AND invoice_number ~ '^INV-[0-9]+$';

  RETURN 'INV-' || LPAD(next_number::TEXT, 6, '0');
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_quote_number(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.generate_invoice_number(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.update_quote_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  target_quote UUID;
BEGIN
  target_quote := COALESCE(NEW.quote_id, OLD.quote_id);

  UPDATE public.quotes
  SET
    subtotal = (
      SELECT COALESCE(SUM(line_total), 0)
      FROM public.quote_items
      WHERE quote_id = target_quote
    ),
    total_amount = (
      SELECT COALESCE(SUM(line_total), 0)
      FROM public.quote_items
      WHERE quote_id = target_quote
    ) + COALESCE(total_amount - subtotal, 0),
    updated_at = NOW()
  WHERE id = target_quote;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_quote_totals_insert ON public.quote_items;
DROP TRIGGER IF EXISTS trigger_update_quote_totals_update ON public.quote_items;
DROP TRIGGER IF EXISTS trigger_update_quote_totals_delete ON public.quote_items;

CREATE TRIGGER trigger_update_quote_totals_insert
  AFTER INSERT ON public.quote_items
  FOR EACH ROW EXECUTE FUNCTION public.update_quote_totals();

CREATE TRIGGER trigger_update_quote_totals_update
  AFTER UPDATE ON public.quote_items
  FOR EACH ROW EXECUTE FUNCTION public.update_quote_totals();

CREATE TRIGGER trigger_update_quote_totals_delete
  AFTER DELETE ON public.quote_items
  FOR EACH ROW EXECUTE FUNCTION public.update_quote_totals();

DROP TRIGGER IF EXISTS trigger_quotes_updated_at ON public.quotes;
CREATE TRIGGER trigger_quotes_updated_at
  BEFORE UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP POLICY IF EXISTS "Company users can view company quotes" ON public.quotes;
DROP POLICY IF EXISTS "Dispatchers and above can manage quotes" ON public.quotes;
DROP POLICY IF EXISTS quotes_select_scoped ON public.quotes;
DROP POLICY IF EXISTS quotes_manage_scoped ON public.quotes;

CREATE POLICY quotes_select_scoped ON public.quotes
  FOR SELECT USING (
    public.get_user_role() = 'super_admin'
    OR company_id = public.get_user_company_id()
  );

CREATE POLICY quotes_manage_scoped ON public.quotes
  FOR ALL USING (
    public.get_user_role() IN ('super_admin', 'company_admin', 'manager', 'dispatcher')
    AND company_id = public.get_user_company_id()
  )
  WITH CHECK (
    public.get_user_role() IN ('super_admin', 'company_admin', 'manager', 'dispatcher')
    AND company_id = public.get_user_company_id()
  );

DROP POLICY IF EXISTS "Company users can view company quote items" ON public.quote_items;
DROP POLICY IF EXISTS "Dispatchers and above can manage quote items" ON public.quote_items;
DROP POLICY IF EXISTS quote_items_select_scoped ON public.quote_items;
DROP POLICY IF EXISTS quote_items_manage_scoped ON public.quote_items;

CREATE POLICY quote_items_select_scoped ON public.quote_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.quotes q
      WHERE q.id = quote_id
        AND (
          public.get_user_role() = 'super_admin'
          OR q.company_id = public.get_user_company_id()
        )
    )
  );

CREATE POLICY quote_items_manage_scoped ON public.quote_items
  FOR ALL USING (
    EXISTS (
      SELECT 1
      FROM public.quotes q
      WHERE q.id = quote_id
        AND public.get_user_role() IN ('super_admin', 'company_admin', 'manager', 'dispatcher')
        AND q.company_id = public.get_user_company_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.quotes q
      WHERE q.id = quote_id
        AND public.get_user_role() IN ('super_admin', 'company_admin', 'manager', 'dispatcher')
        AND q.company_id = public.get_user_company_id()
    )
  );

CREATE INDEX IF NOT EXISTS idx_quotes_customer_id ON public.quotes(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotes_load_id ON public.quotes(load_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON public.quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_quote_date ON public.quotes(quote_date);
CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON public.quotes(created_at);
CREATE INDEX IF NOT EXISTS idx_quote_items_sort_order ON public.quote_items(sort_order);
