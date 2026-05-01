import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Receipt, Calendar } from "lucide-react";
import { PosLayout } from "@/components/pos/PosLayout";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/sales")({ component: SalesPage });

function SalesPage() {
  const { user } = useAuth();
  const [sales, setSales] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("sales").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100)
      .then(({ data }) => setSales(data || []));
  }, [user]);

  const total = sales.reduce((s, x) => s + Number(x.total || 0), 0);

  return (
    <PosLayout title="المبيعات">
      <div className="rounded-2xl bg-gradient-primary p-4 text-primary-foreground shadow-card mb-4">
        <div className="text-sm opacity-90">إجمالي المبيعات</div>
        <div className="font-mono text-3xl font-bold mt-1">{total.toFixed(2)}</div>
        <div className="text-xs opacity-80 mt-1">{sales.length} عملية</div>
      </div>

      {sales.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
          لا توجد مبيعات بعد
        </div>
      ) : (
        <div className="space-y-2">
          {sales.map(s => (
            <div key={s.id} className="flex items-center gap-3 rounded-xl bg-card border border-border p-3 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Receipt className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0 text-right">
                <div className="font-semibold text-sm">{s.invoice_number || s.id.slice(0, 8)}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(s.created_at).toLocaleString("ar")}
                </div>
              </div>
              <div className="font-mono text-lg font-bold text-primary">{Number(s.total).toFixed(2)}</div>
            </div>
          ))}
        </div>
      )}
    </PosLayout>
  );
}
