
CREATE OR REPLACE FUNCTION public.find_user_id_by_email(_email text)
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT id FROM auth.users WHERE lower(email) = lower(trim(_email)) LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.find_user_id_by_email(text) TO authenticated;
