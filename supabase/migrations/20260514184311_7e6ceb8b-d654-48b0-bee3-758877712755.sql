DROP TRIGGER IF EXISTS trg_increment_stock_on_purchase ON public.purchase_items;
DROP TRIGGER IF EXISTS trg_adjust_stock_on_purchase_update ON public.purchase_items;
DROP TRIGGER IF EXISTS trg_restore_stock_on_purchase_delete ON public.purchase_items;
DROP TRIGGER IF EXISTS trg_decrement_stock_on_sale ON public.sale_items;
DROP TRIGGER IF EXISTS trg_adjust_stock_on_sale_update ON public.sale_items;
DROP TRIGGER IF EXISTS trg_restore_stock_on_sale_delete ON public.sale_items;

CREATE TRIGGER trg_increment_stock_on_purchase
AFTER INSERT ON public.purchase_items
FOR EACH ROW EXECUTE FUNCTION public.increment_stock_on_purchase();

CREATE TRIGGER trg_adjust_stock_on_purchase_update
AFTER UPDATE ON public.purchase_items
FOR EACH ROW EXECUTE FUNCTION public.adjust_stock_on_purchase_update();

CREATE TRIGGER trg_restore_stock_on_purchase_delete
AFTER DELETE ON public.purchase_items
FOR EACH ROW EXECUTE FUNCTION public.restore_stock_on_purchase_delete();

CREATE TRIGGER trg_decrement_stock_on_sale
AFTER INSERT ON public.sale_items
FOR EACH ROW EXECUTE FUNCTION public.decrement_stock_on_sale();

CREATE TRIGGER trg_adjust_stock_on_sale_update
AFTER UPDATE ON public.sale_items
FOR EACH ROW EXECUTE FUNCTION public.adjust_stock_on_sale_update();

CREATE TRIGGER trg_restore_stock_on_sale_delete
AFTER DELETE ON public.sale_items
FOR EACH ROW EXECUTE FUNCTION public.restore_stock_on_sale_delete();