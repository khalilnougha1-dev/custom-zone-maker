
-- 1) Stock movements table
CREATE TABLE IF NOT EXISTS public.stock_movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  product_id uuid NOT NULL,
  product_name text NOT NULL,
  movement_type text NOT NULL, -- 'sale','sale_return','purchase','purchase_return','adjustment'
  quantity_change numeric NOT NULL, -- positive = add, negative = subtract
  reference_type text, -- 'sale','purchase','manual'
  reference_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_user ON public.stock_movements(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON public.stock_movements(product_id, created_at DESC);

ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_stock_movements" ON public.stock_movements;
CREATE POLICY "own_stock_movements" ON public.stock_movements
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 2) Updated trigger functions: sales
CREATE OR REPLACE FUNCTION public.decrement_stock_on_sale()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid;
BEGIN
  IF NEW.product_id IS NULL THEN RETURN NEW; END IF;
  SELECT user_id INTO _uid FROM public.sales WHERE id = NEW.sale_id;
  UPDATE public.products
    SET stock_quantity = stock_quantity - NEW.quantity, updated_at = now()
    WHERE id = NEW.product_id;
  INSERT INTO public.stock_movements(user_id, product_id, product_name, movement_type, quantity_change, reference_type, reference_id)
  VALUES (_uid, NEW.product_id, NEW.product_name, 'sale', -NEW.quantity, 'sale', NEW.sale_id);
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.adjust_stock_on_sale_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid; _diff numeric;
BEGIN
  IF NEW.product_id IS NULL THEN RETURN NEW; END IF;
  _diff := NEW.quantity - OLD.quantity;
  IF _diff = 0 THEN RETURN NEW; END IF;
  SELECT user_id INTO _uid FROM public.sales WHERE id = NEW.sale_id;
  UPDATE public.products
    SET stock_quantity = stock_quantity - _diff, updated_at = now()
    WHERE id = NEW.product_id;
  INSERT INTO public.stock_movements(user_id, product_id, product_name, movement_type, quantity_change, reference_type, reference_id, notes)
  VALUES (_uid, NEW.product_id, NEW.product_name, 'sale', -_diff, 'sale', NEW.sale_id, 'تعديل فاتورة بيع');
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.restore_stock_on_sale_delete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid;
BEGIN
  IF OLD.product_id IS NULL THEN RETURN OLD; END IF;
  SELECT user_id INTO _uid FROM public.sales WHERE id = OLD.sale_id;
  UPDATE public.products
    SET stock_quantity = stock_quantity + OLD.quantity, updated_at = now()
    WHERE id = OLD.product_id;
  INSERT INTO public.stock_movements(user_id, product_id, product_name, movement_type, quantity_change, reference_type, reference_id, notes)
  VALUES (_uid, OLD.product_id, OLD.product_name, 'sale_return', OLD.quantity, 'sale', OLD.sale_id, 'إلغاء/حذف فاتورة بيع');
  RETURN OLD;
END; $$;

-- 3) Updated trigger functions: purchases
CREATE OR REPLACE FUNCTION public.increment_stock_on_purchase()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid;
BEGIN
  IF NEW.product_id IS NULL THEN RETURN NEW; END IF;
  SELECT user_id INTO _uid FROM public.purchases WHERE id = NEW.purchase_id;
  UPDATE public.products
    SET stock_quantity = stock_quantity + NEW.quantity, cost_price = NEW.unit_cost, updated_at = now()
    WHERE id = NEW.product_id;
  INSERT INTO public.stock_movements(user_id, product_id, product_name, movement_type, quantity_change, reference_type, reference_id)
  VALUES (_uid, NEW.product_id, NEW.product_name, 'purchase', NEW.quantity, 'purchase', NEW.purchase_id);
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.adjust_stock_on_purchase_update()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid; _diff numeric;
BEGIN
  IF NEW.product_id IS NULL THEN RETURN NEW; END IF;
  _diff := NEW.quantity - OLD.quantity;
  IF _diff = 0 THEN RETURN NEW; END IF;
  SELECT user_id INTO _uid FROM public.purchases WHERE id = NEW.purchase_id;
  UPDATE public.products
    SET stock_quantity = stock_quantity + _diff, updated_at = now()
    WHERE id = NEW.product_id;
  INSERT INTO public.stock_movements(user_id, product_id, product_name, movement_type, quantity_change, reference_type, reference_id, notes)
  VALUES (_uid, NEW.product_id, NEW.product_name, 'purchase', _diff, 'purchase', NEW.purchase_id, 'تعديل فاتورة شراء');
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.restore_stock_on_purchase_delete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid;
BEGIN
  IF OLD.product_id IS NULL THEN RETURN OLD; END IF;
  SELECT user_id INTO _uid FROM public.purchases WHERE id = OLD.purchase_id;
  UPDATE public.products
    SET stock_quantity = stock_quantity - OLD.quantity, updated_at = now()
    WHERE id = OLD.product_id;
  INSERT INTO public.stock_movements(user_id, product_id, product_name, movement_type, quantity_change, reference_type, reference_id, notes)
  VALUES (_uid, OLD.product_id, OLD.product_name, 'purchase_return', -OLD.quantity, 'purchase', OLD.purchase_id, 'إلغاء/حذف فاتورة شراء');
  RETURN OLD;
END; $$;

-- 4) Attach triggers (drop & recreate)
DROP TRIGGER IF EXISTS trg_decrement_stock_on_sale ON public.sale_items;
DROP TRIGGER IF EXISTS trg_adjust_stock_on_sale_update ON public.sale_items;
DROP TRIGGER IF EXISTS trg_restore_stock_on_sale_delete ON public.sale_items;
DROP TRIGGER IF EXISTS trg_increment_stock_on_purchase ON public.purchase_items;
DROP TRIGGER IF EXISTS trg_adjust_stock_on_purchase_update ON public.purchase_items;
DROP TRIGGER IF EXISTS trg_restore_stock_on_purchase_delete ON public.purchase_items;

CREATE TRIGGER trg_decrement_stock_on_sale
  AFTER INSERT ON public.sale_items
  FOR EACH ROW EXECUTE FUNCTION public.decrement_stock_on_sale();
CREATE TRIGGER trg_adjust_stock_on_sale_update
  AFTER UPDATE OF quantity ON public.sale_items
  FOR EACH ROW EXECUTE FUNCTION public.adjust_stock_on_sale_update();
CREATE TRIGGER trg_restore_stock_on_sale_delete
  AFTER DELETE ON public.sale_items
  FOR EACH ROW EXECUTE FUNCTION public.restore_stock_on_sale_delete();

CREATE TRIGGER trg_increment_stock_on_purchase
  AFTER INSERT ON public.purchase_items
  FOR EACH ROW EXECUTE FUNCTION public.increment_stock_on_purchase();
CREATE TRIGGER trg_adjust_stock_on_purchase_update
  AFTER UPDATE OF quantity ON public.purchase_items
  FOR EACH ROW EXECUTE FUNCTION public.adjust_stock_on_purchase_update();
CREATE TRIGGER trg_restore_stock_on_purchase_delete
  AFTER DELETE ON public.purchase_items
  FOR EACH ROW EXECUTE FUNCTION public.restore_stock_on_purchase_delete();
