import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, Search, Download, Printer, Plus } from "lucide-react";
import { PosLayout } from "@/components/pos/PosLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [q, setQ] = useState("");
  const [productId, setProductId] = useState<string>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("stock_movements")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(2000)
      .then(({ data }) => setRows(data || []));
    supabase.from("products").select("id,name").eq("user_id", user.id).order("name")
      .then(({ data }) => setProducts(data || []));
  }, [user]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const fromTs = from ? new Date(from).getTime() : null;
    const toTs = to ? new Date(to).getTime() + 24 * 60 * 60 * 1000 : null;
    return rows.filter(r => {
      if (productId !== "all" && r.product_id !== productId) return false;
      if (s && !(r.product_name || "").toLowerCase().includes(s)) return false;
      const ts = new Date(r.created_at).getTime();
      if (fromTs && ts < fromTs) return false;
      if (toTs && ts > toTs) return false;
      return true;
    });
  }, [rows, q, productId, from, to]);

  function exportCsv() {
    const header = ["التاريخ", "المنتج", "النوع", "التغير", "الملاحظات"];
    const lines = filtered.map(m => [
      new Date(m.created_at).toLocaleString("ar"),
      m.product_name || "",
      TYPE_LABEL[m.movement_type] || m.movement_type,
      Number(m.quantity_change),
      (m.notes || "").replace(/\n/g, " "),
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(","));
    const csv = "\ufeff" + [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stock-movements-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportPdf() {
    window.print();
  }

  return (
    <PosLayout title="سجل حركة المخزون" actions={
      <div className="flex items-center gap-1">
        <Link to="/app/stock-adjust" className="rounded-lg p-2 hover:bg-white/10" aria-label="تعديل يدوي"><Plus className="h-6 w-6" /></Link>
        <button onClick={exportCsv} className="rounded-lg p-2 hover:bg-white/10" aria-label="CSV"><Download className="h-6 w-6" /></button>
        <button onClick={exportPdf} className="rounded-lg p-2 hover:bg-white/10" aria-label="PDF"><Printer className="h-6 w-6" /></button>
      </div>
    }>
      <div className="space-y-3">
        <div className="relative print:hidden">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث عن منتج"
            className="pr-10 h-12 bg-card border-primary/40 text-right"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 print:hidden">
          <div className="space-y-1">
            <Label className="text-xs text-right block">المنتج</Label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger className="bg-card border-primary/40 h-10 text-right" dir="rtl">
                <SelectValue placeholder="الكل" />
              </SelectTrigger>
              <SelectContent dir="rtl">
                <SelectItem value="all">[الكل]</SelectItem>
                {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-right block">من تاريخ</Label>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-10 bg-card border-primary/40" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-right block">إلى تاريخ</Label>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-10 bg-card border-primary/40" />
          </div>
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
                  <div className="text-xs text-muted-foreground flex items-center justify-end gap-2 flex-wrap">
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
            <div className="text-center text-muted-foreground py-12">لا توجد حركات</div>
          )}
        </div>
      </div>
    </PosLayout>
  );
}
