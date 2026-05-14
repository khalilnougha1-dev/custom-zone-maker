ALTER TABLE public.purchase_items
  ADD COLUMN IF NOT EXISTS package_id uuid,
  ADD COLUMN IF NOT EXISTS package_name text,
  ADD COLUMN IF NOT EXISTS package_units_count integer,
  ADD COLUMN IF NOT EXISTS package_qty numeric;