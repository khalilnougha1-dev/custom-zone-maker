import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Truck, Calendar } from "lucide-react";
import { PosLayout } from "@/components/pos/PosLayout";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/purchases")({ component: PurchasesPage });

function PurchasesPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("purchases").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100)
      .then(({ data }) => setItems(data || []));
  }, [user]);

  const total = items.reduce((s, x) => s + Number(x.total || 0), 0);

  return (
    <PosLayout title="المشتريات">
      <div className="rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 p-4 text-white shadow-card mb-4">
        <div className="text-sm opacity-90">إجمالي المشتريات</div>
        <div className="font-mono text-3xl font-bold mt-1">{total.toFixed(2)}</div>
        <div className="text-xs opacity-80 mt-1">{items.length} عملية</div>
      </div>
      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">لا توجد مشتريات</div>
      ) : (
        <div className="space-y-2">
          {items.map(s => (
            <div key={s.id} className="flex items-center gap-3 rounded-xl bg-card border border-border p-3 shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600">
                <Truck className="h-5 w-5" />
              </div>
              <div className="flex-1 text-right">
                <div className="font-semibold text-sm">{s.invoice_number || s.id.slice(0, 8)}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><Calendar className="h-3 w-3" />{new Date(s.created_at).toLocaleString("ar")}</div>
              </div>
              <div className="font-mono text-lg font-bold text-amber-600">{Number(s.total).toFixed(2)}</div>
            </div>
          ))}
        </div>
      )}
    </PosLayout>
  );
}
