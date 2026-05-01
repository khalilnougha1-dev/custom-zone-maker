import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Plus, Search, Pencil, Trash2, ImageIcon, ArrowRight, Camera,
  ImageOff, Save, Barcode, PencilLine
} from "lucide-react";
import { PosLayout } from "@/components/pos/PosLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/app/products")({ component: ProductsPage });

type Product = {
  id: string; name: string; reference: string | null; barcode: string | null;
  cost_price: number; retail_price: number; wholesale_price: number | null;
  semi_wholesale_price: number | null; stock_quantity: number;
  image_url: string | null; category_id: string | null; notes: string | null;
  is_inactive: boolean; sale_mode: string | null;
};

type Category = { id: string; name: string; color: string | null };

function ProductsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [q, setQ] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  const loadItems = async () => {
    if (!user) return;
    const { data } = await supabase.from("products").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setItems((data as any) || []);
  };
  const loadCategories = async () => {
    if (!user) return;
    const { data } = await supabase.from("categories").select("*").eq("user_id", user.id).order("name");
    setCategories((data as any) || []);
  };
  useEffect(() => { loadItems(); loadCategories(); }, [user]);

  const openNew = () => { setEditing(null); setEditorOpen(true); };
  const openEdit = (p: Product) => { setEditing(p); setEditorOpen(true); };

  const remove = async (id: string) => {
    if (!confirm("حذف المنتج؟")) return;
    await supabase.from("products").delete().eq("id", id);
    loadItems();
  };

  const filtered = items.filter(p =>
    p.name.toLowerCase().includes(q.toLowerCase()) || (p.barcode || "").includes(q)
  );

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
          <div key={p.id} className={`flex items-center gap-3 rounded-xl bg-card border border-border p-3 shadow-sm ${p.is_inactive ? "opacity-60" : ""}`}>
            <div className="h-16 w-16 shrink-0 flex items-center justify-center rounded-lg bg-muted overflow-hidden">
              {p.image_url ? <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" /> : <ImageIcon className="h-7 w-7 text-muted-foreground" />}
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

      {editorOpen && (
        <ProductEditor
          editing={editing}
          categories={categories}
          onClose={() => setEditorOpen(false)}
          onSaved={() => { setEditorOpen(false); loadItems(); }}
          onCategoriesChanged={loadCategories}
        />
      )}
    </PosLayout>
  );
}

