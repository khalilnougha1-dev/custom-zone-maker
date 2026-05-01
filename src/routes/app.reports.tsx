import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText, BarChart3, TrendingUp, Wallet } from "lucide-react";
import { PosLayout } from "@/components/pos/PosLayout";

export const Route = createFileRoute("/app/reports")({ component: ReportsPage });

function ReportsPage() {
  const tiles = [
    { to: "/app/profits", label: "تقرير الأرباح", icon: TrendingUp },
    { to: "/app/finance", label: "الوضعية المالية", icon: Wallet },
    { to: "/app/sales", label: "تقرير المبيعات", icon: BarChart3 },
    { to: "/app/purchases", label: "تقرير المشتريات", icon: FileText },
  ];
  return (
    <PosLayout title="التقارير">
      <div className="grid grid-cols-2 gap-3">
        {tiles.map(t => (
          <Link key={t.to} to={t.to} className="rounded-2xl bg-card border border-border p-4 shadow-card hover:border-primary/40 transition text-center">
            <t.icon className="mx-auto h-10 w-10 text-primary mb-2" />
            <div className="font-semibold text-sm">{t.label}</div>
          </Link>
        ))}
      </div>
    </PosLayout>
  );
}
