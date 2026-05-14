ALTER TABLE public.sale_items
  ADD COLUMN IF NOT EXISTS package_id uuid,
  ADD COLUMN IF NOT EXISTS package_name text,
  ADD COLUMN IF NOT EXISTS package_units_count integer,
  ADD COLUMN IF NOT EXISTS package_qty numeric;