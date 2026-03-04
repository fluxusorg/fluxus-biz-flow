CREATE OR REPLACE FUNCTION public.update_stock_on_cargo_insert() RETURNS TRIGGER AS $$
DECLARE 
  rec_op_type text;
  rec_origin_type text;
  rec_dest_type text;
BEGIN
  -- Get the operation details from the parent record
  SELECT operation_type, origin_type, destination_type 
  INTO rec_op_type, rec_origin_type, rec_dest_type
  FROM public.material_records 
  WHERE id = NEW.record_id;

  -- Only update stock if the operation involves an external party
  IF NEW.stock_product_id IS NOT NULL THEN
    
    -- ENTRY: Only increase stock if coming from EXTERNAL source
    IF rec_op_type = 'entry' AND rec_origin_type = 'external' THEN 
      UPDATE public.stock_products 
      SET current_quantity = current_quantity + NEW.quantity, 
          updated_at = now() 
      WHERE id = NEW.stock_product_id;
    
    -- EXIT: Only decrease stock if going to EXTERNAL destination
    ELSIF rec_op_type = 'exit' AND rec_dest_type = 'external' THEN 
      UPDATE public.stock_products 
      SET current_quantity = GREATEST(0, current_quantity - NEW.quantity), 
          updated_at = now() 
      WHERE id = NEW.stock_product_id;
    END IF;
    
    -- Internal transfers (Int -> Int) do not affect total stock quantity in this simple model.
    -- If we had per-location stock, we would decrease from origin and increase in destination.
    -- But since stock is global per company (as per current schema), internal moves are neutral.

  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';
