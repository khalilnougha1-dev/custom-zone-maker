REVOKE EXECUTE ON FUNCTION public.find_user_id_by_email(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.search_linkable_users(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.find_user_id_by_email(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.search_linkable_users(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;