import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app")({
  beforeLoad: async () => {
    // أوفلاين: اعتمد على الجلسة المحفوظة محليًا حتى يفتح التطبيق بدون إنترنت
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      const { data } = await supabase.auth.getSession();
      if (!data.session) throw redirect({ to: "/login" });
      return;
    }
    try {
      const { data } = await supabase.auth.getUser();
      if (!data.user) throw redirect({ to: "/login" });
    } catch (e) {
      if (e && typeof e === "object" && "to" in (e as any)) throw e;
      const { data } = await supabase.auth.getSession();
      if (!data.session) throw redirect({ to: "/login" });
    }
  },
  component: AppLayout,
});

function AppLayout() {
  return <Outlet />;
}
