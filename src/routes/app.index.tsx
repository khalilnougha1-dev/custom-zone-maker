import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ShoppingCart, Package, Users, Truck, Receipt, Wallet, BarChart3,
  TrendingUp, Boxes, Settings, FileText
} from "lucide-react";
import { PosLayout } from "@/components/pos/PosLayout";
import { BrandLogo } from "@/components/BrandLogo";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { ICONS_3D } from "@/lib/icons3d";
import bg3d from "@/assets/bg-3d.jpg";

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
      {/* Welcome banner with 3D background */}
      <div className="relative mb-5 overflow-hidden rounded-3xl text-primary-foreground shadow-elegant">
        <img src={bg3d} alt="" width={1600} height={1008} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-linear-to-l from-primary/70 via-primary/40 to-transparent" />
        <div className="relative flex items-center gap-4 p-5">
          <BrandLogo className="h-16 w-16 shadow-2xl ring-4 ring-primary-foreground/20 animate-float" />
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-widest opacity-80">SahlaPos</div>
            <div className="text-xl font-extrabold">مرحباً بك 👋</div>
            <div className="mt-1 text-sm opacity-85">مبيعات اليوم: <span className="font-mono font-bold">{stats.todayTotal.toFixed(2)}</span> دج</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <StatCard label="مبيعات اليوم" value={stats.todayTotal.toFixed(2)} hint="دج" icon={ICONS_3D["/app/sales"]} />
        <StatCard label="عمليات اليوم" value={String(stats.sales)} hint="عملية" icon={ICONS_3D["/app/pos"]} />
        <StatCard label="المنتجات" value={String(stats.products)} hint="منتج" icon={ICONS_3D["/app/products"]} />
        <StatCard label="الزبائن" value={String(stats.customers)} hint="زبون" icon={ICONS_3D["/app/customers"]} />
      </div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {TILES.map((t) => (
          <Link key={t.to} to={t.to} className="group tile-3d rounded-2xl p-3 pt-4">
            <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center">
              <img src={ICONS_3D[t.to]} alt="" width={64} height={64} loading="lazy" className="icon-3d h-16 w-16 object-contain" />
            </div>
            <div className="text-center text-xs font-bold text-foreground">{t.label}</div>
          </Link>
        ))}
      </div>
    </PosLayout>
  );
}

function StatCard({ label, value, hint, icon }: { label: string; value: string; hint: string; icon?: string }) {
  return (
    <div className="group tile-3d relative overflow-hidden rounded-2xl p-3">
      {icon && (
        <img src={icon} alt="" width={56} height={56} loading="lazy" className="icon-3d absolute -bottom-1 -left-1 h-14 w-14 object-contain opacity-90" />
      )}
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-2xl font-bold text-gradient">{value}</div>
      <div className="text-[10px] text-muted-foreground">{hint}</div>
    </div>
  );
}
