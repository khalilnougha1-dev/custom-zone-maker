-- Activation codes
CREATE TABLE public.activation_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  user_id UUID,
  duration_days INTEGER NOT NULL DEFAULT 30,
  is_used BOOLEAN NOT NULL DEFAULT false,
  used_at TIMESTAMPTZ,
  created_by UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.activation_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin manages activation codes"
  ON public.activation_codes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users view own assigned code"
  ON public.activation_codes FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Trucks
CREATE TABLE public.trucks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_id UUID NOT NULL,
  name TEXT NOT NULL,
  plate_number TEXT,
  driver_name TEXT,
  driver_phone TEXT,
  driver_user_id UUID,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.trucks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages own trucks"
  ON public.trucks FOR ALL TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Driver views assigned truck"
  ON public.trucks FOR SELECT TO authenticated
  USING (auth.uid() = driver_user_id);

CREATE TRIGGER set_trucks_updated_at
  BEFORE UPDATE ON public.trucks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Distributions
CREATE TABLE public.truck_distributions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  truck_id UUID NOT NULL REFERENCES public.trucks(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL,
  customer_id UUID,
  customer_name TEXT,
  product_id UUID,
  product_name TEXT NOT NULL,
  quantity NUMERIC NOT NULL DEFAULT 0,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  paid NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  delivery_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.truck_distributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages distributions"
  ON public.truck_distributions FOR ALL TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Driver views own truck distributions"
  ON public.truck_distributions FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.trucks t
    WHERE t.id = truck_distributions.truck_id AND t.driver_user_id = auth.uid()
  ));

CREATE POLICY "Driver updates own truck distributions"
  ON public.truck_distributions FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.trucks t
    WHERE t.id = truck_distributions.truck_id AND t.driver_user_id = auth.uid()
  ));

CREATE TRIGGER set_truck_distributions_updated_at
  BEFORE UPDATE ON public.truck_distributions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_distributions_truck ON public.truck_distributions(truck_id);
CREATE INDEX idx_distributions_owner ON public.truck_distributions(owner_id);