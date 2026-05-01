import { createFileRoute, redirect } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { PosLayout } from "@/components/pos/PosLayout";
import { AdminPanel } from "@/components/admin/AdminPanel";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/admin")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/login" });
  },
  component: AppAdminPage,
});

// Adapter so PosLayout matches the AdminPanel's Layout signature
function PosLayoutAdapter({ title, children }: { title?: string; email?: string | null; children: ReactNode }) {
  return <PosLayout title={title || "لوحة المسؤول"}>{children}</PosLayout>;
}

function AppAdminPage() {
  return <AdminPanel Layout={PosLayoutAdapter} layoutTitle="لوحة المسؤول" />;
}
