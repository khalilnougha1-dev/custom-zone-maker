import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, Printer, ImageIcon, History, Plus } from "lucide-react";
import { PosLayout } from "@/components/pos/PosLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/inventory")({
  head: () => ({ meta: [
    { title: "المخزون وكميات المنتجات | SahlaPos" },
    { name: "description", content: "متابعة مخزون المنتجات وأسعارها والبحث حسب التسمية والفئة في SahlaPos." },
    { property: "og:title", content: "المخزون وكميات المنتجات | SahlaPos" },
    { property: "og:description", content: "متابعة مخزون المنتجات وأسعارها والبحث حسب التسمية والفئة في SahlaPos." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: InventoryPage,
});

function InventoryPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");

  const reload = () => {
    if (!user) return;
    supabase.from("products").select("*").eq("user_id", user.id).order("name").then(({ data }) => setItems(data || []));
    supabase.from("categories").select("*").eq("user_id", user.id).order("name").then(({ data }) => setCategories(data || []));
  };

  useEffect(() => {
    reload();
    const onFocus = () => reload();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
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
        <Button asChild variant="ghost" size="icon" className="h-8 w-8 shrink-0 hover:bg-primary-foreground/10"><Link to="/app/stock-adjust" aria-label="تعديل يدوي" title="تعديل يدوي"><Plus className="h-5 w-5" /></Link></Button>
        <Button asChild variant="ghost" size="icon" className="h-8 w-8 shrink-0 hover:bg-primary-foreground/10"><Link to="/app/stock-movements" aria-label="سجل الحركة" title="سجل الحركة"><History className="h-5 w-5" /></Link></Button>
        <Button onClick={handlePrint} variant="ghost" size="icon" className="h-8 w-8 shrink-0 hover:bg-primary-foreground/10" aria-label="طباعة" title="طباعة"><Printer className="h-5 w-5" /></Button>
      </div>
    }>
      <div className="mx-auto w-full max-w-3xl space-y-4">
        {/* Search row */}
        <div className="grid grid-cols-[4rem_minmax(0,1fr)] items-center gap-3">
          <label htmlFor="inventory-search" className="min-w-0 text-right text-sm font-semibold text-foreground">التسمية</label>
          <div className="relative min-w-0">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input id="inventory-search" value={q} onChange={(e) => setQ(e.target.value)} className="pr-10 h-12 bg-card border-primary/40 text-right" />
          </div>
        </div>

        {/* Category row */}
        <div className="grid grid-cols-[4rem_minmax(0,1fr)] items-center gap-3">
          <label htmlFor="inventory-category" className="min-w-0 text-right text-sm font-semibold text-foreground">الفئة</label>
          <div className="min-w-0">
            <Select value={cat} onValueChange={setCat}>
              <SelectTrigger id="inventory-category" className="bg-card border-primary/40 h-12 text-right" dir="rtl">
                <SelectValue placeholder="[الكل]" />
              </SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value="all">[الكل]</SelectItem>
                {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between border-b border-border pb-3 text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">المنتجات</span>
          <span>عدد المنتجات <span className="font-mono tabular-nums">{filtered.length}</span></span>
        </div>

        {/* Product rows */}
        <div className="space-y-2 pb-20">
          {filtered.map(p => {
            const stock = Number(p.stock_quantity);
            return (
              <Link
                key={p.id}
                to="/app/products"
                className="grid min-w-0 grid-cols-[4.5rem_minmax(0,1fr)] gap-3 rounded-lg bg-card border border-border p-3 shadow-sm transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="aspect-square w-full flex items-center justify-center overflow-hidden rounded-md bg-muted/60 border border-border">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" />
                  ) : (
                    <ImageIcon className="h-10 w-10 text-muted-foreground" />
                  )}
                </div>
                <div className="min-w-0 self-center space-y-1 text-right">
                  <h2 className="break-words [overflow-wrap:anywhere] text-base font-bold leading-7">{p.name}</h2>
                  <div className="min-w-0 break-words [overflow-wrap:anywhere] text-xs leading-5 text-muted-foreground">المرجع: <bdi className="font-mono">{p.reference || "—"}</bdi></div>
                </div>
                <dl className="col-span-2 grid min-w-0 grid-cols-2 gap-3 border-t border-border pt-3">
                  <div className="min-w-0 space-y-1">
                    <dt className="text-xs font-medium text-muted-foreground">سعر البيع</dt>
                    <dd className="break-words [overflow-wrap:anywhere] font-mono text-base font-semibold tabular-nums"><bdi>{Number(p.retail_price).toFixed(2)}</bdi> <span className="font-sans text-xs font-normal text-muted-foreground">دج</span></dd>
                  </div>
                  <div className="min-w-0 space-y-1 border-s border-border ps-3">
                    <dt className="text-xs font-medium text-muted-foreground">المخزون{p.sale_mode === "weight" ? " (kg)" : ""}</dt>
                    <dd className={`break-words [overflow-wrap:anywhere] font-mono text-xl font-bold leading-7 tabular-nums ${stockColor(stock)}`}><bdi>{stock}</bdi></dd>
                  </div>
                </dl>
              </Link>
            );
          })}
        </div>
      </div>
    </PosLayout>
  );
}
