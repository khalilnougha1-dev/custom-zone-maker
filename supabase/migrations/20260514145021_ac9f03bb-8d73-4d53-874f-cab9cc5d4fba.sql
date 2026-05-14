CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.product_packages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  units_count NUMERIC NOT NULL DEFAULT 1,
  apply_unit_price BOOLEAN NOT NULL DEFAULT false,
  cost_price NUMERIC NOT NULL DEFAULT 0,
  retail_price NUMERIC NOT NULL DEFAULT 0,
  barcode TEXT,
  image_url TEXT,
  notes TEXT,
  is_inactive BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.product_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_product_packages" ON public.product_packages
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins manage all product_packages" ON public.product_packages
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'super_admin'::app_role));

CREATE INDEX idx_product_packages_product ON public.product_packages(product_id);

CREATE TRIGGER trg_product_packages_updated_at
  BEFORE UPDATE ON public.product_packages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();