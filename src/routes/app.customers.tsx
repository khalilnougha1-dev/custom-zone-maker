import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Search, Trash2, Phone, Pencil, ShoppingCart, Receipt, Wallet } from "lucide-react";
import { PosLayout } from "@/components/pos/PosLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/app/customers")({ component: CustomersPage });

function CustomersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [salesOpen, setSalesOpen] = useState(false);
  const [salesCustomer, setSalesCustomer] = useState<any>(null);
  const [form, setForm] = useState({ name: "", phone: "", address: "", initial_debt: "0", notes: "", is_inactive: false });

  const load = () => {
    if (!user) return;
    supabase.from("customers").select("*").eq("user_id", user.id).order("name").then(({ data }) => setItems(data || []));
  };
  useEffect(load, [user]);

  const openNew = () => { setEditing(null); setForm({ name: "", phone: "", address: "", initial_debt: "0", notes: "", is_inactive: false }); setOpen(true); };
  const openEdit = (c: any) => { setEditing(c); setForm({ name: c.name, phone: c.phone || "", address: c.address || "", initial_debt: String(c.initial_debt || 0), notes: c.notes || "", is_inactive: !!c.is_inactive }); setOpen(true); };

  const save = async () => {
    if (!user || !form.name.trim()) return toast.error("الاسم مطلوب");
    const payload = {
      user_id: user.id, name: form.name.trim(), phone: form.phone || null, address: form.address || null,
      initial_debt: Number(form.initial_debt) || 0, balance: Number(form.initial_debt) || 0,
      notes: form.notes.trim() || null,
      is_inactive: form.is_inactive,
    };
    const { error } = editing ? await supabase.from("customers").update(payload).eq("id", editing.id) : await supabase.from("customers").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("تم الحفظ"); setOpen(false); load();
  };
  const remove = async (id: string) => { if (!confirm("حذف؟")) return; await supabase.from("customers").delete().eq("id", id); load(); };

  const filtered = items.filter(c => c.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <PosLayout title="الزبائن" actions={
      <button onClick={openNew} className="rounded-lg p-2 hover:bg-white/10"><Plus className="h-5 w-5" /></button>
    }>
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث" className="pr-10 bg-card" />
        </div>
        <div className="text-sm text-muted-foreground">عدد الزبائن {filtered.length}</div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">لا يوجد زبائن</div>
        ) : filtered.map(c => (
          <div key={c.id} className={`rounded-xl bg-card border border-border p-3 shadow-sm ${c.is_inactive ? "opacity-60" : ""}`}>
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0 text-right">
                <div className="font-semibold">{c.name}</div>
                {c.phone && <div className="text-xs text-muted-foreground flex items-center gap-1 justify-end mt-1"><span>{c.phone}</span><Phone className="h-3 w-3" /></div>}
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">الرصيد</div>
                <div className={`font-mono font-bold ${Number(c.balance) > 0 ? "text-destructive" : "text-success"}`}>{Number(c.balance).toFixed(2)}</div>
              </div>
              <div className="flex flex-col gap-1">
                <button onClick={() => openEdit(c)} className="rounded-md p-1.5 hover:bg-muted"><Pencil className="h-4 w-4" /></button>
                <button onClick={() => remove(c.id)} className="rounded-md p-1.5 hover:bg-destructive/10 text-destructive"><Trash2 className="h-4 w-4" /></button>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-border flex gap-2">
              <Button onClick={() => { setSalesCustomer(c); setSalesOpen(true); }} size="sm" className="flex-1 bg-gradient-primary text-primary-foreground gap-1 rounded-full">
                <Receipt className="h-4 w-4" /> تسيير المبيعات
              </Button>
              <Button onClick={() => navigate({ to: "/app/pos", search: { customerId: c.id } as any })} size="sm" variant="outline" className="flex-1 gap-1 rounded-full">
                <ShoppingCart className="h-4 w-4" /> بيع جديد
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "تعديل زبون" : "زبون جديد"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border border-border bg-muted/40 px-3 py-2">
              <Switch checked={form.is_inactive} onCheckedChange={(v) => setForm({ ...form, is_inactive: v })} />
              <Label className="cursor-pointer">زبون غير نشيط</Label>
            </div>
            <div><Label>الاسم</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>الهاتف</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><Label>العنوان</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div><Label>الدين الأولي</Label><Input type="number" value={form.initial_debt} onChange={(e) => setForm({ ...form, initial_debt: e.target.value })} /></div>
            <div><Label>الملاحظة</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} placeholder="ملاحظات إضافية..." /></div>
          </div>
          <DialogFooter><Button onClick={save} className="w-full">حفظ</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {salesOpen && salesCustomer && (
        <CustomerSalesDialog
          customer={salesCustomer}
          onClose={() => setSalesOpen(false)}
          onChanged={load}
        />
      )}
    </PosLayout>
  );
}

