ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_banned boolean NOT NULL DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banned_at timestamptz;

CREATE OR REPLACE FUNCTION public.protect_profile_subscription()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF current_user = 'authenticated'
     AND NOT public.has_role(auth.uid(), 'admin')
     AND NOT public.has_role(auth.uid(), 'super_admin') THEN
    NEW.subscription_expires_at := OLD.subscription_expires_at;
    NEW.subscription_status := OLD.subscription_status;
    NEW.is_active := OLD.is_active;
    NEW.is_banned := OLD.is_banned;
    NEW.banned_at := OLD.banned_at;
  END IF;
  RETURN NEW;
END;
$function$;