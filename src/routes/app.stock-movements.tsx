import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, Search } from "lucide-react";
import { PosLayout } from "@/components/pos/PosLayout";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/stock-movements")({ component: StockMovementsPage });

const TYPE_LABEL: Record<string, string> = {
  sale: "بيع",
  sale_return: "إرجاع/إلغاء بيع",
  purchase: "شراء",
  purchase_return: "إرجاع/إلغاء شراء",
  adjustment: "تعديل يدوي",
};

function StockMovementsPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("stock_movements")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(500)
      .then(({ data }) => setRows(data || []));
  }, [user]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(r => (r.product_name || "").toLowerCase().includes(s));
  }, [rows, q]);

  return (
    <PosLayout title="سجل حركة المخزون">
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث عن منتج"
            className="pr-10 h-12 bg-card border-primary/40 text-right"
          />
        </div>

        <div className="text-sm text-muted-foreground text-right">عدد الحركات {filtered.length}</div>

        <div className="space-y-2 pb-20">
          {filtered.map((m) => {
            const positive = Number(m.quantity_change) > 0;
            const date = new Date(m.created_at);
            return (
              <div key={m.id} className="flex items-center gap-3 rounded-xl bg-card border border-border p-3 shadow-sm">
                <div className={`shrink-0 ${positive ? "text-success" : "text-destructive"}`}>
                  {positive ? <ArrowUpCircle className="h-8 w-8" /> : <ArrowDownCircle className="h-8 w-8" />}
                </div>
                <div className={`font-mono text-2xl font-bold w-20 text-left ${positive ? "text-success" : "text-destructive"}`}>
                  {positive ? "+" : ""}{Number(m.quantity_change)}
                </div>
                <div className="flex-1 min-w-0 text-right">
                  <div className="font-semibold truncate">{m.product_name}</div>
                  <div className="text-xs text-muted-foreground flex items-center justify-end gap-2">
                    <span>{date.toLocaleString("ar")}</span>
                    <span>•</span>
                    <span>{TYPE_LABEL[m.movement_type] || m.movement_type}</span>
                    {m.notes && (<><span>•</span><span>{m.notes}</span></>)}
                  </div>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-center text-muted-foreground py-12">لا توجد حركات بعد</div>
          )}
        </div>
      </div>
    </PosLayout>
  );
}
