import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Truck as TruckIcon, Edit, Trash2, ArrowLeft, Phone, User, Package } from "lucide-react";
import { PosLayout } from "@/components/pos/PosLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/app/trucks/")({ component: TrucksPage });

function TrucksPage() {
  const { user } = useAuth();
  const [trucks, setTrucks] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<any>(null);
  const [form, setForm] = useState({ name: "", plate_number: "", driver_name: "", driver_phone: "", driver_email: "", driver_user_id: "" });
  const [linking, setLinking] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("trucks").select("*").eq("owner_id", user.id).order("created_at", { ascending: false });
    setTrucks(data || []);
  };
  useEffect(() => { load(); }, [user]);

  const openNew = () => { setEdit(null); setForm({ name: "", plate_number: "", driver_name: "", driver_phone: "", driver_email: "", driver_user_id: "" }); setOpen(true); };
  const openEdit = (t: any) => { setEdit(t); setForm({ name: t.name, plate_number: t.plate_number || "", driver_name: t.driver_name || "", driver_phone: t.driver_phone || "", driver_email: "", driver_user_id: t.driver_user_id || "" }); setOpen(true); };

  const linkByEmail = async () => {
    const email = form.driver_email.trim();
    if (!email) return toast.error("أدخل بريد السائق");
    setLinking(true);
    const { data, error } = await supabase.rpc("find_user_id_by_email", { _email: email });
    setLinking(false);
    if (error) return toast.error(error.message);
    if (!data) return toast.error("لم يتم العثور على حساب بهذا البريد. اطلب من السائق التسجيل أولاً عبر Google.");
    setForm((f) => ({ ...f, driver_user_id: data as string }));
    toast.success("تم ربط الحساب بنجاح");
  };

  const save = async () => {
    if (!form.name.trim()) return toast.error("اسم الشاحنة مطلوب");
    const payload: any = {
      name: form.name,
      plate_number: form.plate_number || null,
      driver_name: form.driver_name || null,
      driver_phone: form.driver_phone || null,
      driver_user_id: form.driver_user_id.trim() || null,
      owner_id: user!.id
    };
    const { error } = edit
      ? await supabase.from("trucks").update(payload).eq("id", edit.id)
      : await supabase.from("trucks").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("تم الحفظ");
    setOpen(false); load();
  };

  const remove = async (id: string) => {
    if (!confirm("حذف الشاحنة؟")) return;
    const { error } = await supabase.from("trucks").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("تم الحذف"); load();
  };

  return (
    <PosLayout title="الشاحنات والتوزيع" actions={
      <button onClick={openNew} className="rounded-lg p-2 hover:bg-white/10" aria-label="add">
        <Plus className="h-6 w-6" />
      </button>
    }>
      <div className="mb-3">
        <Button asChild className="w-full bg-gradient-primary text-primary-foreground gap-2">
          <Link to="/app/trucks-inventory"><Package className="h-4 w-4" /> مخزون الشاحنات وسجل التغييرات</Link>
        </Button>
      </div>
      <div className="space-y-3">
        {trucks.length === 0 && (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <TruckIcon className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">لا توجد شاحنات بعد</p>
            <Button onClick={openNew} className="mt-4 bg-gradient-primary text-primary-foreground gap-2">
              <Plus className="h-4 w-4" /> إضافة شاحنة
            </Button>
          </div>
        )}
        {trucks.map((t) => (
          <div key={t.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-amber-500 to-orange-600 text-white shrink-0">
                  <TruckIcon className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold">{t.name}</div>
                  {t.plate_number && <div className="text-xs text-muted-foreground" dir="ltr">{t.plate_number}</div>}
                  {t.driver_name && (
                    <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                      <User className="h-3 w-3" /> {t.driver_name}
                    </div>
                  )}
                  {t.driver_phone && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground" dir="ltr">
                      <Phone className="h-3 w-3" /> {t.driver_phone}
                    </div>
                  )}
                </div>
              </div>
              {t.is_active ? <Badge className="bg-emerald-500">نشطة</Badge> : <Badge variant="secondary">متوقفة</Badge>}
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <Button asChild size="sm" className="bg-gradient-primary text-primary-foreground gap-1">
                <Link to="/app/trucks/$truckId" params={{ truckId: t.id }}>
                  التوزيعات <ArrowLeft className="h-3 w-3" />
                </Link>
              </Button>
              <Button size="sm" variant="outline" onClick={() => openEdit(t)} className="gap-1">
                <Edit className="h-3 w-3" /> تعديل
              </Button>
              <Button size="sm" variant="destructive" onClick={() => remove(t.id)} className="gap-1">
                <Trash2 className="h-3 w-3" /> حذف
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader><DialogTitle>{edit ? "تعديل شاحنة" : "شاحنة جديدة"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>اسم الشاحنة *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>رقم اللوحة</Label><Input value={form.plate_number} onChange={(e) => setForm({ ...form, plate_number: e.target.value })} dir="ltr" /></div>
            <div><Label>اسم السائق</Label><Input value={form.driver_name} onChange={(e) => setForm({ ...form, driver_name: e.target.value })} /></div>
            <div><Label>هاتف السائق</Label><Input value={form.driver_phone} onChange={(e) => setForm({ ...form, driver_phone: e.target.value })} dir="ltr" /></div>
            <div>
              <Label>بريد حساب السائق (Google)</Label>
              <div className="flex gap-2">
                <Input
                  value={form.driver_email}
                  onChange={(e) => setForm({ ...form, driver_email: e.target.value })}
                  dir="ltr"
                  placeholder="driver@gmail.com"
                  type="email"
                />
                <Button type="button" onClick={linkByEmail} disabled={linking} variant="outline">
                  {linking ? "..." : "ربط"}
                </Button>
              </div>
              {form.driver_user_id && (
                <p className="mt-1 text-xs text-emerald-600">✓ تم الربط — معرّف: <span dir="ltr">{form.driver_user_id.slice(0, 8)}…</span></p>
              )}
              <p className="mt-1 text-xs text-muted-foreground">يجب أن يسجّل السائق دخوله مرّة واحدة عبر Google قبل الربط.</p>
            </div>
            <Button onClick={save} className="w-full bg-gradient-primary text-primary-foreground">حفظ</Button>
          </div>
        </DialogContent>
      </Dialog>
    </PosLayout>
  );
}
