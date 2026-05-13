import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, Printer, ImageIcon, History } from "lucide-react";
import { PosLayout } from "@/components/pos/PosLayout";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/inventory")({ component: InventoryPage });

function InventoryPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");

  useEffect(() => {
    if (!user) return;
    supabase.from("products").select("*").eq("user_id", user.id).order("name").then(({ data }) => setItems(data || []));
    supabase.from("categories").select("*").eq("user_id", user.id).order("name").then(({ data }) => setCategories(data || []));
  }, [user]);

  const filtered = useMemo(() => {
    return items.filter(p => {
      if (cat !== "all" && p.category_id !== cat) return false;
      if (q.trim() && !(p.name || "").toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [items, q, cat]);

  const handlePrint = () => window.print();

  const stockColor = (n: number) => n < 0 ? "text-destructive" : n === 0 ? "text-muted-foreground" : "text-success";

  return (
    <PosLayout title="المخزون" actions={
      <div className="flex items-center gap-1">
        <Link to="/app/stock-movements" className="rounded-lg p-2 hover:bg-white/10" aria-label="سجل الحركة"><History className="h-6 w-6" /></Link>
        <button onClick={handlePrint} className="rounded-lg p-2 hover:bg-white/10" aria-label="طباعة"><Printer className="h-6 w-6" /></button>
      </div>
    }>
      <div className="space-y-3">
        {/* Search row */}
        <div className="flex items-center gap-3">
          <span className="w-16 text-right text-base font-medium text-foreground/80">التسمية</span>
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} className="pr-10 h-12 bg-card border-primary/40 text-right" />
          </div>
        </div>

        {/* Category row */}
        <div className="flex items-center gap-3">
          <span className="w-16 text-right text-base font-medium text-foreground/80">الفئة</span>
          <div className="flex-1">
            <Select value={cat} onValueChange={setCat}>
              <SelectTrigger className="bg-card border-primary/40 h-12 text-right" dir="rtl">
                <SelectValue placeholder="[الكل]" />
              </SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value="all">[الكل]</SelectItem>
                {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="text-sm text-muted-foreground text-right">عدد المنتجات {filtered.length}</div>

        {/* Product rows */}
        <div className="space-y-2 pb-20">
          {filtered.map(p => {
            const stock = Number(p.stock_quantity);
            return (
              <Link
                key={p.id}
                to="/app/products"
                className="flex items-stretch gap-3 rounded-xl bg-card border border-border shadow-sm overflow-hidden"
              >
                {/* Stock number on the left */}
                <div className={`flex items-center justify-center w-16 shrink-0 font-mono text-3xl font-bold ${stockColor(stock)}`}>
                  {stock}
                </div>

                {/* Middle info */}
                <div className="flex-1 min-w-0 py-3 flex flex-col justify-between text-right">
                  <div className="font-semibold truncate text-base">{p.name}</div>
                  <div className="flex items-center justify-end gap-3 mt-1">
                    <span
                      className="font-mono text-base text-foreground tabular-nums"
                      style={{ fontFamily: '"DS-Digital", "Courier New", monospace', letterSpacing: "0.05em" }}
                    >
                      {Number(p.retail_price).toFixed(2)}
                    </span>
                    <span className="text-xs text-muted-foreground">Ref. {p.reference || "-"}</span>
                  </div>
                </div>

                {/* Image on the right */}
                <div className="h-20 w-20 shrink-0 flex items-center justify-center bg-muted/60 border-l border-border">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                  ) : (
                    <ImageIcon className="h-10 w-10 text-muted-foreground" />
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </PosLayout>
  );
}
