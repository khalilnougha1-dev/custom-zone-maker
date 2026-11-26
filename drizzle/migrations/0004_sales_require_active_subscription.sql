CREATE OR REPLACE FUNCTION public.has_active_subscription()
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.is_banned = false
      AND p.subscription_status <> 'expired'
      AND p.subscription_expires_at IS NOT NULL
      AND p.subscription_expires_at > now()
  )
$$;

REVOKE EXECUTE ON FUNCTION public.has_active_subscription() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_active_subscription() TO authenticated, service_role;

DROP POLICY IF EXISTS "own_sales" ON public.sales;
CREATE POLICY "own_sales" ON public.sales FOR ALL TO authenticated
  USING (auth.uid() = user_id AND public.has_active_subscription())
  WITH CHECK (auth.uid() = user_id AND public.has_active_subscription());

DROP POLICY IF EXISTS "own_sale_items" ON public.sale_items;
CREATE POLICY "own_sale_items" ON public.sale_items FOR ALL TO authenticated
  USING (public.has_active_subscription() AND EXISTS (SELECT 1 FROM public.sales s WHERE s.id = sale_items.sale_id AND s.user_id = auth.uid()))
  WITH CHECK (public.has_active_subscription() AND EXISTS (SELECT 1 FROM public.sales s WHERE s.id = sale_items.sale_id AND s.user_id = auth.uid()));