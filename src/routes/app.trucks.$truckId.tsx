import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, ArrowRight, Trash2, Check, Clock, X as XIcon } from "lucide-react";
import { PosLayout } from "@/components/pos/PosLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/app/trucks/$truckId")({ component: TruckDetailPage });

function TruckDetailPage() {
  const { truckId } = Route.useParams();
  const { user } = useAuth();
  const [truck, setTruck] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ customer_name: "", product_name: "", quantity: 1, unit_price: 0, paid: 0, notes: "" });

  const load = async () => {
    const [{ data: t }, { data: d }] = await Promise.all([
      supabase.from("trucks").select("*").eq("id", truckId).single(),
      supabase.from("truck_distributions").select("*").eq("truck_id", truckId).order("created_at", { ascending: false }),
    ]);
    setTruck(t); setItems(d || []);
  };
  useEffect(() => { load(); }, [truckId]);

  const save = async () => {
    if (!form.product_name.trim()) return toast.error("اسم المنتج مطلوب");
    const total = Number(form.quantity) * Number(form.unit_price);
    const { error } = await supabase.from("truck_distributions").insert({
      truck_id: truckId,
      owner_id: user!.id,
      customer_name: form.customer_name || null,
      product_name: form.product_name,
      quantity: form.quantity,
      unit_price: form.unit_price,
      total,
      paid: form.paid,
      notes: form.notes || null,
      status: "pending"
    });
    if (error) return toast.error(error.message);
    toast.success("تمت الإضافة");
    setOpen(false);
    setForm({ customer_name: "", product_name: "", quantity: 1, unit_price: 0, paid: 0, notes: "" });
    load();
  };

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("truck_distributions").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };
  const remove = async (id: string) => {
    if (!confirm("حذف؟")) return;
    await supabase.from("truck_distributions").delete().eq("id", id);
    load();
  };

  const totals = items.reduce((acc, i) => ({
    total: acc.total + Number(i.total || 0),
    paid: acc.paid + Number(i.paid || 0),
    pending: acc.pending + (i.status === "pending" ? 1 : 0),
    delivered: acc.delivered + (i.status === "delivered" ? 1 : 0),
  }), { total: 0, paid: 0, pending: 0, delivered: 0 });

  return (
    <PosLayout title={truck?.name || "تفاصيل الشاحنة"} actions={
      <button onClick={() => setOpen(true)} className="rounded-lg p-2 hover:bg-white/10" aria-label="add">
        <Plus className="h-6 w-6" />
      </button>
    }>
      <div className="mb-3">
        <Button asChild variant="ghost" size="sm" className="gap-1">
          <Link to="/app/trucks"><ArrowRight className="h-4 w-4" /> رجوع للشاحنات</Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="rounded-xl bg-card border border-border p-3 text-center">
          <div className="text-xs text-muted-foreground">المجموع</div>
          <div className="font-mono text-lg font-bold text-primary">{totals.total.toFixed(2)}</div>
        </div>
        <div className="rounded-xl bg-card border border-border p-3 text-center">
          <div className="text-xs text-muted-foreground">المدفوع</div>
          <div className="font-mono text-lg font-bold text-emerald-600">{totals.paid.toFixed(2)}</div>
        </div>
        <div className="rounded-xl bg-card border border-border p-3 text-center">
          <div className="text-xs text-muted-foreground">قيد الانتظار</div>
          <div className="font-mono text-lg font-bold text-amber-600">{totals.pending}</div>
        </div>
        <div className="rounded-xl bg-card border border-border p-3 text-center">
          <div className="text-xs text-muted-foreground">مُسلّم</div>
          <div className="font-mono text-lg font-bold text-emerald-600">{totals.delivered}</div>
        </div>
      </div>

      <div className="space-y-2">
        {items.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            لا توجد توزيعات بعد
          </div>
        )}
        {items.map((i) => (
          <div key={i.id} className="rounded-xl border border-border bg-card p-3 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{i.product_name}</div>
                {i.customer_name && <div className="text-xs text-muted-foreground">الزبون: {i.customer_name}</div>}
                <div className="mt-1 text-xs text-muted-foreground">
                  {i.quantity} × {Number(i.unit_price).toFixed(2)} = <span className="font-bold text-primary">{Number(i.total).toFixed(2)}</span>
                </div>
                {i.notes && <div className="mt-1 text-xs text-muted-foreground">{i.notes}</div>}
              </div>
              {i.status === "delivered" ? (
                <Badge className="bg-emerald-500 gap-1"><Check className="h-3 w-3" /> مُسلّم</Badge>
              ) : i.status === "cancelled" ? (
                <Badge variant="destructive" className="gap-1"><XIcon className="h-3 w-3" /> ملغى</Badge>
              ) : (
                <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> قيد الانتظار</Badge>
              )}
            </div>
            <div className="mt-2 flex gap-2">
              {i.status !== "delivered" && (
                <Button size="sm" onClick={() => setStatus(i.id, "delivered")} className="flex-1 bg-emerald-600 hover:bg-emerald-700 gap-1">
                  <Check className="h-3 w-3" /> تأكيد التسليم
                </Button>
              )}
              {i.status === "pending" && (
                <Button size="sm" variant="outline" onClick={() => setStatus(i.id, "cancelled")} className="gap-1">
                  <XIcon className="h-3 w-3" /> إلغاء
                </Button>
              )}
              <Button size="sm" variant="destructive" onClick={() => remove(i.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader><DialogTitle>توزيع جديد</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>اسم الزبون</Label><Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} /></div>
            <div><Label>المنتج *</Label><Input value={form.product_name} onChange={(e) => setForm({ ...form, product_name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>الكمية</Label><Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: parseFloat(e.target.value) || 0 })} /></div>
              <div><Label>السعر</Label><Input type="number" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: parseFloat(e.target.value) || 0 })} /></div>
            </div>
            <div><Label>المدفوع</Label><Input type="number" value={form.paid} onChange={(e) => setForm({ ...form, paid: parseFloat(e.target.value) || 0 })} /></div>
            <div><Label>ملاحظات</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <div className="rounded-lg bg-muted p-3 text-center">
              <div className="text-xs text-muted-foreground">المجموع</div>
              <div className="font-mono text-xl font-bold text-primary">
                {(form.quantity * form.unit_price).toFixed(2)}
              </div>
            </div>
            <Button onClick={save} className="w-full bg-gradient-primary text-primary-foreground">حفظ</Button>
          </div>
        </DialogContent>
      </Dialog>
    </PosLayout>
  );
}
