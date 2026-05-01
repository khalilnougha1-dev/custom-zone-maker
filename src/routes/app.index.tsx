import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ShoppingCart, Package, Users, Truck, Receipt, Wallet, BarChart3,
  TrendingUp, Boxes, Printer, Settings, FileText
} from "lucide-react";
import { PosLayout } from "@/components/pos/PosLayout";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/")({ component: AppHome });

const TILES = [
  { to: "/app/pos", label: "نقطة البيع", icon: ShoppingCart, color: "from-violet-500 to-purple-600" },
  { to: "/app/sales", label: "المبيعات", icon: Receipt, color: "from-blue-500 to-indigo-600" },
  { to: "/app/purchases", label: "المشتريات", icon: Truck, color: "from-amber-500 to-orange-600" },
  { to: "/app/products", label: "المنتجات", icon: Package, color: "from-emerald-500 to-teal-600" },
  { to: "/app/inventory", label: "المخزون", icon: Boxes, color: "from-cyan-500 to-sky-600" },
  { to: "/app/customers", label: "الزبائن", icon: Users, color: "from-pink-500 to-rose-600" },
  { to: "/app/suppliers", label: "الممونين", icon: Truck, color: "from-orange-500 to-red-600" },
  { to: "/app/expenses", label: "المصاريف", icon: Wallet, color: "from-red-500 to-pink-600" },
  { to: "/app/finance", label: "الوضعية المالية", icon: TrendingUp, color: "from-green-500 to-emerald-600" },
  { to: "/app/profits", label: "الأرباح", icon: BarChart3, color: "from-lime-500 to-green-600" },
  { to: "/app/reports", label: "التقارير", icon: FileText, color: "from-slate-500 to-slate-700" },
  { to: "/app/settings", label: "الإعدادات", icon: Settings, color: "from-zinc-500 to-zinc-700" },
];

function AppHome() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ sales: 0, products: 0, customers: 0, todayTotal: 0 });

  useEffect(() => {
    if (!user) return;
    const today = new Date(); today.setHours(0,0,0,0);
    Promise.all([
      supabase.from("sales").select("total", { count: "exact" }).eq("user_id", user.id).gte("created_at", today.toISOString()),
      supabase.from("products").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("customers").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    ]).then(([sales, products, customers]) => {
      const todayTotal = (sales.data || []).reduce((s, r: any) => s + Number(r.total || 0), 0);
      setStats({
        sales: sales.count || 0,
        products: products.count || 0,
        customers: customers.count || 0,
        todayTotal,
      });
    });
  }, [user]);

  return (
    <PosLayout title="الرئيسية">
      <div className="grid grid-cols-2 gap-3 mb-6">
        <StatCard label="مبيعات اليوم" value={stats.todayTotal.toFixed(2)} hint="دج" />
        <StatCard label="عمليات اليوم" value={String(stats.sales)} hint="عملية" />
        <StatCard label="المنتجات" value={String(stats.products)} hint="منتج" />
        <StatCard label="الزبائن" value={String(stats.customers)} hint="زبون" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {TILES.map((t) => (
          <Link key={t.to} to={t.to} className="group rounded-2xl bg-card p-3 shadow-card border border-border hover:border-primary/40 transition">
            <div className={`mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${t.color} text-white shadow-md group-hover:scale-110 transition`}>
              <t.icon className="h-6 w-6" />
            </div>
            <div className="text-center text-xs font-semibold text-foreground">{t.label}</div>
          </Link>
        ))}
      </div>
    </PosLayout>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl bg-card border border-border p-3 shadow-card">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-2xl font-bold text-primary">{value}</div>
      <div className="text-[10px] text-muted-foreground">{hint}</div>
    </div>
  );
}
