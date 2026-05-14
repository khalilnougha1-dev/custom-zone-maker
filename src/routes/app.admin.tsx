import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { PosLayout } from "@/components/pos/PosLayout";
import { AdminPanel } from "@/components/admin/AdminPanel";
import { requireAdmin } from "@/lib/admin-guard";

export const Route = createFileRoute("/app/admin")({
  beforeLoad: async () => {
    await requireAdmin("/app");
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
