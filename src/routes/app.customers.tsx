import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Search, Trash2, Phone, Pencil } from "lucide-react";
import { PosLayout } from "@/components/pos/PosLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/app/customers")({ component: CustomersPage });

function CustomersPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState({ name: "", phone: "", address: "", initial_debt: "0" });

  const load = () => {
    if (!user) return;
    supabase.from("customers").select("*").eq("user_id", user.id).order("name").then(({ data }) => setItems(data || []));
  };
  useEffect(load, [user]);

  const openNew = () => { setEditing(null); setForm({ name: "", phone: "", address: "", initial_debt: "0" }); setOpen(true); };
  const openEdit = (c: any) => { setEditing(c); setForm({ name: c.name, phone: c.phone || "", address: c.address || "", initial_debt: String(c.initial_debt || 0) }); setOpen(true); };

  const save = async () => {
    if (!user || !form.name.trim()) return toast.error("الاسم مطلوب");
    const payload = {
      user_id: user.id, name: form.name.trim(), phone: form.phone || null, address: form.address || null,
      initial_debt: Number(form.initial_debt) || 0, balance: Number(form.initial_debt) || 0,
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
          <div key={c.id} className="flex items-center gap-3 rounded-xl bg-card border border-border p-3 shadow-sm">
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
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader><DialogTitle>{editing ? "تعديل زبون" : "زبون جديد"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>الاسم</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>الهاتف</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div><Label>العنوان</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div><Label>الدين الأولي</Label><Input type="number" value={form.initial_debt} onChange={(e) => setForm({ ...form, initial_debt: e.target.value })} /></div>
          </div>
          <DialogFooter><Button onClick={save} className="w-full">حفظ</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </PosLayout>
  );
}