function ProductEditor({
  editing, categories, onClose, onSaved, onCategoriesChanged,
}: {
  editing: Product | null;
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
  onCategoriesChanged: () => void;
}) {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [catOpen, setCatOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [multiBarcode, setMultiBarcode] = useState(false);

  const [form, setForm] = useState({
    name: editing?.name || "",
    category_id: editing?.category_id || "",
    cost_price: editing ? String(editing.cost_price) : "",
    retail_price: editing ? String(editing.retail_price) : "",
    wholesale_price: editing?.wholesale_price ? String(editing.wholesale_price) : "",
    semi_wholesale_price: editing?.semi_wholesale_price ? String(editing.semi_wholesale_price) : "",
    sale_mode: editing?.sale_mode || "unit",
    stock_quantity: editing ? String(editing.stock_quantity) : "0",
    image_url: editing?.image_url || "",
    notes: editing?.notes || "",
    barcode: editing?.barcode || "",
    is_inactive: editing?.is_inactive || false,
  });

  const update = (patch: Partial<typeof form>) => setForm(f => ({ ...f, ...patch }));

  const pickImage = () => fileRef.current?.click();

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("product-images").upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); setUploading(false); return; }
    const { data } = supabase.storage.from("product-images").getPublicUrl(path);
    update({ image_url: data.publicUrl });
    setUploading(false);
    toast.success("تم رفع الصورة");
  };

  const removeImage = () => update({ image_url: "" });

  const addCategory = async () => {
    if (!user || !newCatName.trim()) return;
    const { data, error } = await supabase.from("categories").insert({
      user_id: user.id, name: newCatName.trim(),
    }).select().single();
    if (error) return toast.error(error.message);
    onCategoriesChanged();
    update({ category_id: data.id });
    setNewCatName("");
    setCatOpen(false);
    toast.success("تمت إضافة الفئة");
  };

  const save = async () => {
    if (!user) return;
    if (!form.name.trim()) return toast.error("التسمية مطلوبة");
    setSaving(true);
    const payload = {
      user_id: user.id,
      name: form.name.trim(),
      category_id: form.category_id || null,
      cost_price: Number(form.cost_price) || 0,
      retail_price: Number(form.retail_price) || 0,
      wholesale_price: form.wholesale_price ? Number(form.wholesale_price) : null,
      semi_wholesale_price: form.semi_wholesale_price ? Number(form.semi_wholesale_price) : null,
      sale_mode: form.sale_mode,
      stock_quantity: Number(form.stock_quantity) || 0,
      image_url: form.image_url || null,
      notes: form.notes.trim() || null,
      barcode: form.barcode.trim() || null,
      is_inactive: form.is_inactive,
    };
    const { error } = editing
      ? await supabase.from("products").update(payload).eq("id", editing.id)
      : await supabase.from("products").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("تم الحفظ");
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background" dir="rtl">
      {/* Top bar */}
      <header className="bg-gradient-primary text-primary-foreground shadow-md">
        <div className="flex h-14 items-center justify-between px-4">
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-white/10" aria-label="رجوع">
            <ArrowRight className="h-6 w-6" />
          </button>
          <h1 className="text-lg font-bold">{editing ? "تعديل المنتج" : "إضافة منتج"}</h1>
          <div className="w-10" />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4 pb-28">
        {/* Inactive toggle */}
        <div className="flex items-center justify-end gap-3 mb-4">
          <Label className="font-semibold cursor-pointer">منتج غير نشيط</Label>
          <Switch checked={form.is_inactive} onCheckedChange={(v) => update({ is_inactive: v })} />
        </div>

        {/* Name */}
        <Row label="التسمية">
          <Input value={form.name} onChange={(e) => update({ name: e.target.value })} className="bg-card border-primary/40" />
        </Row>

        {/* Category */}
        <Row label="الفئة">
          <div className="flex items-center gap-2">
            <button onClick={() => setCatOpen(true)} className="shrink-0 text-foreground" aria-label="إضافة فئة">
              <Plus className="h-7 w-7" strokeWidth={2.5} />
            </button>
            <div className="flex-1">
              <Select value={form.category_id || "none"} onValueChange={(v) => update({ category_id: v === "none" ? "" : v })}>
                <SelectTrigger className="bg-card border-primary/40 h-11" dir="rtl">
                  <SelectValue placeholder="[بدون فئة]" />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  <SelectItem value="none">[بدون فئة]</SelectItem>
                  {categories.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Row>

        {/* Cost price */}
        <Row label="سعر الشراء (التكلفة)">
          <Input type="number" inputMode="decimal" value={form.cost_price}
            onChange={(e) => update({ cost_price: e.target.value })}
            className="bg-card border-primary/40 w-40 text-right font-mono" />
        </Row>

        {/* Sale prices section */}
        <div className="mt-4 mb-2 text-right">
          <div className="text-muted-foreground font-semibold">أسعار البيع</div>
          <div className="h-px bg-border mt-1" />
        </div>

        <Row label="سعر التجزئة">
          <Input type="number" inputMode="decimal" value={form.retail_price}
            onChange={(e) => update({ retail_price: e.target.value })}
            className="bg-card border-primary/40 w-40 text-right font-mono" />
        </Row>

        {/* Sale mode */}
        <Row label="طريقة البيع">
          <div className="flex items-center gap-5">
            <RadioOption
              checked={form.sale_mode === "unit"}
              onClick={() => update({ sale_mode: "unit" })}
              label="بالوحدة"
            />
            <RadioOption
              checked={form.sale_mode === "fraction"}
              onClick={() => update({ sale_mode: "fraction" })}
              label="بالأجزاء"
            />
          </div>
        </Row>

        {/* Initial qty */}
        <Row label="الكمية الأولية">
          <Input type="number" inputMode="decimal" value={form.stock_quantity}
            onChange={(e) => update({ stock_quantity: e.target.value })}
            className="bg-card border-primary/40 w-40 text-right font-mono" />
        </Row>

        {/* Image */}
        <Row label="صورة المنتج" alignTop>
          <div className="flex items-start gap-3">
            <div className="flex flex-col gap-2">
              <Button onClick={pickImage} disabled={uploading} className="bg-gradient-primary text-primary-foreground gap-2 rounded-full px-5">
                <Camera className="h-4 w-4" /> {uploading ? "جارٍ الرفع..." : "تحديد..."}
              </Button>
              <Button onClick={removeImage} variant="default" className="bg-gradient-primary text-primary-foreground gap-2 rounded-full px-5">
                <ImageOff className="h-4 w-4" /> حذف
              </Button>
            </div>
            <div className="h-32 w-32 rounded-xl border border-border bg-card flex items-center justify-center overflow-hidden shadow-sm">
              {form.image_url ? (
                <img src={form.image_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <ImageIcon className="h-16 w-16 text-muted-foreground" />
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
          </div>
        </Row>

        {/* Notes */}
        <Row label="ملاحظة">
          <Textarea value={form.notes} onChange={(e) => update({ notes: e.target.value })}
            rows={2} className="bg-card border-primary/40 text-right" />
        </Row>

        {/* Barcodes */}
        <Row label="الرموز الشريطية">
          <div className="flex items-center gap-3">
            <button className="text-foreground" aria-label="مسح الباركود">
              <Barcode className="h-7 w-7" strokeWidth={1.5} />
            </button>
            <button
              onClick={() => {
                const code = prompt("أدخل الباركود");
                if (code) update({ barcode: code });
              }}
              className="text-foreground"
              aria-label="إدخال يدوي"
            >
              <PencilLine className="h-6 w-6" />
            </button>
            <Switch checked={multiBarcode} onCheckedChange={setMultiBarcode} />
            <span className="text-sm">مسح متعدد</span>
            {form.barcode && (
              <span className="text-xs font-mono text-muted-foreground truncate">{form.barcode}</span>
            )}
          </div>
        </Row>
      </main>

      {/* Save button */}
      <div className="border-t border-border bg-card p-3">
        <Button onClick={save} disabled={saving}
          className="w-full h-12 bg-gradient-primary text-primary-foreground font-bold gap-2 rounded-full">
          <Save className="h-5 w-5" /> {saving ? "جارٍ الحفظ..." : "حفظ"}
        </Button>
      </div>

      {/* Add category dialog */}
      <Dialog open={catOpen} onOpenChange={setCatOpen}>
        <DialogContent dir="rtl" className="max-w-sm">
          <DialogHeader><DialogTitle className="text-right">فئة جديدة</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label>اسم الفئة</Label>
            <Input value={newCatName} onChange={(e) => setNewCatName(e.target.value)} autoFocus
              onKeyDown={(e) => e.key === "Enter" && addCategory()} />
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setCatOpen(false)} className="flex-1">إلغاء</Button>
            <Button onClick={addCategory} className="flex-1 bg-gradient-primary text-primary-foreground">إضافة</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, children, alignTop }: { label: string; children: React.ReactNode; alignTop?: boolean }) {
  return (
    <div className={`flex ${alignTop ? "items-start" : "items-center"} gap-3 py-2`}>
      <Label className="w-32 shrink-0 text-right text-muted-foreground font-semibold">{label}</Label>
      <div className="flex-1 flex justify-end">{children}</div>
    </div>
  );
}

function RadioOption({ checked, onClick, label }: { checked: boolean; onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-2">
      <span className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${checked ? "border-red-600" : "border-muted-foreground"}`}>
        {checked && <span className="h-2.5 w-2.5 rounded-full bg-red-600" />}
      </span>
      <span className="text-sm">{label}</span>
    </button>
  );
}
