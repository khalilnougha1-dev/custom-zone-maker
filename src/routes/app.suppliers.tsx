import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Search, Trash2, Pencil, ArrowRight, Save, Phone, Smartphone, Mail } from "lucide-react";
import { PosLayout } from "@/components/pos/PosLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/app/suppliers")({ component: SuppliersPage });

type FormState = {
  name: string;
  address: string;
  phone: string;
  mobile: string;
  email: string;
  initial_debt: string;
  notes: string;
  is_inactive: boolean;
};

const empty: FormState = { name: "", address: "", phone: "", mobile: "", email: "", initial_debt: "0", notes: "", is_inactive: false };

function SuppliersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<FormState>(empty);

  const load = () => {
    if (!user) return;
    supabase.from("suppliers").select("*").eq("user_id", user.id).order("name").then(({ data }) => setItems(data || []));
  };
  useEffect(load, [user]);

  const openNew = () => { setEditing(null); setForm(empty); setShowForm(true); };
  const openEdit = (s: any) => {
    setEditing(s);
    // Phone field may contain "phone | mobile" — split if so
    const [p1 = "", p2 = ""] = (s.phone || "").split("|").map((x: string) => x.trim());
    setForm({
      name: s.name || "",
      address: s.address || "",
      phone: p1,
      mobile: p2,
      email: s.email || "",
      initial_debt: String(s.initial_debt || 0),
      notes: s.notes || "",
      is_inactive: !!s.is_inactive,
    });
    setShowForm(true);
  };

  const save = async () => {
    if (!user || !form.name.trim()) return toast.error("الاسم مطلوب");
    const phoneCombined = [form.phone.trim(), form.mobile.trim()].filter(Boolean).join(" | ") || null;
    const payload: any = {
      user_id: user.id,
      name: form.name.trim(),
      address: form.address.trim() || null,
      phone: phoneCombined,
      email: form.email.trim() || null,
      initial_debt: Number(form.initial_debt) || 0,
      notes: form.notes.trim() || null,
      is_inactive: form.is_inactive,
    };
    if (!editing) payload.balance = Number(form.initial_debt) || 0;
    const { error } = editing
      ? await supabase.from("suppliers").update(payload).eq("id", editing.id)
      : await supabase.from("suppliers").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("تم الحفظ");
    setShowForm(false);
    load();
  };

  const remove = async (id: string) => { if (!confirm("حذف؟")) return; await supabase.from("suppliers").delete().eq("id", id); load(); };
  const filtered = items.filter(c => c.name.toLowerCase().includes(q.toLowerCase()));

  // ============ FORM SCREEN ============
  if (showForm) {
    return (
      <div className="min-h-screen bg-muted/30 flex flex-col" dir="rtl">
        <header className="sticky top-0 z-40 bg-gradient-primary text-primary-foreground shadow-md">
          <div className="flex h-14 items-center justify-between px-4">
            <button onClick={() => setShowForm(false)} className="rounded-lg p-2 hover:bg-white/10" aria-label="رجوع">
              <ArrowRight className="h-6 w-6" />
            </button>
            <h1 className="text-lg font-bold">{editing ? "تعديل ممون" : "إضافة ممون"}</h1>
            <div className="w-10" />
          </div>
        </header>

        <main className="flex-1 mx-auto w-full max-w-2xl p-4 pb-32 space-y-4">
          {/* Inactive switch */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <label className="text-base font-medium">ممون غير نشيط</label>
            <Switch checked={form.is_inactive} onCheckedChange={(v) => setForm({ ...form, is_inactive: v })} />
          </div>

          {/* Name */}
          <div className="flex items-center gap-3">
            <span className="w-24 text-right text-base font-medium text-foreground">الإسم الكامل</span>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="flex-1 h-12 bg-card border-primary/40 text-right" />
          </div>

          {/* Address */}
          <div className="flex items-center gap-3">
            <span className="w-24 text-right text-base font-medium text-foreground">العنوان</span>
            <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="flex-1 h-12 bg-card border-primary/40 text-right" />
          </div>

          {/* Phone */}
          <div className="flex items-center gap-3">
            <span className="w-24 flex justify-end text-foreground/70"><Phone className="h-6 w-6" /></span>
            <Input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="flex-1 h-12 bg-card border-primary/40 text-right" />
          </div>

          {/* Mobile */}
          <div className="flex items-center gap-3">
            <span className="w-24 flex justify-end text-foreground/70"><Smartphone className="h-6 w-6" /></span>
            <Input type="tel" value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} className="flex-1 h-12 bg-card border-primary/40 text-right" />
          </div>

          {/* Email */}
          <div className="flex items-center gap-3">
            <span className="w-24 flex justify-end text-foreground/70"><Mail className="h-6 w-6" /></span>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="flex-1 h-12 bg-card border-primary/40 text-right" />
          </div>

          {/* Initial debt */}
          <div className="flex items-center gap-3">
            <span className="w-24 text-right text-base font-medium text-foreground">الدين السابق</span>
            <Input type="number" value={form.initial_debt} onChange={(e) => setForm({ ...form, initial_debt: e.target.value })} className="flex-1 h-12 bg-card border-primary/40 text-right" />
          </div>

          {/* Notes */}
          <div className="space-y-2 pt-2">
            <div className="text-right text-base font-medium text-foreground/80">ملاحظة</div>
            <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="bg-card border-primary/40 text-right min-h-[80px]" />
          </div>
        </main>

        {/* Save button */}
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-card/95 backdrop-blur p-3">
          <Button onClick={save} className="w-full h-12 bg-gradient-primary text-primary-foreground font-bold text-base rounded-full shadow-lg">
            <Save className="h-5 w-5 ml-2" />
            حفظ
          </Button>
        </div>
      </div>
    );
  }

  // ============ LIST SCREEN ============
  return (
    <PosLayout title="الممونين" actions={
      <button onClick={openNew} className="rounded-lg p-2 hover:bg-white/10"><Plus className="h-5 w-5" /></button>
    }>
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث" className="pr-10 bg-card" />
        </div>
        <div className="text-sm text-muted-foreground">عدد الممونين {filtered.length}</div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">لا يوجد ممونين</div>
        ) : filtered.map(c => (
          <div key={c.id} className="flex items-center gap-3 rounded-xl bg-card border border-border p-3 shadow-sm">
            <div className="flex-1 min-w-0 text-right">
              <div className="font-semibold flex items-center gap-2 justify-end">
                {c.is_inactive && <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">غير نشيط</span>}
                {c.name}
              </div>
              {c.phone && <div className="text-xs text-muted-foreground mt-1">{c.phone}</div>}
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
    </PosLayout>
  );
}
