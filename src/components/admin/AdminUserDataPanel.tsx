import { useEffect, useMemo, useState } from "react";
import { Truck as TruckIcon, Package, Settings as SettingsIcon, Plus, Edit, Trash2, Save, Search, Boxes, ClipboardList, Check, Clock, X as XIcon, Menu as MenuIcon } from "lucide-react";
import { AdminUserAppMenu } from "./AdminUserAppMenu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props { users: any[] }

export function AdminUserDataPanel({ users }: Props) {
  const [userId, setUserId] = useState<string>("");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users.slice(0, 50);
    return users.filter((u) =>
      `${u.full_name || ""} ${u.business_name || ""} ${u.phone || ""}`.toLowerCase().includes(q)
    ).slice(0, 50);
  }, [users, search]);

  const selectedUser = users.find((u) => u.id === userId);

  return (
    <div className="space-y-3" dir="rtl">
      <div className="rounded-xl border border-border bg-card p-3">
        <Label className="mb-2 block text-xs">اختر مستخدماً للتحكم في بياناته</Label>
        <div className="relative mb-2">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث بالاسم أو الهاتف..." className="pr-9" />
        </div>
        <select
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className="w-full rounded-md border border-input bg-background p-2 text-sm"
        >
          <option value="">-- اختر مستخدم --</option>
          {filtered.map((u) => (
            <option key={u.id} value={u.id}>
              {u.full_name || "بدون اسم"} {u.business_name ? `— ${u.business_name}` : ""} {u.phone ? `(${u.phone})` : ""}
            </option>
          ))}
        </select>
      </div>

      {!userId ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          اختر مستخدماً للبدء
        </div>
      ) : (
        <Tabs defaultValue="trucks" className="w-full" dir="rtl">
          <TabsList className="grid w-full grid-cols-5 mb-3">
            <TabsTrigger value="trucks" className="gap-1 text-xs"><TruckIcon className="h-3 w-3" /> الشاحنات</TabsTrigger>
            <TabsTrigger value="distributions" className="gap-1 text-xs"><ClipboardList className="h-3 w-3" /> التوزيعات</TabsTrigger>
            <TabsTrigger value="warehouse" className="gap-1 text-xs"><Boxes className="h-3 w-3" /> المخزون</TabsTrigger>
            <TabsTrigger value="products" className="gap-1 text-xs"><Package className="h-3 w-3" /> الأسعار</TabsTrigger>
            <TabsTrigger value="settings" className="gap-1 text-xs"><SettingsIcon className="h-3 w-3" /> الوصل</TabsTrigger>
          </TabsList>
          <TabsContent value="trucks"><AdminTrucks userId={userId} /></TabsContent>
          <TabsContent value="distributions"><AdminDistributions userId={userId} /></TabsContent>
          <TabsContent value="warehouse"><AdminWarehouse userId={userId} /></TabsContent>
          <TabsContent value="products"><AdminProducts userId={userId} /></TabsContent>
          <TabsContent value="settings"><AdminSettings userId={userId} userName={selectedUser?.full_name || ""} /></TabsContent>
        </Tabs>
      )}
    </div>
  );
}

