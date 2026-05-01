import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Trash2, Wallet } from "lucide-react";
import { PosLayout } from "@/components/pos/PosLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/app/expenses")({ component: ExpensesPage });

function ExpensesPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ description: "", amount: "", category: "" });

  const load = () => {
    if (!user) return;
    supabase.from("expenses").select("*").eq("user_id", user.id).order("created_at", { ascending: false })
      .then(({ data }) => setItems(data || []));
  };
  useEffect(load, [user]);

  const save = async () => {
    if (!user || !form.description.trim()) return toast.error("الوصف مطلوب");
    const { error } = await supabase.from("expenses").insert({
      user_id: user.id, description: form.description.trim(), amount: Number(form.amount) || 0, category: form.category || null
    });
    if (error) return toast.error(error.message);
    toast.success("تم"); setOpen(false); setForm({ description: "", amount: "", category: "" }); load();
  };
  const remove = async (id: string) => { if (!confirm("حذف؟")) return; await supabase.from("expenses").delete().eq("id", id); load(); };

  const total = items.reduce((s, x) => s + Number(x.amount || 0), 0);

  return (
    <PosLayout title="المصاريف" actions={
      <button onClick={() => setOpen(true)} className="rounded-lg p-2 hover:bg-white/10"><Plus className="h-5 w-5" /></button>
    }>
      <div className="rounded-2xl bg-gradient-to-br from-red-500 to-pink-600 p-4 text-white shadow-card mb-4">
        <div className="text-sm opacity-90">إجمالي المصاريف</div>
        <div className="font-mono text-3xl font-bold mt-1">{total.toFixed(2)}</div>
      </div>
      <div className="space-y-2">
        {items.map(x => (
          <div key={x.id} className="flex items-center gap-3 rounded-xl bg-card border border-border p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10 text-red-600"><Wallet className="h-5 w-5" /></div>
            <div className="flex-1 text-right">
              <div className="font-semibold text-sm">{x.description}</div>
              {x.category && <div className="text-xs text-muted-foreground mt-1">{x.category}</div>}
            </div>
            <div className="font-mono text-lg font-bold text-red-600">{Number(x.amount).toFixed(2)}</div>
            <button onClick={() => remove(x.id)} className="text-destructive p-1"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
        {items.length === 0 && <div className="text-center text-muted-foreground py-10">لا توجد مصاريف</div>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader><DialogTitle>مصروف جديد</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>الوصف</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div><Label>المبلغ</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
            <div><Label>الفئة</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="مثال: كراء، فواتير..." /></div>
          </div>
          <DialogFooter><Button onClick={save} className="w-full">حفظ</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </PosLayout>
  );
}
