import { useEffect, useMemo, useState } from "react";
import {
  Home, Calculator, ShoppingCart, Receipt, Truck as TruckIcon, Package,
  Boxes, Users, Wallet, TrendingUp, Settings as SettingsIcon, X, Trash2, Edit, Save, Plus, Search, Calendar, ImageIcon
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string;
  userName?: string;
  truckName?: string;
}

type SectionKey =
  | "overview" | "sales" | "purchases" | "products" | "stock"
  | "customers" | "suppliers" | "expenses" | "cash" | "finance";

const MENU: { key: SectionKey; label: string; icon: any }[] = [
  { key: "overview", label: "الرئيسية", icon: Home },
  { key: "cash", label: "الصندوق", icon: Calculator },
  { key: "sales", label: "المبيعات", icon: Receipt },
  { key: "purchases", label: "المشتريات", icon: TruckIcon },
  { key: "products", label: "المنتجات", icon: Package },
  { key: "stock", label: "المخزون", icon: Boxes },
  { key: "customers", label: "الزبائن", icon: Users },
  { key: "suppliers", label: "الممونين", icon: TruckIcon },
  { key: "expenses", label: "المصاريف", icon: Wallet },
  { key: "finance", label: "الوضعية المالية", icon: TrendingUp },
];

export function AdminUserAppMenu({ open, onOpenChange, userId, userName, truckName }: Props) {
  const [section, setSection] = useState<SectionKey>("overview");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        dir="rtl"
        className="max-w-5xl w-[95vw] h-[90vh] p-0 overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between bg-gradient-primary px-4 py-3 text-primary-foreground">
          <div className="min-w-0">
            <div className="text-xs opacity-80">إدارة بيانات المستخدم</div>
            <div className="font-bold truncate">
              {userName || "—"} {truckName ? `• ${truckName}` : ""}
            </div>
          </div>
          <button onClick={() => onOpenChange(false)} className="rounded-lg p-2 hover:bg-white/10">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-1 min-h-0">
          {/* Sidebar menu (like the app drawer) */}
          <aside className="w-56 shrink-0 overflow-y-auto border-l border-border bg-card p-2">
            {MENU.map((m) => {
              const active = section === m.key;
              return (
                <button
                  key={m.key}
                  onClick={() => setSection(m.key)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition mb-1",
                    active ? "bg-primary/10 text-primary" : "text-foreground/80 hover:bg-muted"
                  )}
                >
                  <m.icon className="h-5 w-5" />
                  {m.label}
                </button>
              );
            })}
          </aside>

          {/* Section content */}
          <div className="flex-1 overflow-y-auto p-4 bg-muted/30">
            {section === "overview" && <OverviewSection userId={userId} />}
            {section === "sales" && <SalesSection userId={userId} />}
            {section === "purchases" && <PurchasesSection userId={userId} />}
            {section === "products" && <ProductsSection userId={userId} />}
            {section === "stock" && <StockSection userId={userId} />}
            {section === "customers" && <CrudListSection userId={userId} table="customers" labelSingular="زبون" fields={["name", "phone", "address"]} />}
            {section === "suppliers" && <CrudListSection userId={userId} table="suppliers" labelSingular="ممون" fields={["name", "phone", "address"]} />}
            {section === "expenses" && <ExpensesSection userId={userId} />}
            {section === "cash" && <CashSection userId={userId} />}
            {section === "finance" && <FinanceSection userId={userId} />}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Overview ---------- */
