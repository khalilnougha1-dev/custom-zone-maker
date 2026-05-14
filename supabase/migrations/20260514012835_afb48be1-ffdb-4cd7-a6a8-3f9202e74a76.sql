
-- 1) Stock trigger ownership guards
CREATE OR REPLACE FUNCTION public.decrement_stock_on_sale()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _uid uuid;
BEGIN
  IF NEW.product_id IS NULL THEN RETURN NEW; END IF;
  SELECT user_id INTO _uid FROM public.sales WHERE id = NEW.sale_id;
  IF _uid IS NULL THEN RETURN NEW; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE id = NEW.product_id AND user_id = _uid) THEN
    RAISE EXCEPTION 'product_id % does not belong to sale owner', NEW.product_id USING ERRCODE = '42501';
  END IF;
  UPDATE public.products
    SET stock_quantity = stock_quantity - NEW.quantity, updated_at = now()
    WHERE id = NEW.product_id AND user_id = _uid;
  INSERT INTO public.stock_movements(user_id, product_id, product_name, movement_type, quantity_change, reference_type, reference_id)
  VALUES (_uid, NEW.product_id, NEW.product_name, 'sale', -NEW.quantity, 'sale', NEW.sale_id);
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.adjust_stock_on_sale_update()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _uid uuid; _diff numeric;
BEGIN
  IF NEW.product_id IS NULL THEN RETURN NEW; END IF;
  _diff := NEW.quantity - OLD.quantity;
  IF _diff = 0 THEN RETURN NEW; END IF;
  SELECT user_id INTO _uid FROM public.sales WHERE id = NEW.sale_id;
  IF _uid IS NULL THEN RETURN NEW; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE id = NEW.product_id AND user_id = _uid) THEN
    RAISE EXCEPTION 'product_id % does not belong to sale owner', NEW.product_id USING ERRCODE = '42501';
  END IF;
  UPDATE public.products
    SET stock_quantity = stock_quantity - _diff, updated_at = now()
    WHERE id = NEW.product_id AND user_id = _uid;
  INSERT INTO public.stock_movements(user_id, product_id, product_name, movement_type, quantity_change, reference_type, reference_id, notes)
  VALUES (_uid, NEW.product_id, NEW.product_name, 'sale', -_diff, 'sale', NEW.sale_id, 'تعديل فاتورة بيع');
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.restore_stock_on_sale_delete()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _uid uuid;
BEGIN
  IF OLD.product_id IS NULL THEN RETURN OLD; END IF;
  SELECT user_id INTO _uid FROM public.sales WHERE id = OLD.sale_id;
  IF _uid IS NULL THEN RETURN OLD; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE id = OLD.product_id AND user_id = _uid) THEN
    RETURN OLD;
  END IF;
  UPDATE public.products
    SET stock_quantity = stock_quantity + OLD.quantity, updated_at = now()
    WHERE id = OLD.product_id AND user_id = _uid;
  INSERT INTO public.stock_movements(user_id, product_id, product_name, movement_type, quantity_change, reference_type, reference_id, notes)
  VALUES (_uid, OLD.product_id, OLD.product_name, 'sale_return', OLD.quantity, 'sale', OLD.sale_id, 'إلغاء/حذف فاتورة بيع');
  RETURN OLD;
END; $function$;

CREATE OR REPLACE FUNCTION public.increment_stock_on_purchase()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _uid uuid;
BEGIN
  IF NEW.product_id IS NULL THEN RETURN NEW; END IF;
  SELECT user_id INTO _uid FROM public.purchases WHERE id = NEW.purchase_id;
  IF _uid IS NULL THEN RETURN NEW; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE id = NEW.product_id AND user_id = _uid) THEN
    RAISE EXCEPTION 'product_id % does not belong to purchase owner', NEW.product_id USING ERRCODE = '42501';
  END IF;
  UPDATE public.products
    SET stock_quantity = stock_quantity + NEW.quantity, cost_price = NEW.unit_cost, updated_at = now()
    WHERE id = NEW.product_id AND user_id = _uid;
  INSERT INTO public.stock_movements(user_id, product_id, product_name, movement_type, quantity_change, reference_type, reference_id)
  VALUES (_uid, NEW.product_id, NEW.product_name, 'purchase', NEW.quantity, 'purchase', NEW.purchase_id);
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.adjust_stock_on_purchase_update()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _uid uuid; _diff numeric;
BEGIN
  IF NEW.product_id IS NULL THEN RETURN NEW; END IF;
  _diff := NEW.quantity - OLD.quantity;
  IF _diff = 0 THEN RETURN NEW; END IF;
  SELECT user_id INTO _uid FROM public.purchases WHERE id = NEW.purchase_id;
  IF _uid IS NULL THEN RETURN NEW; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE id = NEW.product_id AND user_id = _uid) THEN
    RAISE EXCEPTION 'product_id % does not belong to purchase owner', NEW.product_id USING ERRCODE = '42501';
  END IF;
  UPDATE public.products
    SET stock_quantity = stock_quantity + _diff, updated_at = now()
    WHERE id = NEW.product_id AND user_id = _uid;
  INSERT INTO public.stock_movements(user_id, product_id, product_name, movement_type, quantity_change, reference_type, reference_id, notes)
  VALUES (_uid, NEW.product_id, NEW.product_name, 'purchase', _diff, 'purchase', NEW.purchase_id, 'تعديل فاتورة شراء');
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.restore_stock_on_purchase_delete()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _uid uuid;
BEGIN
  IF OLD.product_id IS NULL THEN RETURN OLD; END IF;
  SELECT user_id INTO _uid FROM public.purchases WHERE id = OLD.purchase_id;
  IF _uid IS NULL THEN RETURN OLD; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.products WHERE id = OLD.product_id AND user_id = _uid) THEN
    RETURN OLD;
  END IF;
  UPDATE public.products
    SET stock_quantity = stock_quantity - OLD.quantity, updated_at = now()
    WHERE id = OLD.product_id AND user_id = _uid;
  INSERT INTO public.stock_movements(user_id, product_id, product_name, movement_type, quantity_change, reference_type, reference_id, notes)
  VALUES (_uid, OLD.product_id, OLD.product_name, 'purchase_return', -OLD.quantity, 'purchase', OLD.purchase_id, 'إلغاء/حذف فاتورة شراء');
  RETURN OLD;
END; $function$;

-- 2) user_roles: restrict role management to super_admin only
DROP POLICY IF EXISTS "Admins manage roles" ON public.user_roles;
CREATE POLICY "Super admins manage roles"
  ON public.user_roles
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::app_role));

-- 3) Revoke EXECUTE on internal SECURITY DEFINER functions from anon/authenticated
-- (trigger functions don't need direct EXECUTE; RLS-helper functions are inlined)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.decrement_stock_on_sale() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.adjust_stock_on_sale_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.restore_stock_on_sale_delete() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_stock_on_purchase() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.adjust_stock_on_purchase_update() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.restore_stock_on_purchase_delete() FROM PUBLIC, anon, authenticated;
-- redeem_activation_code is intentionally callable by authenticated users
GRANT EXECUTE ON FUNCTION public.redeem_activation_code(text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.redeem_activation_code(text) FROM anon, PUBLIC;
