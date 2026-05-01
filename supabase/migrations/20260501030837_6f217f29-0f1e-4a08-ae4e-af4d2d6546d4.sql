ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS is_inactive boolean NOT NULL DEFAULT false;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS email text;