function OverviewSection({ userId }: { userId: string }) {
  const [stats, setStats] = useState<{ sales: number; purchases: number; products: number; customers: number; suppliers: number; expenses: number } | null>(null);
  useEffect(() => {
    (async () => {
      const [s, p, pr, c, su, ex] = await Promise.all([
        supabase.from("sales").select("total", { count: "exact" }).eq("user_id", userId),
        supabase.from("purchases").select("total", { count: "exact" }).eq("user_id", userId),
        supabase.from("products").select("id", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("customers").select("id", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("suppliers").select("id", { count: "exact", head: true }).eq("user_id", userId),
        supabase.from("expenses").select("amount", { count: "exact" }).eq("user_id", userId),
      ]);
      setStats({
        sales: (s.data || []).reduce((a: number, r: any) => a + Number(r.total || 0), 0),
        purchases: (p.data || []).reduce((a: number, r: any) => a + Number(r.total || 0), 0),
        products: pr.count || 0,
        customers: c.count || 0,
        suppliers: su.count || 0,
        expenses: (ex.data || []).reduce((a: number, r: any) => a + Number(r.amount || 0), 0),
      });
    })();
  }, [userId]);
  if (!stats) return <div className="text-sm text-muted-foreground">جار التحميل...</div>;
  const tile = (label: string, value: any) => (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-bold">{value}</div>
    </div>
  );
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {tile("إجمالي المبيعات", stats.sales.toLocaleString() + " دج")}
      {tile("إجمالي المشتريات", stats.purchases.toLocaleString() + " دج")}
      {tile("إجمالي المصاريف", stats.expenses.toLocaleString() + " دج")}
      {tile("عدد المنتجات", stats.products)}
      {tile("عدد الزبائن", stats.customers)}
      {tile("عدد الممونين", stats.suppliers)}
    </div>
  );
}

/* ---------- Sales ---------- */
function SalesSection({ userId }: { userId: string }) {
  const [items, setItems] = useState<any[]>([]);
  const load = async () => {
    const { data } = await supabase.from("sales").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(200);
    setItems(data || []);
  };
  useEffect(() => { load(); }, [userId]);
  const remove = async (id: string) => {
    if (!confirm("حذف الفاتورة؟ سيتم استرجاع المخزون.")) return;
    const { error } = await supabase.from("sales").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("تم الحذف"); load();
  };
  return (
    <div className="space-y-2">
      <div className="font-bold mb-1">المبيعات ({items.length})</div>
      {items.length === 0 && <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">لا توجد فواتير</div>}
      {items.map((s) => (
        <div key={s.id} className="rounded-xl border bg-card p-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="font-semibold text-sm">{s.invoice_number || s.id.slice(0, 8)}</div>
            <div className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString("ar-DZ")}</div>
          </div>
          <div className="text-sm font-bold">{Number(s.total).toLocaleString()} دج</div>
          <Button size="sm" variant="destructive" onClick={() => remove(s.id)}><Trash2 className="h-3 w-3" /></Button>
        </div>
      ))}
    </div>
  );
}

/* ---------- Purchases ---------- */
function PurchasesSection({ userId }: { userId: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [supplierId, setSupplierId] = useState<string>("");
  const [invoice, setInvoice] = useState("");
  const [lines, setLines] = useState<{ product_id: string; quantity: string; unit_cost: string }[]>([
    { product_id: "", quantity: "1", unit_cost: "0" },
  ]);

  const load = async () => {
    const { data } = await supabase.from("purchases").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(200);
    setItems(data || []);
  };
  const loadRefs = async () => {
    const [{ data: pr }, { data: su }] = await Promise.all([
      supabase.from("products").select("id,name,cost_price,stock_quantity").eq("user_id", userId).order("name"),
      supabase.from("suppliers").select("id,name").eq("user_id", userId).order("name"),
    ]);
    setProducts(pr || []);
    setSuppliers(su || []);
  };
  useEffect(() => { load(); loadRefs(); }, [userId]);

  const remove = async (id: string) => {
    if (!confirm("حذف الفاتورة؟ سيتم استرجاع المخزون.")) return;
    const { error: e1 } = await supabase.from("purchase_items").delete().eq("purchase_id", id);
    if (e1) return toast.error(e1.message);
    const { error } = await supabase.from("purchases").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("تم الحذف"); load();
  };

  const total = lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unit_cost) || 0), 0);

  const openNew = () => {
    setSupplierId(""); setInvoice("");
    setLines([{ product_id: "", quantity: "1", unit_cost: "0" }]);
    setOpen(true);
  };

  const save = async () => {
    const valid = lines.filter((l) => l.product_id && Number(l.quantity) > 0);
    if (valid.length === 0) return toast.error("أضف منتجاً واحداً على الأقل");

    const { data: purchase, error } = await supabase
      .from("purchases")
      .insert({
        user_id: userId,
        supplier_id: supplierId || null,
        invoice_number: invoice || null,
        total,
        subtotal: total,
        paid: total,
      })
      .select()
      .single();
    if (error || !purchase) return toast.error(error?.message || "خطأ");

    const itemsPayload = valid.map((l) => {
      const p = products.find((x) => x.id === l.product_id);
      return {
        purchase_id: purchase.id,
        product_id: l.product_id,
        product_name: p?.name || "",
        quantity: Number(l.quantity),
        unit_cost: Number(l.unit_cost),
        total: Number(l.quantity) * Number(l.unit_cost),
      };
    });
    const { error: e2 } = await supabase.from("purchase_items").insert(itemsPayload);
    if (e2) return toast.error(e2.message);
    toast.success("تمت إضافة المشترى وتحديث المخزون");
    setOpen(false);
    load(); loadRefs();
  };

  const setLine = (i: number, k: "product_id" | "quantity" | "unit_cost", v: string) => {
    const next = [...lines];
    next[i] = { ...next[i], [k]: v };
    if (k === "product_id") {
      const p = products.find((x) => x.id === v);
      if (p && (!next[i].unit_cost || next[i].unit_cost === "0")) next[i].unit_cost = String(p.cost_price || 0);
    }
    setLines(next);
  };

  return (
    <div className="space-y-2">
      <Button onClick={openNew} className="w-full bg-gradient-primary text-primary-foreground gap-2">
        <Plus className="h-4 w-4" /> مشترى جديد
      </Button>
      <div className="font-bold mb-1">المشتريات ({items.length})</div>
      {items.length === 0 && <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">لا توجد فواتير</div>}
      {items.map((s) => (
        <div key={s.id} className="rounded-xl border bg-card p-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="font-semibold text-sm">{s.invoice_number || s.id.slice(0, 8)}</div>
            <div className="text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString("ar-DZ")}</div>
          </div>
          <div className="text-sm font-bold">{Number(s.total).toLocaleString()} دج</div>
          <Button size="sm" variant="destructive" onClick={() => remove(s.id)}><Trash2 className="h-3 w-3" /></Button>
        </div>
      ))}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="max-w-lg max-h-[85vh] overflow-y-auto">
          <div className="font-bold mb-2">مشترى جديد</div>
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">الممون</Label>
                <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm">
                  <option value="">— بدون —</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <Label className="text-xs">رقم الفاتورة</Label>
                <Input value={invoice} onChange={(e) => setInvoice(e.target.value)} />
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t">
              {lines.map((l, i) => (
                <div key={i} className="rounded-lg border p-2 space-y-1">
                  <select value={l.product_id} onChange={(e) => setLine(i, "product_id", e.target.value)} className="w-full h-9 rounded-md border border-input bg-background px-2 text-sm">
                    <option value="">— اختر منتج —</option>
                    {products.map((p) => <option key={p.id} value={p.id}>{p.name} (مخزون: {p.stock_quantity})</option>)}
                  </select>
                  <div className="grid grid-cols-3 gap-1 items-end">
                    <div>
                      <Label className="text-xs">الكمية</Label>
                      <Input type="number" value={l.quantity} onChange={(e) => setLine(i, "quantity", e.target.value)} className="h-8" />
                    </div>
                    <div>
                      <Label className="text-xs">سعر الوحدة</Label>
                      <Input type="number" value={l.unit_cost} onChange={(e) => setLine(i, "unit_cost", e.target.value)} className="h-8" />
                    </div>
                    <Button size="sm" variant="destructive" onClick={() => setLines(lines.filter((_, j) => j !== i))} disabled={lines.length === 1}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
              <Button size="sm" variant="outline" className="w-full gap-1" onClick={() => setLines([...lines, { product_id: "", quantity: "1", unit_cost: "0" }])}>
                <Plus className="h-3 w-3" /> سطر جديد
              </Button>
            </div>

            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-sm font-bold">المجموع</span>
              <span className="text-lg font-bold text-primary">{total.toLocaleString()} دج</span>
            </div>
            <Button onClick={save} className="w-full bg-gradient-primary text-primary-foreground gap-2"><Save className="h-4 w-4" /> حفظ</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------- Products (full edit) ---------- */
function ProductsSection({ userId }: { userId: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const load = async () => {
    const { data } = await supabase.from("products").select("*").eq("user_id", userId).order("name");
    setItems(data || []);
  };
  useEffect(() => { load(); }, [userId]);
  const filtered = items.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
  const remove = async (id: string) => {
    if (!confirm("حذف المنتج؟")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("تم الحذف"); load();
  };
  return (
    <div className="space-y-2">
      <Input placeholder="بحث..." value={search} onChange={(e) => setSearch(e.target.value)} />
      <div className="text-xs text-muted-foreground">{filtered.length} منتج</div>
      {filtered.map((p) => (
        <div key={p.id} className="rounded-xl border bg-card p-3 flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-sm">{p.name}</div>
            <div className="text-xs text-muted-foreground">سعر: {p.retail_price} • تكلفة: {p.cost_price} • مخزون: {p.stock_quantity}</div>
          </div>
          <Button size="sm" variant="destructive" onClick={() => remove(p.id)}><Trash2 className="h-3 w-3" /></Button>
        </div>
      ))}
    </div>
  );
}

/* ---------- Stock movements ---------- */
function StockSection({ userId }: { userId: string }) {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("stock_movements").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(200);
      setItems(data || []);
    })();
  }, [userId]);
  return (
    <div className="space-y-2">
      <div className="font-bold mb-1">حركات المخزون ({items.length})</div>
      {items.map((m) => (
        <div key={m.id} className="rounded-xl border bg-card p-3 flex items-center justify-between gap-2 text-sm">
          <div className="min-w-0">
            <div className="font-semibold">{m.product_name}</div>
            <div className="text-xs text-muted-foreground">{m.movement_type} • {new Date(m.created_at).toLocaleString("ar-DZ")}</div>
          </div>
          <div className={cn("font-bold", Number(m.quantity_change) >= 0 ? "text-green-600" : "text-destructive")}>
            {Number(m.quantity_change) > 0 ? "+" : ""}{m.quantity_change}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- Generic CRUD list (customers/suppliers) ---------- */
function CrudListSection({ userId, table, labelSingular, fields }: { userId: string; table: "customers" | "suppliers"; labelSingular: string; fields: string[] }) {
  const [items, setItems] = useState<any[]>([]);
  const [edit, setEdit] = useState<any | null>(null);
  const [open, setOpen] = useState(false);
  const empty = useMemo(() => Object.fromEntries(fields.map((f) => [f, ""])), [fields]);
  const [form, setForm] = useState<Record<string, string>>(empty);

  const load = async () => {
    const { data } = await supabase.from(table).select("*").eq("user_id", userId).order("created_at", { ascending: false });
    setItems(data || []);
  };
  useEffect(() => { load(); }, [userId, table]);

  const openNew = () => { setEdit(null); setForm(empty); setOpen(true); };
  const openEdit = (it: any) => { setEdit(it); setForm(Object.fromEntries(fields.map((f) => [f, it[f] || ""]))); setOpen(true); };
  const save = async () => {
    if (!form.name?.trim()) return toast.error("الاسم مطلوب");
    const payload: any = { ...form, user_id: userId };
    const { error } = edit ? await supabase.from(table).update(payload).eq("id", edit.id) : await supabase.from(table).insert(payload);
    if (error) return toast.error(error.message);
    toast.success("تم الحفظ"); setOpen(false); load();
  };
  const remove = async (id: string) => {
    if (!confirm("حذف؟")) return;
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("تم الحذف"); load();
  };

  return (
    <div className="space-y-2">
      <Button onClick={openNew} className="w-full bg-gradient-primary text-primary-foreground gap-2">
        <Plus className="h-4 w-4" /> {labelSingular} جديد
      </Button>
      {items.length === 0 && <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">لا توجد بيانات</div>}
      {items.map((c) => (
        <div key={c.id} className="rounded-xl border bg-card p-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="font-semibold text-sm">{c.name}</div>
            {c.phone && <div className="text-xs text-muted-foreground" dir="ltr">{c.phone}</div>}
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" onClick={() => openEdit(c)}><Edit className="h-3 w-3" /></Button>
            <Button size="sm" variant="destructive" onClick={() => remove(c.id)}><Trash2 className="h-3 w-3" /></Button>
          </div>
        </div>
      ))}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="max-w-md">
          <div className="font-bold mb-2">{edit ? `تعديل ${labelSingular}` : `${labelSingular} جديد`}</div>
          <div className="space-y-2">
            {fields.map((f) => (
              <div key={f}>
                <Label>{f === "name" ? "الاسم" : f === "phone" ? "الهاتف" : f === "address" ? "العنوان" : f}</Label>
                <Input value={form[f] || ""} onChange={(e) => setForm({ ...form, [f]: e.target.value })} dir={f === "phone" ? "ltr" : "rtl"} />
              </div>
            ))}
            <Button onClick={save} className="w-full bg-gradient-primary text-primary-foreground gap-2"><Save className="h-4 w-4" /> حفظ</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------- Expenses ---------- */
function ExpensesSection({ userId }: { userId: string }) {
  const [items, setItems] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ description: "", amount: "", category: "" });
  const load = async () => {
    const { data } = await supabase.from("expenses").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(200);
    setItems(data || []);
  };
  useEffect(() => { load(); }, [userId]);
  const save = async () => {
    if (!form.description.trim() || !form.amount) return toast.error("املأ الحقول");
    const { error } = await supabase.from("expenses").insert({ user_id: userId, description: form.description, amount: Number(form.amount), category: form.category || null });
    if (error) return toast.error(error.message);
    toast.success("تم"); setOpen(false); setForm({ description: "", amount: "", category: "" }); load();
  };
  const remove = async (id: string) => {
    if (!confirm("حذف؟")) return;
    await supabase.from("expenses").delete().eq("id", id);
    load();
  };
  return (
    <div className="space-y-2">
      <Button onClick={() => setOpen(true)} className="w-full bg-gradient-primary text-primary-foreground gap-2"><Plus className="h-4 w-4" /> مصروف جديد</Button>
      {items.map((e) => (
        <div key={e.id} className="rounded-xl border bg-card p-3 flex items-center justify-between gap-2">
          <div className="min-w-0"><div className="font-semibold text-sm">{e.description}</div><div className="text-xs text-muted-foreground">{e.category || ""} • {new Date(e.created_at).toLocaleDateString("ar-DZ")}</div></div>
          <div className="font-bold text-sm">{Number(e.amount).toLocaleString()} دج</div>
          <Button size="sm" variant="destructive" onClick={() => remove(e.id)}><Trash2 className="h-3 w-3" /></Button>
        </div>
      ))}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="max-w-md">
          <div className="font-bold mb-2">مصروف جديد</div>
          <div className="space-y-2">
            <div><Label>الوصف</Label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div><Label>المبلغ</Label><Input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
            <div><Label>الفئة</Label><Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
            <Button onClick={save} className="w-full bg-gradient-primary text-primary-foreground">حفظ</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------- Cash ---------- */
function CashSection({ userId }: { userId: string }) {
  const [items, setItems] = useState<any[]>([]);
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("cash_movements").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(200);
      setItems(data || []);
    })();
  }, [userId]);
  const total = items.reduce((a, m) => a + Number(m.amount || 0), 0);
  return (
    <div className="space-y-2">
      <div className="rounded-xl bg-gradient-primary text-primary-foreground p-4">
        <div className="text-xs opacity-80">الرصيد الحالي</div>
        <div className="text-2xl font-bold">{total.toLocaleString()} دج</div>
      </div>
      {items.map((m) => (
        <div key={m.id} className="rounded-xl border bg-card p-3 flex items-center justify-between gap-2 text-sm">
          <div className="min-w-0"><div className="font-semibold">{m.type}</div><div className="text-xs text-muted-foreground">{m.notes || ""} • {new Date(m.created_at).toLocaleString("ar-DZ")}</div></div>
          <div className={cn("font-bold", Number(m.amount) >= 0 ? "text-green-600" : "text-destructive")}>{Number(m.amount).toLocaleString()} دج</div>
        </div>
      ))}
    </div>
  );
}

/* ---------- Finance ---------- */
function FinanceSection({ userId }: { userId: string }) {
  const [data, setData] = useState<{ sales: number; purchases: number; expenses: number; cash: number } | null>(null);
  useEffect(() => {
    (async () => {
      const [s, p, e, c] = await Promise.all([
        supabase.from("sales").select("total").eq("user_id", userId),
        supabase.from("purchases").select("total").eq("user_id", userId),
        supabase.from("expenses").select("amount").eq("user_id", userId),
        supabase.from("cash_movements").select("amount").eq("user_id", userId),
      ]);
      const sum = (rows: any[] | null, k: string) => (rows || []).reduce((a, r) => a + Number(r[k] || 0), 0);
      setData({
        sales: sum(s.data, "total"),
        purchases: sum(p.data, "total"),
        expenses: sum(e.data, "amount"),
        cash: sum(c.data, "amount"),
      });
    })();
  }, [userId]);
  if (!data) return <div className="text-sm text-muted-foreground">جار التحميل...</div>;
  const profit = data.sales - data.purchases - data.expenses;
  return (
    <div className="grid grid-cols-2 gap-3">
      <Tile label="المبيعات" value={data.sales} />
      <Tile label="المشتريات" value={data.purchases} />
      <Tile label="المصاريف" value={data.expenses} />
      <Tile label="الصندوق" value={data.cash} />
      <div className="col-span-2 rounded-xl bg-gradient-primary text-primary-foreground p-4">
        <div className="text-xs opacity-80">الربح الصافي التقديري</div>
        <div className="text-2xl font-bold">{profit.toLocaleString()} دج</div>
      </div>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-bold">{value.toLocaleString()} دج</div>
    </div>
  );
}
