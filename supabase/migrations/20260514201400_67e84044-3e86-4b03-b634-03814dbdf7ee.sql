CREATE OR REPLACE FUNCTION public.search_linkable_users(_q text)
RETURNS TABLE(id uuid, full_name text, email text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT u.id,
         COALESCE(p.full_name, '') AS full_name,
         u.email::text
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.id = u.id
  WHERE length(coalesce(trim(_q), '')) >= 2
    AND (
      lower(u.email) LIKE '%' || lower(trim(_q)) || '%'
      OR lower(coalesce(p.full_name, '')) LIKE '%' || lower(trim(_q)) || '%'
    )
  ORDER BY (lower(u.email) = lower(trim(_q))) DESC, u.email
  LIMIT 10;
$$;

GRANT EXECUTE ON FUNCTION public.search_linkable_users(text) TO authenticated;