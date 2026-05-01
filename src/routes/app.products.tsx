import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Search, Pencil, Trash2, ImageIcon, Printer } from "lucide-react";
import { PosLayout } from "@/components/pos/PosLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/app/products")({ component: ProductsPage });

type Product = {
  id: string; name: string; reference: string | null; barcode: string | null;
  cost_price: number; retail_price: number; stock_quantity: number; image_url: string | null;
};

function ProductsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Product[]>([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState({ name: "", reference: "", barcode: "", cost_price: "0", retail_price: "0", stock_quantity: "0" });

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("products").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setItems((data as any) || []);
  };
  useEffect(() => { load(); }, [user]);

  const openNew = () => {
    setEditing(null);
    setForm({ name: "", reference: String(items.length + 1), barcode: "", cost_price: "0", retail_price: "0", stock_quantity: "0" });
    setOpen(true);
  };
  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name, reference: p.reference || "", barcode: p.barcode || "",
      cost_price: String(p.cost_price), retail_price: String(p.retail_price), stock_quantity: String(p.stock_quantity)
    });
    setOpen(true);
  };

  const save = async () => {
    if (!user || !form.name.trim()) { toast.error("الاسم مطلوب"); return; }
    const payload = {
      user_id: user.id, name: form.name.trim(), reference: form.reference || null, barcode: form.barcode || null,
      cost_price: Number(form.cost_price) || 0, retail_price: Number(form.retail_price) || 0, stock_quantity: Number(form.stock_quantity) || 0,
    };
    const { error } = editing
      ? await supabase.from("products").update(payload).eq("id", editing.id)
      : await supabase.from("products").insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success("تم الحفظ");
    setOpen(false); load();
  };
  const remove = async (id: string) => {
    if (!confirm("حذف المنتج؟")) return;
    await supabase.from("products").delete().eq("id", id);
    load();
  };

  const filtered = items.filter(p => p.name.toLowerCase().includes(q.toLowerCase()) || (p.barcode || "").includes(q));

  return (
    <PosLayout title="المنتجات" actions={
      <button onClick={openNew} className="rounded-lg p-2 hover:bg-white/10"><Plus className="h-5 w-5" /></button>
    }>
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث بالتسمية أو الباركود" className="pr-10 bg-card" />
        </div>
        <div className="text-sm text-muted-foreground">عدد المنتجات {filtered.length}</div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
            لا توجد منتجات. أضف أول منتج بالضغط على +
          </div>
        ) : filtered.map((p) => (
          <div key={p.id} className="flex items-center gap-3 rounded-xl bg-card border border-border p-3 shadow-sm">
            <div className="h-16 w-16 shrink-0 flex items-center justify-center rounded-lg bg-muted">
              {p.image_url ? <img src={p.image_url} alt={p.name} className="h-full w-full object-cover rounded-lg" /> : <ImageIcon className="h-7 w-7 text-muted-foreground" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate">{p.name}</div>
              <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
                <span>Ref. {p.reference || "-"}</span>
                <span className="font-mono text-foreground">{Number(p.retail_price).toFixed(2)}</span>
              </div>
            </div>
            <div className={`font-mono text-xl font-bold ${p.stock_quantity < 0 ? "text-destructive" : p.stock_quantity === 0 ? "text-muted-foreground" : "text-success"}`}>
              {p.stock_quantity}
            </div>
            <div className="flex flex-col gap-1">
              <button onClick={() => openEdit(p)} className="rounded-md p-1.5 hover:bg-muted"><Pencil className="h-4 w-4" /></button>
              <button onClick={() => remove(p.id)} className="rounded-md p-1.5 hover:bg-destructive/10 text-destructive"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "تعديل المنتج" : "منتج جديد"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>التسمية</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>المرجع</Label><Input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} /></div>
              <div><Label>الباركود</Label><Input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>سعر التكلفة</Label><Input type="number" inputMode="decimal" value={form.cost_price} onChange={(e) => setForm({ ...form, cost_price: e.target.value })} /></div>
              <div><Label>سعر البيع</Label><Input type="number" inputMode="decimal" value={form.retail_price} onChange={(e) => setForm({ ...form, retail_price: e.target.value })} /></div>
            </div>
            <div><Label>الكمية في المخزون</Label><Input type="number" inputMode="decimal" value={form.stock_quantity} onChange={(e) => setForm({ ...form, stock_quantity: e.target.value })} /></div>
          </div>
          <DialogFooter><Button onClick={save} className="w-full">حفظ</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </PosLayout>
  );
}
