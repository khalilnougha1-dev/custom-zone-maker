CREATE OR REPLACE FUNCTION public.protect_profile_subscription()
 RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path TO 'public'
AS $$
BEGIN
  IF current_user = 'authenticated'
     AND NOT public.has_role(auth.uid(), 'admin')
     AND NOT public.has_role(auth.uid(), 'super_admin') THEN
    NEW.subscription_expires_at := OLD.subscription_expires_at;
    NEW.subscription_status := OLD.subscription_status;
    NEW.is_active := OLD.is_active;
  END IF;
  RETURN NEW;
END;
$$;