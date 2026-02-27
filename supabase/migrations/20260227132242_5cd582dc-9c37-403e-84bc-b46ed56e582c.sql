
-- Trigger to auto-update stock quantities on cargo insert
CREATE OR REPLACE FUNCTION public.update_stock_on_cargo_insert()
RETURNS TRIGGER AS $$
DECLARE
  op_type text;
BEGIN
  IF NEW.stock_product_id IS NOT NULL THEN
    SELECT operation_type INTO op_type
    FROM public.material_records
    WHERE id = NEW.record_id;
    
    IF op_type = 'entry' THEN
      UPDATE public.stock_products
      SET current_quantity = current_quantity + NEW.quantity,
          updated_at = now()
      WHERE id = NEW.stock_product_id;
    ELSIF op_type = 'exit' THEN
      UPDATE public.stock_products
      SET current_quantity = GREATEST(0, current_quantity - NEW.quantity),
          updated_at = now()
      WHERE id = NEW.stock_product_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

CREATE TRIGGER trigger_update_stock_on_cargo
AFTER INSERT ON public.record_cargos
FOR EACH ROW
EXECUTE FUNCTION public.update_stock_on_cargo_insert();
