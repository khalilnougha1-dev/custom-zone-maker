-- إعادة منح صلاحية تنفيذ دالة has_role للأدوار المصادق عليها
-- الدالة SECURITY DEFINER، آمنة للاستدعاء من سياسات RLS
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon, service_role;