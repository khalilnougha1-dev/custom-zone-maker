import { createFileRoute, redirect } from "@tanstack/react-router";
import { AdminPanel } from "@/components/admin/AdminPanel";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
  },
  component: AdminStandalonePage,
});

function AdminStandalonePage() {
  return <AdminPanel Layout={AdminLayout} layoutTitle="لوحة المسؤول العامة" />;
}
