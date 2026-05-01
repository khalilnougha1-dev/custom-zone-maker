import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ShoppingCart, Truck, Calculator, BadgePercent, Utensils, Calculator as Calc, TrendingUp } from "lucide-react";
import { PosLayout } from "@/components/pos/PosLayout";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/profits")({ component: ProfitsPage });

const PERIODS = [
  { value: "today", label: "اليوم" },
  { value: "week", label: "الأسبوع" },
  { value: "month", label: "الشهر" },
  { value: "year", label: "السنة" },
  { value: "all", label: "الكل" },
];

function startDate(p: string) {
  const d = new Date();
  if (p === "today") d.setHours(0, 0, 0, 0);
  else if (p === "week") { d.setDate(d.getDate() - 7); }
  else if (p === "month") { d.setMonth(d.getMonth() - 1); }
  else if (p === "year") { d.setFullYear(d.getFullYear() - 1); }
  else return new Date(0);
  return d;
}

function ProfitsPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState("today");
  const [data, setData] = useState({ salesTotal: 0, salesCount: 0, costTotal: 0, taxTotal: 0, discountTotal: 0, discountCount: 0, expensesTotal: 0, expensesCount: 0 });

  useEffect(() => {
    if (!user) return;
    const since = startDate(period).toISOString();
    Promise.all([
      supabase.from("sales").select("total, discount, tax").eq("user_id", user.id).gte("created_at", since),
      supabase.from("sale_items").select("cost_price, quantity, sales!inner(user_id, created_at)").eq("sales.user_id", user.id).gte("sales.created_at", since),
      supabase.from("expenses").select("amount").eq("user_id", user.id).gte("created_at", since),
    ]).then(([sales, items, exp]) => {
      const s = sales.data || []; const it = items.data || []; const ex = exp.data || [];
      setData({
        salesTotal: s.reduce((a: number, x: any) => a + Number(x.total), 0),
        salesCount: s.length,
        costTotal: it.reduce((a: number, x: any) => a + Number(x.cost_price) * Number(x.quantity), 0),
        taxTotal: s.reduce((a: number, x: any) => a + Number(x.tax || 0), 0),
        discountTotal: s.reduce((a: number, x: any) => a + Number(x.discount || 0), 0),
        discountCount: s.filter((x: any) => Number(x.discount) > 0).length,
        expensesTotal: ex.reduce((a: number, x: any) => a + Number(x.amount), 0),
        expensesCount: ex.length,
      });
    });
  }, [user, period]);

  const grossProfit = data.salesTotal - data.costTotal;
  const netProfit = grossProfit - data.expensesTotal - data.taxTotal;

  const Row = ({ icon: Icon, label, value, count, color = "text-primary" }: any) => (
    <div className="flex items-center gap-3 rounded-xl bg-card border border-border p-3 shadow-sm">
      <Icon className="h-7 w-7 shrink-0" />
      <div className="flex-1 text-right">
        <div className="font-semibold text-sm">{label}</div>
        {count !== undefined && <div className="text-xs text-muted-foreground mt-0.5">{count} عملية</div>}
      </div>
      <div className={`font-mono text-xl font-bold tabular-nums ${color}`}>{value.toFixed(2)}</div>
    </div>
  );

  return (
    <PosLayout title="الأرباح">
      <div className="space-y-3">
        <div className="flex items-center gap-2 rounded-xl bg-card border border-accent/50 p-3">
          <select value={period} onChange={(e) => setPeriod(e.target.value)} className="flex-1 bg-transparent outline-none text-sm font-medium">
            {PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          <span className="text-sm text-muted-foreground">الفترة</span>
        </div>

        <Row icon={ShoppingCart} label="القيمة الإجمالية للمبيعات" value={data.salesTotal} count={data.salesCount} />
        <Row icon={Truck} label="القيمة الإجمالية للتكلفة" value={data.costTotal} />
        <Row icon={Calculator} label="الضريبة" value={data.taxTotal} count={data.salesCount} />
        <Row icon={BadgePercent} label="إجمالي المبالغ المخصومة" value={data.discountTotal} count={data.discountCount} />
        <Row icon={Utensils} label="المصاريف" value={data.expensesTotal} count={data.expensesCount} />

        <div className="pt-4 space-y-2">
          <div className="flex items-center gap-3 rounded-xl bg-card border border-border p-3 shadow-sm">
            <Calc className="h-7 w-7 shrink-0" />
            <div className="flex-1 text-right font-semibold">الأرباح الإجمالية</div>
            <div className="font-mono text-xl font-bold text-success tabular-nums">{grossProfit.toFixed(2)}</div>
          </div>
          <div className="flex items-center gap-3 rounded-xl bg-card border border-border p-3 shadow-sm">
            <TrendingUp className="h-7 w-7 shrink-0" />
            <div className="flex-1 text-right font-semibold">الأرباح الصافية</div>
            <div className={`font-mono text-xl font-bold tabular-nums ${netProfit >= 0 ? "text-success" : "text-destructive"}`}>{netProfit.toFixed(2)}</div>
          </div>
        </div>
      </div>
    </PosLayout>
  );
}
