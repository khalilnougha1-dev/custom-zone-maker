import { createFileRoute } from "@tanstack/react-router";
import { AdminPanel } from "@/components/admin/AdminPanel";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { requireAdmin } from "@/lib/admin-guard";

export const Route = createFileRoute("/admin")({
  beforeLoad: async () => {
    await requireAdmin("/app");
  },
  component: AdminStandalonePage,
});

function AdminStandalonePage() {
  return <AdminPanel Layout={AdminLayout} layoutTitle="لوحة المسؤول العامة" />;
}
