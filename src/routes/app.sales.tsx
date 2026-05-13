import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, Receipt, Calendar, ShoppingCart } from "lucide-react";
import { PosLayout } from "@/components/pos/PosLayout";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/sales")({ component: SalesPage });

type Period = "today" | "yesterday" | "week" | "month" | "all";

function getRange(period: Period): { from?: Date; to?: Date } {
  const now = new Date();
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  if (period === "today") return { from: start, to: now };
  if (period === "yesterday") {
    const y = new Date(start); y.setDate(y.getDate() - 1);
    return { from: y, to: start };
  }
  if (period === "week") { const w = new Date(start); w.setDate(w.getDate() - 7); return { from: w, to: now }; }
  if (period === "month") { const m = new Date(start); m.setMonth(m.getMonth() - 1); return { from: m, to: now }; }
  return {};
}

function SalesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<Period>("today");
  const [customerQ, setCustomerQ] = useState("");
  const [sales, setSales] = useState<any[]>([]);
  const [customers, setCustomers] = useState<Record<string, string>>({});

  const range = useMemo(() => getRange(period), [period]);

  useEffect(() => {
    if (!user) return;
    let q = supabase.from("sales").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    if (range.from) q = q.gte("created_at", range.from.toISOString());
    if (range.to) q = q.lte("created_at", range.to.toISOString());
    q.limit(200).then(({ data }) => setSales(data || []));
    supabase.from("customers").select("id,name").eq("user_id", user.id).then(({ data }) => {
      const map: Record<string, string> = {};
      (data || []).forEach((c: any) => { map[c.id] = c.name; });
      setCustomers(map);
    });
  }, [user, period]);

  const filtered = useMemo(() => {
    if (!customerQ.trim()) return sales;
    const q = customerQ.toLowerCase();
    return sales.filter(s => (customers[s.customer_id] || "").toLowerCase().includes(q));
  }, [sales, customerQ, customers]);

  const total = filtered.reduce((s, x) => s + Number(x.total || 0), 0);

  return (
    <PosLayout title="قائمة المبيعات">
      {/* Filters */}
      <div className="space-y-3 mb-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-foreground/80 w-14 text-right">الفترة</span>
          <div className="flex-1">
            <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
              <SelectTrigger className="bg-card border-primary/40 h-12 text-right" dir="rtl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value="today">اليوم</SelectItem>
                <SelectItem value="yesterday">أمس</SelectItem>
                <SelectItem value="week">آخر 7 أيام</SelectItem>
                <SelectItem value="month">آخر 30 يوم</SelectItem>
                <SelectItem value="all">الكل</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-foreground/80 w-14 text-right">الزبون</span>
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={customerQ}
              onChange={(e) => setCustomerQ(e.target.value)}
              className="pr-10 h-12 bg-card border-primary/40 text-right"
            />
          </div>
        </div>
      </div>

      {/* List */}
      <div className="pb-40">
        {filtered.length === 0 ? (
          <div className="py-24 text-center text-muted-foreground">لا يوجد أي عملية بيع</div>
        ) : (
          <div className="space-y-2">
            {filtered.map(s => (
              <button
                key={s.id}
                onClick={() => navigate({ to: "/app/sales/$saleId", params: { saleId: s.id } })}
                className="w-full text-right flex items-center gap-3 rounded-xl bg-card border border-border p-3 shadow-sm hover:bg-muted/50 transition"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Receipt className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0 text-right">
                  <div className="font-semibold text-sm truncate">
                    {s.invoice_number || s.id.slice(0, 8)}
                    {s.customer_id && customers[s.customer_id] && (
                      <span className="text-muted-foreground font-normal"> — {customers[s.customer_id]}</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1 justify-end">
                    <Calendar className="h-3 w-3" />
                    {new Date(s.created_at).toLocaleString("ar")}
                  </div>
                </div>
                <div className="font-mono text-lg font-bold text-primary">{Number(s.total).toFixed(2)}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Floating red cart button -> new sale */}
      <button
        onClick={() => navigate({ to: "/app/pos" })}
        className="fixed bottom-44 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-red-600 to-red-700 text-white shadow-2xl hover:scale-110 transition active:scale-95"
        aria-label="بيع جديد"
      >
        <ShoppingCart className="h-6 w-6" />
      </button>

      {/* Total bar */}
      <div className="fixed bottom-16 left-0 right-0 z-20 border-t border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
          <div
            className="font-mono text-3xl font-bold text-[#1a237e] tabular-nums"
            style={{ fontFamily: '"DS-Digital", "Courier New", monospace', letterSpacing: "0.05em" }}
          >
            {total.toFixed(2)}
          </div>
          <div className="flex-1 text-right">
            <div className="text-base font-bold">المجموع</div>
            <div className="text-xs text-muted-foreground mt-0.5">{filtered.length} عملية بيع</div>
          </div>
        </div>
      </div>
    </PosLayout>
  );
}
