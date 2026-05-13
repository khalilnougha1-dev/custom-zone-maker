
-- Attach stock decrement trigger to sale_items
DROP TRIGGER IF EXISTS trg_decrement_stock_on_sale ON public.sale_items;
CREATE TRIGGER trg_decrement_stock_on_sale
AFTER INSERT ON public.sale_items
FOR EACH ROW
EXECUTE FUNCTION public.decrement_stock_on_sale();

-- Attach stock increment trigger to purchase_items
DROP TRIGGER IF EXISTS trg_increment_stock_on_purchase ON public.purchase_items;
CREATE TRIGGER trg_increment_stock_on_purchase
AFTER INSERT ON public.purchase_items
FOR EACH ROW
EXECUTE FUNCTION public.increment_stock_on_purchase();
