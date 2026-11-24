CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
  AND (
    auth.uid() IS NULL OR _user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin'))
  )
$$;

CREATE OR REPLACE FUNCTION public.can_link_users()
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT auth.uid() IS NOT NULL AND (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin'))
    OR EXISTS (SELECT 1 FROM public.trucks WHERE owner_id = auth.uid())
  )
$$;

CREATE OR REPLACE FUNCTION public.find_user_id_by_email(_email text)
 RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'auth'
AS $$
  SELECT id FROM auth.users
  WHERE public.can_link_users() AND lower(email) = lower(trim(_email))
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.search_linkable_users(_q text)
 RETURNS TABLE(id uuid, full_name text, email text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'auth'
AS $$
  SELECT u.id, COALESCE(p.full_name, '') AS full_name, u.email::text
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE public.can_link_users()
    AND position('@' in coalesce(_q,'')) > 0
    AND lower(u.email) = lower(trim(_q))
  LIMIT 1;
$$;

REVOKE EXECUTE ON FUNCTION public.can_link_users() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.can_link_users() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.find_user_id_by_email(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.search_linkable_users(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.find_user_id_by_email(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.search_linkable_users(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.protect_profile_subscription()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF current_setting('role', true) = 'authenticated'
     AND NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin','super_admin')) THEN
    NEW.subscription_expires_at := OLD.subscription_expires_at;
    NEW.subscription_status := OLD.subscription_status;
    NEW.is_active := OLD.is_active;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profile_subscription ON public.profiles;
CREATE TRIGGER trg_protect_profile_subscription
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_subscription();