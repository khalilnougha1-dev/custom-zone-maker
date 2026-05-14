
-- Attach stock management triggers to purchase_items and sale_items
DROP TRIGGER IF EXISTS trg_increment_stock_on_purchase ON public.purchase_items;
CREATE TRIGGER trg_increment_stock_on_purchase
  AFTER INSERT ON public.purchase_items
  FOR EACH ROW EXECUTE FUNCTION public.increment_stock_on_purchase();

DROP TRIGGER IF EXISTS trg_adjust_stock_on_purchase_update ON public.purchase_items;
CREATE TRIGGER trg_adjust_stock_on_purchase_update
  AFTER UPDATE ON public.purchase_items
  FOR EACH ROW EXECUTE FUNCTION public.adjust_stock_on_purchase_update();

DROP TRIGGER IF EXISTS trg_restore_stock_on_purchase_delete ON public.purchase_items;
CREATE TRIGGER trg_restore_stock_on_purchase_delete
  AFTER DELETE ON public.purchase_items
  FOR EACH ROW EXECUTE FUNCTION public.restore_stock_on_purchase_delete();

DROP TRIGGER IF EXISTS trg_decrement_stock_on_sale ON public.sale_items;
CREATE TRIGGER trg_decrement_stock_on_sale
  AFTER INSERT ON public.sale_items
  FOR EACH ROW EXECUTE FUNCTION public.decrement_stock_on_sale();

DROP TRIGGER IF EXISTS trg_adjust_stock_on_sale_update ON public.sale_items;
CREATE TRIGGER trg_adjust_stock_on_sale_update
  AFTER UPDATE ON public.sale_items
  FOR EACH ROW EXECUTE FUNCTION public.adjust_stock_on_sale_update();

DROP TRIGGER IF EXISTS trg_restore_stock_on_sale_delete ON public.sale_items;
CREATE TRIGGER trg_restore_stock_on_sale_delete
  AFTER DELETE ON public.sale_items
  FOR EACH ROW EXECUTE FUNCTION public.restore_stock_on_sale_delete();

-- Backfill: apply stock changes for existing purchase_items that haven't been counted yet
-- We detect missing movements by checking stock_movements for each item.
DO $$
DECLARE
  r RECORD;
  _uid uuid;
BEGIN
  FOR r IN
    SELECT pi.* FROM public.purchase_items pi
    WHERE pi.product_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.stock_movements sm
        WHERE sm.reference_type='purchase' AND sm.reference_id=pi.purchase_id AND sm.product_id=pi.product_id
      )
  LOOP
    SELECT user_id INTO _uid FROM public.purchases WHERE id = r.purchase_id;
    IF _uid IS NULL THEN CONTINUE; END IF;
    IF NOT EXISTS (SELECT 1 FROM public.products WHERE id=r.product_id AND user_id=_uid) THEN CONTINUE; END IF;
    UPDATE public.products
      SET stock_quantity = stock_quantity + r.quantity, cost_price = r.unit_cost, updated_at = now()
      WHERE id = r.product_id AND user_id = _uid;
    INSERT INTO public.stock_movements(user_id, product_id, product_name, movement_type, quantity_change, reference_type, reference_id, notes)
    VALUES (_uid, r.product_id, r.product_name, 'purchase', r.quantity, 'purchase', r.purchase_id, 'تعويض تلقائي');
  END LOOP;
END $$;