function CustomerSalesDialog({ customer, onClose, onChanged }: { customer: any; onClose: () => void; onChanged: () => void }) {
  const navigate = useNavigate();
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [payOpen, setPayOpen] = useState(false);
  const [payAmount, setPayAmount] = useState("");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("sales").select("*").eq("customer_id", customer.id).order("created_at", { ascending: false });
    setSales(data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [customer.id]);

  const totalSales = sales.reduce((s, x) => s + Number(x.total || 0), 0);
  const totalPaid = sales.reduce((s, x) => s + Number(x.paid || 0), 0);
  const totalDebt = totalSales - totalPaid + Number(customer.initial_debt || 0);

  const recordPayment = async () => {
    const amt = Number(payAmount);
    if (!amt || amt <= 0) return toast.error("أدخل مبلغًا صحيحًا");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    // Decrease balance + log cash movement
    const { error: e1 } = await supabase.from("customers").update({ balance: Number(customer.balance || 0) - amt }).eq("id", customer.id);
    if (e1) return toast.error(e1.message);
    await supabase.from("cash_movements").insert({
      user_id: user.id, type: "in", amount: amt,
      notes: `تسديد دين زبون: ${customer.name}`, reference_id: customer.id,
    });
    toast.success("تم تسجيل الدفعة");
    setPayAmount(""); setPayOpen(false); onChanged(); onClose();
  };

  const removeSale = async (id: string) => {
    if (!confirm("حذف الفاتورة؟")) return;
    const { error } = await supabase.from("sales").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("تم الحذف"); load(); onChanged();
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent dir="rtl" className="max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-right">تسيير مبيعات — {customer.name}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-lg bg-muted p-2">
            <div className="text-muted-foreground">المبيعات</div>
            <div className="font-mono font-bold">{totalSales.toFixed(2)}</div>
          </div>
          <div className="rounded-lg bg-muted p-2">
            <div className="text-muted-foreground">المدفوع</div>
            <div className="font-mono font-bold text-success">{totalPaid.toFixed(2)}</div>
          </div>
          <div className="rounded-lg bg-muted p-2">
            <div className="text-muted-foreground">الدين</div>
            <div className={`font-mono font-bold ${totalDebt > 0 ? "text-destructive" : "text-success"}`}>{totalDebt.toFixed(2)}</div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={() => setPayOpen(true)} className="flex-1 bg-gradient-primary text-primary-foreground gap-1 rounded-full">
            <Wallet className="h-4 w-4" /> تسديد دفعة
          </Button>
          <Button onClick={() => { onClose(); navigate({ to: "/app/pos", search: { customerId: customer.id } as any }); }} variant="outline" className="flex-1 gap-1 rounded-full">
            <ShoppingCart className="h-4 w-4" /> بيع جديد
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 -mx-1 px-1">
          {loading ? (
            <div className="text-center text-sm text-muted-foreground py-6">جاري التحميل...</div>
          ) : sales.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">لا توجد فواتير</div>
          ) : sales.map(s => (
            <div key={s.id} className="rounded-lg border border-border p-2.5 bg-card">
              <div className="flex items-center justify-between gap-2">
                <button onClick={() => removeSale(s.id)} className="text-destructive p-1 hover:bg-destructive/10 rounded">
                  <Trash2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => { onClose(); navigate({ to: "/app/sales/$saleId", params: { saleId: s.id } }); }}
                  className="flex-1 text-right"
                >
                  <div className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString("ar")}</div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs">{s.invoice_number || s.id.slice(0, 8)}</span>
                    <span className="font-mono font-bold">{Number(s.total).toFixed(2)}</span>
                  </div>
                  {Number(s.paid) < Number(s.total) && (
                    <div className="text-xs text-destructive mt-0.5">باقي: {(Number(s.total) - Number(s.paid)).toFixed(2)}</div>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        {payOpen && (
          <div className="rounded-lg border border-border bg-muted/40 p-3 space-y-2">
            <Label>مبلغ الدفعة</Label>
            <Input type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} autoFocus />
            <div className="flex gap-2">
              <Button onClick={() => setPayOpen(false)} variant="outline" className="flex-1">إلغاء</Button>
              <Button onClick={recordPayment} className="flex-1 bg-gradient-primary text-primary-foreground">تأكيد</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
