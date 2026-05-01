import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search, Printer, ImageIcon, ChevronDown } from "lucide-react";
import { PosLayout } from "@/components/pos/PosLayout";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/inventory")({ component: InventoryPage });

function InventoryPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase.from("products").select("*").eq("user_id", user.id).order("name").then(({ data }) => setItems(data || []));
  }, [user]);

  const filtered = items.filter(p => p.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <PosLayout title="المخزون" actions={
      <button className="rounded-lg p-2 hover:bg-white/10"><Printer className="h-5 w-5" /></button>
    }>
      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium">التسمية</label>
          <div className="relative mt-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} className="pr-10 bg-card border-accent/50" />
          </div>
        </div>
        <div>
          <label className="text-sm font-medium">الفئة</label>
          <button className="mt-1 flex w-full items-center justify-between rounded-md border border-accent/50 bg-card px-3 py-2">
            <ChevronDown className="h-4 w-4" />
            <span className="text-sm">[الكل]</span>
          </button>
        </div>
        <div className="text-sm text-muted-foreground">عدد المنتجات {filtered.length}</div>

        {filtered.map(p => (
          <Link key={p.id} to="/app/products" className="flex items-center gap-3 rounded-xl bg-card border border-border p-3 shadow-sm">
            <div className="h-16 w-16 shrink-0 flex items-center justify-center rounded-lg bg-muted/60 border border-border">
              {p.image_url ? <img src={p.image_url} className="h-full w-full object-cover rounded-lg" /> : <ImageIcon className="h-8 w-8 text-muted-foreground" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate text-right">{p.name}</div>
              <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                <span>Ref. {p.reference || "-"}</span>
                <span className="font-mono text-foreground text-base">{Number(p.retail_price).toFixed(2)}</span>
              </div>
            </div>
            <div className={`font-mono text-2xl font-bold ${Number(p.stock_quantity) < 0 ? "text-destructive" : Number(p.stock_quantity) === 0 ? "text-muted-foreground" : "text-success"}`}>
              {p.stock_quantity}
            </div>
          </Link>
        ))}
      </div>
    </PosLayout>
  );
}