/* ---------- Trucks ---------- */
function AdminTrucks({ userId }: { userId: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<any>(null);
  const [form, setForm] = useState({ name: "", plate_number: "", driver_name: "", driver_phone: "", driver_user_id: "", is_active: true });
  const [appMenuTruck, setAppMenuTruck] = useState<any | null>(null);
  const load = async () => {
    const { data } = await supabase.from("trucks").select("*").eq("owner_id", userId).order("created_at", { ascending: false });
    setItems(data || []);
  };
  useEffect(() => { load(); }, [userId]);

  const openNew = () => { setEdit(null); setForm({ name: "", plate_number: "", driver_name: "", driver_phone: "", driver_user_id: "", is_active: true }); setOpen(true); };
  const openEdit = (t: any) => {
    setEdit(t);
    setForm({
      name: t.name, plate_number: t.plate_number || "", driver_name: t.driver_name || "",
      driver_phone: t.driver_phone || "", driver_user_id: t.driver_user_id || "", is_active: !!t.is_active,
    });
    setOpen(true);
  };

  const save = async () => {
    if (!form.name.trim()) return toast.error("اسم الشاحنة مطلوب");
    const payload: any = {
      name: form.name,
      plate_number: form.plate_number || null,
      driver_name: form.driver_name || null,
      driver_phone: form.driver_phone || null,
      driver_user_id: form.driver_user_id.trim() || null,
      is_active: form.is_active,
      owner_id: userId,
    };
    const { error } = edit
      ? await supabase.from("trucks").update(payload).eq("id", edit.id)
      : await supabase.from("trucks").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("تم الحفظ"); setOpen(false); load();
  };

  const remove = async (id: string) => {
    if (!confirm("حذف الشاحنة؟")) return;
    const { error } = await supabase.from("trucks").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("تم الحذف"); load();
  };

  return (
    <div className="space-y-2">
      <Button onClick={openNew} className="w-full bg-gradient-primary text-primary-foreground gap-2">
        <Plus className="h-4 w-4" /> شاحنة جديدة
      </Button>
      {items.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">لا توجد شاحنات</div>
      )}
      {items.map((t) => (
        <div key={t.id} className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="font-bold">{t.name}</div>
              {t.plate_number && <div className="text-xs text-muted-foreground" dir="ltr">{t.plate_number}</div>}
              {t.driver_name && <div className="text-xs text-muted-foreground">{t.driver_name}</div>}
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="default" className="bg-gradient-primary text-primary-foreground gap-1 h-8 px-2" onClick={() => setAppMenuTruck(t)} title="فتح كل أقسام التطبيق لهذا المستخدم">
                <MenuIcon className="h-3.5 w-3.5" />
              </Button>
              <Button size="sm" variant="outline" onClick={() => openEdit(t)}><Edit className="h-3 w-3" /></Button>
              <Button size="sm" variant="destructive" onClick={() => remove(t.id)}><Trash2 className="h-3 w-3" /></Button>
            </div>
          </div>
        </div>
      ))}
      <AdminUserAppMenu
        open={!!appMenuTruck}
        onOpenChange={(v) => !v && setAppMenuTruck(null)}
        userId={userId}
        truckName={appMenuTruck?.name}
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader><DialogTitle>{edit ? "تعديل شاحنة" : "شاحنة جديدة"}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <div><Label>الاسم *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>رقم اللوحة</Label><Input value={form.plate_number} onChange={(e) => setForm({ ...form, plate_number: e.target.value })} dir="ltr" /></div>
            <div><Label>اسم السائق</Label><Input value={form.driver_name} onChange={(e) => setForm({ ...form, driver_name: e.target.value })} /></div>
            <div><Label>هاتف السائق</Label><Input value={form.driver_phone} onChange={(e) => setForm({ ...form, driver_phone: e.target.value })} dir="ltr" /></div>
            <div><Label>معرّف السائق (UUID)</Label><Input value={form.driver_user_id} onChange={(e) => setForm({ ...form, driver_user_id: e.target.value })} dir="ltr" /></div>
            <div className="flex items-center justify-between"><Label>نشطة</Label><Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /></div>
            <Button onClick={save} className="w-full bg-gradient-primary text-primary-foreground">حفظ</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------- Products / Prices ---------- */
function AdminProducts({ userId }: { userId: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [edits, setEdits] = useState<Record<string, { retail_price: string; wholesale_price: string; cost_price: string }>>({});

  const load = async () => {
    const { data } = await supabase.from("products").select("id,name,retail_price,wholesale_price,cost_price,stock_quantity").eq("user_id", userId).order("name").limit(500);
    setItems(data || []);
    setEdits({});
  };
  useEffect(() => { load(); }, [userId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.name.toLowerCase().includes(q));
  }, [items, search]);

  const updateField = (id: string, field: "retail_price" | "wholesale_price" | "cost_price", value: string) => {
    const cur = edits[id] || {
      retail_price: String(items.find((i) => i.id === id)?.retail_price ?? 0),
      wholesale_price: String(items.find((i) => i.id === id)?.wholesale_price ?? 0),
      cost_price: String(items.find((i) => i.id === id)?.cost_price ?? 0),
    };
    setEdits({ ...edits, [id]: { ...cur, [field]: value } });
  };

  const save = async (id: string) => {
    const e = edits[id]; if (!e) return;
    const payload: any = {
      retail_price: parseFloat(e.retail_price) || 0,
      wholesale_price: parseFloat(e.wholesale_price) || 0,
      cost_price: parseFloat(e.cost_price) || 0,
    };
    const { error } = await supabase.from("products").update(payload).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("تم التحديث");
    const { [id]: _, ...rest } = edits; setEdits(rest);
    load();
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث عن منتج..." className="pr-9" />
      </div>
      {filtered.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">لا توجد منتجات</div>
      )}
      {filtered.map((p) => {
        const e = edits[p.id];
        const dirty = !!e;
        const retail = e?.retail_price ?? String(p.retail_price ?? 0);
        const wholesale = e?.wholesale_price ?? String(p.wholesale_price ?? 0);
        const cost = e?.cost_price ?? String(p.cost_price ?? 0);
        return (
          <div key={p.id} className="rounded-xl border border-border bg-card p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="font-semibold text-sm truncate">{p.name}</div>
              <div className="text-xs text-muted-foreground">المخزون: {p.stock_quantity}</div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs">التكلفة</Label>
                <Input type="number" value={cost} onChange={(ev) => updateField(p.id, "cost_price", ev.target.value)} className="h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs">جملة</Label>
                <Input type="number" value={wholesale} onChange={(ev) => updateField(p.id, "wholesale_price", ev.target.value)} className="h-8 text-sm" />
              </div>
              <div>
                <Label className="text-xs">تجزئة</Label>
                <Input type="number" value={retail} onChange={(ev) => updateField(p.id, "retail_price", ev.target.value)} className="h-8 text-sm" />
              </div>
            </div>
            {dirty && (
              <Button size="sm" onClick={() => save(p.id)} className="w-full bg-gradient-primary text-primary-foreground gap-1">
                <Save className="h-3 w-3" /> حفظ التغييرات
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ---------- Settings (receipt) ---------- */
function AdminSettings({ userId, userName }: { userId: string; userName: string }) {
  const [s, setS] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("app_settings").select("*").eq("user_id", userId).maybeSingle();
    setS(data || {
      user_id: userId,
      business_name: userName || "",
      receipt_footer: "شكرا",
      printer_type: "58mm",
      print_language: "ar",
      currency: "DA",
      auto_print: false,
      print_partial_total: true,
      number_products_in_list: false,
      show_product_images: true,
      round_prices: false,
      enable_discount: true,
      enable_multi_price: false,
      print_margin: 0,
    });
    setLoading(false);
  };
  useEffect(() => { load(); }, [userId]);

  const save = async () => {
    if (!s) return;
    const payload = { ...s, user_id: userId, updated_at: new Date().toISOString() };
    const { error } = await supabase.from("app_settings").upsert(payload, { onConflict: "user_id" });
    if (error) return toast.error(error.message);
    toast.success("تم الحفظ");
  };

  if (loading || !s) return <div className="p-6 text-center text-sm text-muted-foreground">جاري التحميل...</div>;

  const set = (k: string, v: any) => setS({ ...s, [k]: v });

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border bg-card p-3 space-y-3">
        <div><Label className="text-xs">اسم النشاط (يظهر بأعلى الوصل)</Label><Input value={s.business_name || ""} onChange={(e) => set("business_name", e.target.value)} /></div>
        <div><Label className="text-xs">تذييل الوصل</Label><Input value={s.receipt_footer || ""} onChange={(e) => set("receipt_footer", e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">عرض الورق</Label>
            <select value={s.printer_type || "58mm"} onChange={(e) => set("printer_type", e.target.value)} className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm">
              <option value="58mm">58mm</option>
              <option value="80mm">80mm</option>
              <option value="A4">A4</option>
            </select>
          </div>
          <div>
            <Label className="text-xs">اللغة</Label>
            <select value={s.print_language || "ar"} onChange={(e) => set("print_language", e.target.value)} className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm">
              <option value="ar">عربية</option>
              <option value="fr">فرنسية</option>
              <option value="en">إنجليزية</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><Label className="text-xs">العملة</Label><Input value={s.currency || ""} onChange={(e) => set("currency", e.target.value)} /></div>
          <div><Label className="text-xs">هامش الطباعة (px)</Label><Input type="number" value={s.print_margin ?? 0} onChange={(e) => set("print_margin", parseInt(e.target.value) || 0)} /></div>
        </div>
        <div className="space-y-2 pt-2 border-t">
          <div className="flex items-center justify-between"><Label className="text-xs">طباعة تلقائية</Label><Switch checked={!!s.auto_print} onCheckedChange={(v) => set("auto_print", v)} /></div>
          <div className="flex items-center justify-between"><Label className="text-xs">إظهار المجموع الجزئي</Label><Switch checked={!!s.print_partial_total} onCheckedChange={(v) => set("print_partial_total", v)} /></div>
          <div className="flex items-center justify-between"><Label className="text-xs">ترقيم المنتجات</Label><Switch checked={!!s.number_products_in_list} onCheckedChange={(v) => set("number_products_in_list", v)} /></div>
          <div className="flex items-center justify-between"><Label className="text-xs">إظهار صور المنتجات</Label><Switch checked={!!s.show_product_images} onCheckedChange={(v) => set("show_product_images", v)} /></div>
          <div className="flex items-center justify-between"><Label className="text-xs">تقريب الأسعار</Label><Switch checked={!!s.round_prices} onCheckedChange={(v) => set("round_prices", v)} /></div>
          <div className="flex items-center justify-between"><Label className="text-xs">تفعيل الخصم</Label><Switch checked={!!s.enable_discount} onCheckedChange={(v) => set("enable_discount", v)} /></div>
          <div className="flex items-center justify-between"><Label className="text-xs">أسعار متعددة</Label><Switch checked={!!s.enable_multi_price} onCheckedChange={(v) => set("enable_multi_price", v)} /></div>
        </div>
        <Button onClick={save} className="w-full bg-gradient-primary text-primary-foreground gap-1">
          <Save className="h-4 w-4" /> حفظ الإعدادات
        </Button>
      </div>
    </div>
  );
}

/* ---------- Distributions per truck (admin) ---------- */
function AdminDistributions({ userId }: { userId: string }) {
  const [trucks, setTrucks] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [truckId, setTruckId] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<any>(null);
  const [form, setForm] = useState({ truck_id: "", customer_name: "", product_name: "", quantity: 1, unit_price: 0, paid: 0, status: "pending", notes: "" });

  const load = async () => {
    const [{ data: t }, { data: d }] = await Promise.all([
      supabase.from("trucks").select("*").eq("owner_id", userId).order("created_at", { ascending: false }),
      supabase.from("truck_distributions").select("*").eq("owner_id", userId).order("created_at", { ascending: false }).limit(500),
    ]);
    setTrucks(t || []); setItems(d || []);
  };
  useEffect(() => { load(); }, [userId]);

  const filtered = useMemo(() => truckId === "all" ? items : items.filter((i) => i.truck_id === truckId), [items, truckId]);
  const truckName = (id: string) => trucks.find((t) => t.id === id)?.name || "—";

  const openNew = () => { setEdit(null); setForm({ truck_id: trucks[0]?.id || "", customer_name: "", product_name: "", quantity: 1, unit_price: 0, paid: 0, status: "pending", notes: "" }); setOpen(true); };
  const openEdit = (i: any) => { setEdit(i); setForm({ truck_id: i.truck_id, customer_name: i.customer_name || "", product_name: i.product_name, quantity: Number(i.quantity), unit_price: Number(i.unit_price), paid: Number(i.paid), status: i.status, notes: i.notes || "" }); setOpen(true); };

  const save = async () => {
    if (!form.truck_id) return toast.error("اختر شاحنة");
    if (!form.product_name.trim()) return toast.error("اسم المنتج مطلوب");
    const total = Number(form.quantity) * Number(form.unit_price);
    const payload: any = {
      truck_id: form.truck_id,
      customer_name: form.customer_name || null,
      product_name: form.product_name,
      quantity: form.quantity,
      unit_price: form.unit_price,
      total,
      paid: form.paid,
      status: form.status,
      notes: form.notes || null,
    };
    const { error } = edit
      ? await supabase.from("truck_distributions").update(payload).eq("id", edit.id)
      : await supabase.from("truck_distributions").insert({ ...payload, owner_id: userId });
    if (error) return toast.error(error.message);
    toast.success("تم الحفظ"); setOpen(false); load();
  };

  const remove = async (id: string) => {
    if (!confirm("حذف؟")) return;
    const { error } = await supabase.from("truck_distributions").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  // group by truck for inline view
  const byTruck = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const t of trucks) map.set(t.id, []);
    for (const i of filtered) {
      const arr = map.get(i.truck_id) || [];
      arr.push(i); map.set(i.truck_id, arr);
    }
    return map;
  }, [filtered, trucks]);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <select value={truckId} onChange={(e) => setTruckId(e.target.value)} className="flex-1 rounded-md border border-input bg-background p-2 text-sm">
          <option value="all">كل الشاحنات</option>
          {trucks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
        <Button onClick={openNew} className="bg-gradient-primary text-primary-foreground gap-1" disabled={trucks.length === 0}>
          <Plus className="h-4 w-4" /> توزيع
        </Button>
      </div>
      {trucks.length === 0 && (
        <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">أضف شاحنة أولاً من تبويب الشاحنات</div>
      )}
      {Array.from(byTruck.entries()).map(([tid, list]) => (
        list.length === 0 ? null : (
          <div key={tid} className="rounded-xl border border-border bg-card p-3">
            <div className="mb-2 flex items-center gap-2 font-bold text-sm">
              <TruckIcon className="h-4 w-4 text-primary" /> {truckName(tid)} <Badge variant="secondary" className="text-xs">{list.length}</Badge>
            </div>
            <div className="space-y-2">
              {list.map((i) => (
                <div key={i.id} className="rounded-lg border border-border p-2 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold">{i.product_name}</div>
                      {i.customer_name && <div className="text-muted-foreground">الزبون: {i.customer_name}</div>}
                      <div className="text-muted-foreground">{i.quantity} × {Number(i.unit_price).toFixed(2)} = <span className="font-bold text-primary">{Number(i.total).toFixed(2)}</span> | مدفوع: {Number(i.paid).toFixed(2)}</div>
                    </div>
                    {i.status === "delivered" ? <Badge className="bg-emerald-500 gap-1"><Check className="h-3 w-3" /> مُسلّم</Badge>
                      : i.status === "cancelled" ? <Badge variant="destructive" className="gap-1"><XIcon className="h-3 w-3" /> ملغى</Badge>
                      : <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> انتظار</Badge>}
                  </div>
                  <div className="mt-1 flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => openEdit(i)} className="h-7 text-xs gap-1"><Edit className="h-3 w-3" /> تعديل</Button>
                    <Button size="sm" variant="destructive" onClick={() => remove(i.id)} className="h-7 text-xs gap-1"><Trash2 className="h-3 w-3" /> حذف</Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      ))}
      {filtered.length === 0 && trucks.length > 0 && (
        <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">لا توجد توزيعات</div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader><DialogTitle>{edit ? "تعديل توزيعة" : "توزيعة جديدة"}</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <div>
              <Label>الشاحنة *</Label>
              <select value={form.truck_id} onChange={(e) => setForm({ ...form, truck_id: e.target.value })} className="w-full rounded-md border border-input bg-background p-2 text-sm">
                <option value="">-- اختر --</option>
                {trucks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div><Label>اسم الزبون</Label><Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} /></div>
            <div><Label>المنتج *</Label><Input value={form.product_name} onChange={(e) => setForm({ ...form, product_name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>الكمية</Label><Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: parseFloat(e.target.value) || 0 })} /></div>
              <div><Label>السعر</Label><Input type="number" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: parseFloat(e.target.value) || 0 })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label>المدفوع</Label><Input type="number" value={form.paid} onChange={(e) => setForm({ ...form, paid: parseFloat(e.target.value) || 0 })} /></div>
              <div>
                <Label>الحالة</Label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm">
                  <option value="pending">قيد الانتظار</option>
                  <option value="delivered">مُسلّم</option>
                  <option value="cancelled">ملغى</option>
                </select>
              </div>
            </div>
            <div><Label>ملاحظات</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <div className="rounded-lg bg-muted p-2 text-center">
              <div className="text-xs text-muted-foreground">المجموع</div>
              <div className="font-mono text-lg font-bold text-primary">{(form.quantity * form.unit_price).toFixed(2)}</div>
            </div>
            <Button onClick={save} className="w-full bg-gradient-primary text-primary-foreground">حفظ</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------- Warehouse: main + per-truck inventory ---------- */
function AdminWarehouse({ userId }: { userId: string }) {
  const [products, setProducts] = useState<any[]>([]);
  const [trucks, setTrucks] = useState<any[]>([]);
  const [dists, setDists] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  const load = async () => {
    const [{ data: p }, { data: t }, { data: d }] = await Promise.all([
      supabase.from("products").select("id,name,stock_quantity,cost_price,retail_price,unit").eq("user_id", userId).order("name").limit(1000),
      supabase.from("trucks").select("*").eq("owner_id", userId),
      supabase.from("truck_distributions").select("*").eq("owner_id", userId).limit(2000),
    ]);
    setProducts(p || []); setTrucks(t || []); setDists(d || []);
  };
  useEffect(() => { load(); }, [userId]);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q ? products.filter((p) => p.name.toLowerCase().includes(q)) : products;
    return list.slice(0, 200);
  }, [products, search]);

  const totalValue = useMemo(() => products.reduce((s, p) => s + Number(p.stock_quantity || 0) * Number(p.cost_price || 0), 0), [products]);

  const truckInv = useMemo(() => {
    const out = new Map<string, Map<string, { name: string; pending: number; delivered: number; value: number }>>();
    for (const t of trucks) out.set(t.id, new Map());
    for (const d of dists) {
      const m = out.get(d.truck_id); if (!m) continue;
      const cur = m.get(d.product_name) || { name: d.product_name, pending: 0, delivered: 0, value: 0 };
      const q = Number(d.quantity) || 0;
      if (d.status === "pending") cur.pending += q;
      else if (d.status === "delivered") cur.delivered += q;
      cur.value += Number(d.total) || 0;
      m.set(d.product_name, cur);
    }
    return out;
  }, [dists, trucks]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold"><Boxes className="h-4 w-4 text-primary" /> المخزون الرئيسي</div>
          <div className="text-xs text-muted-foreground">القيمة: <span className="font-mono font-bold text-primary">{totalValue.toFixed(2)}</span></div>
        </div>
        <div className="relative mb-2">
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="بحث منتج..." className="pr-9 h-8 text-sm" />
        </div>
        <div className="space-y-1 max-h-72 overflow-auto">
          {filteredProducts.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-background p-2 text-xs">
              <div className="min-w-0 flex-1 truncate font-semibold">{p.name}</div>
              <Badge variant="outline" className="text-xs">{Number(p.stock_quantity).toFixed(0)} {p.unit || ""}</Badge>
              <div className="font-mono text-muted-foreground">{(Number(p.stock_quantity) * Number(p.cost_price || 0)).toFixed(0)}</div>
            </div>
          ))}
          {filteredProducts.length === 0 && <div className="p-3 text-center text-xs text-muted-foreground">لا توجد منتجات</div>}
        </div>
      </div>

      {trucks.map((t) => {
        const inv = Array.from(truckInv.get(t.id)?.values() || []).sort((a, b) => b.pending - a.pending);
        return (
          <div key={t.id} className="rounded-xl border border-border bg-card p-3">
            <div className="mb-2 flex items-center gap-2 font-bold text-sm">
              <TruckIcon className="h-4 w-4 text-amber-600" /> {t.name}
              <Badge variant="secondary" className="text-xs">{inv.length}</Badge>
            </div>
            {inv.length === 0 ? (
              <div className="text-center text-xs text-muted-foreground py-2">لا يوجد مخزون</div>
            ) : (
              <div className="space-y-1">
                {inv.map((p) => (
                  <div key={p.name} className="flex items-center justify-between gap-2 rounded-lg border border-border p-2 text-xs">
                    <div className="min-w-0 flex-1 truncate font-semibold">{p.name}</div>
                    <Badge className="bg-amber-500 text-xs">متاح {p.pending}</Badge>
                    <Badge className="bg-emerald-500 text-xs">مُسلّم {p.delivered}</Badge>
                    <div className="font-mono text-primary">{p.value.toFixed(0)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
