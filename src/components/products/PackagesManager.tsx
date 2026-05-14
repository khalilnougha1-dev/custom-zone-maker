import { useEffect, useRef, useState } from "react";
import {
  ArrowRight, Plus, Pencil, Trash2, Save, Camera, ImageOff, ImageIcon,
  Barcode, PencilLine, Package as PackageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

type Pkg = {
  id: string;
  product_id: string;
  user_id: string;
  name: string;
  units_count: number;
  apply_unit_price: boolean;
  cost_price: number;
  retail_price: number;
  barcode: string | null;
  image_url: string | null;
  notes: string | null;
  is_inactive: boolean;
};

interface Props {
  productId: string;
  productName: string;
  unitPrice: number;
  unitCost?: number;
  onClose: () => void;
}

export function PackagesManager({ productId, productName, unitPrice, unitCost = 0, onClose }: Props) {
  const { user } = useAuth();
  const [items, setItems] = useState<Pkg[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<Pkg | null>(null);

  const load = async () => {
    if (!user) return;
    const { data } = await (supabase as any).from("product_packages")
      .select("*").eq("product_id", productId).order("created_at", { ascending: false });
    setItems(data || []);
  };
  useEffect(() => { load(); }, [user, productId]);

  const remove = async (id: string) => {
    if (!confirm("حذف التعبئة؟")) return;
    const { error } = await (supabase as any).from("product_packages").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("تم الحذف"); load();
  };

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-background" dir="rtl">
      <header className="bg-gradient-primary text-primary-foreground shadow-md">
        <div className="flex h-14 items-center justify-between px-4">
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-white/10"><ArrowRight className="h-6 w-6" /></button>
          <h1 className="text-lg font-bold">التعبئات — {productName}</h1>
          <button onClick={() => { setEditing(null); setEditorOpen(true); }} className="rounded-lg p-2 hover:bg-white/10"><Plus className="h-6 w-6" /></button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
        <div className="text-sm text-muted-foreground">سعر الوحدة: <span className="font-mono">{unitPrice.toFixed(2)}</span></div>
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-10 text-center text-muted-foreground">
            لا توجد تعبئات. أضف تعبئة جديدة بالضغط على +
          </div>
        ) : items.map(p => (
          <div key={p.id} className={`flex items-center gap-3 rounded-xl bg-card border border-border p-3 ${p.is_inactive ? "opacity-60" : ""}`}>
            <div className="h-14 w-14 shrink-0 flex items-center justify-center rounded-lg bg-muted overflow-hidden">
              {p.image_url ? <img src={p.image_url} alt={p.name} className="h-full w-full object-cover" /> : <PackageIcon className="h-6 w-6 text-muted-foreground" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate">{p.name}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {p.units_count} وحدة • تجزئة: <span className="font-mono">{Number(p.retail_price).toFixed(2)}</span>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <button onClick={() => { setEditing(p); setEditorOpen(true); }} className="rounded-md p-1.5 hover:bg-muted"><Pencil className="h-4 w-4" /></button>
              <button onClick={() => remove(p.id)} className="rounded-md p-1.5 hover:bg-destructive/10 text-destructive"><Trash2 className="h-4 w-4" /></button>
            </div>
          </div>
        ))}
      </main>

      {editorOpen && (
        <PackageEditor
          productId={productId}
          unitPrice={unitPrice}
          unitCost={unitCost}
          editing={editing}
          onClose={() => setEditorOpen(false)}
          onSaved={() => { setEditorOpen(false); load(); }}
        />
      )}
    </div>
  );
}

function PackageEditor({
  productId, unitPrice, unitCost, editing, onClose, onSaved,
}: {
  productId: string;
  unitPrice: number;
  unitCost: number;
  editing: Pkg | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [multiBarcode, setMultiBarcode] = useState(false);

  const [form, setForm] = useState({
    name: editing?.name || "",
    units_count: editing ? String(editing.units_count) : "",
    apply_unit_price: editing?.apply_unit_price || false,
    cost_price: editing ? String(editing.cost_price) : "",
    retail_price: editing ? String(editing.retail_price) : "",
    image_url: editing?.image_url || "",
    notes: editing?.notes || "",
    barcode: editing?.barcode || "",
    is_inactive: editing?.is_inactive || false,
  });
  const update = (patch: Partial<typeof form>) => setForm(f => ({ ...f, ...patch }));

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

  const save = async () => {
    if (!user) return;
    if (!form.name.trim()) return toast.error("التسمية مطلوبة");
    const units = Number(form.units_count) || 0;
    if (units <= 0) return toast.error("عدد الوحدات مطلوب");
    setSaving(true);
    const retail = form.apply_unit_price ? unitPrice * units : (Number(form.retail_price) || 0);
    const payload: any = {
      user_id: user.id,
      product_id: productId,
      name: form.name.trim(),
      units_count: units,
      apply_unit_price: form.apply_unit_price,
      cost_price: unitCost * units,
      retail_price: retail,
      image_url: form.image_url || null,
      notes: form.notes.trim() || null,
      barcode: form.barcode.trim() || null,
      is_inactive: form.is_inactive,
    };
    const { error } = editing
      ? await (supabase as any).from("product_packages").update(payload).eq("id", editing.id)
      : await (supabase as any).from("product_packages").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("تم الحفظ");
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-background" dir="rtl">
      <header className="bg-gradient-primary text-primary-foreground shadow-md">
        <div className="flex h-14 items-center justify-between px-4">
          <button onClick={onClose} className="rounded-lg p-2 hover:bg-white/10"><ArrowRight className="h-6 w-6" /></button>
          <h1 className="text-lg font-bold">{editing ? "تعديل تعبئة" : "إضافة تعبئة"}</h1>
          <div className="w-10" />
        </div>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-4 pb-28">
        <div className="text-right font-bold mb-2">المنتج {/* product name shown by parent header */}</div>

        <div className="flex items-center justify-end gap-3 mb-3">
          <Label className="font-semibold cursor-pointer">تعبئة غير نشيطة</Label>
          <Switch checked={form.is_inactive} onCheckedChange={(v) => update({ is_inactive: v })} />
        </div>

        <Row label="سعر الوحدة">
          <span className="font-mono">{unitPrice.toFixed(2)}</span>
        </Row>

        <Row label="التسمية">
          <Input value={form.name} onChange={(e) => update({ name: e.target.value })} className="bg-card border-primary/40" />
        </Row>

        <Row label="عدد الوحدات">
          <Input type="number" inputMode="decimal" value={form.units_count}
            onChange={(e) => update({ units_count: e.target.value })}
            className="bg-card border-primary/40 w-40 text-right font-mono" />
        </Row>

        <Row label="تطبيق سعر الوحدة">
          <Switch checked={form.apply_unit_price} onCheckedChange={(v) => update({ apply_unit_price: v })} />
        </Row>

        <Row label="سعر شراء الوحدة">
          <span className="font-mono">{unitCost.toFixed(2)}</span>
        </Row>

        <Row label="إجمالي سعر الشراء">
          <Input type="number" inputMode="decimal"
            value={(unitCost * (Number(form.units_count) || 0)).toFixed(2)}
            disabled
            className="bg-muted border-primary/40 w-40 text-right font-mono" />
        </Row>

        <div className="mt-4 mb-2 text-right">
          <div className="text-muted-foreground font-semibold">أسعار البيع</div>
          <div className="h-px bg-border mt-1" />
        </div>

        <Row label="سعر التجزئة">
          <Input type="number" inputMode="decimal"
            value={form.apply_unit_price ? (unitPrice * (Number(form.units_count) || 0)).toFixed(2) : form.retail_price}
            disabled={form.apply_unit_price}
            onChange={(e) => update({ retail_price: e.target.value })}
            className="bg-card border-primary/40 w-40 text-right font-mono" />
        </Row>

        <Row label="صورة التعبئة" alignTop>
          <div className="flex items-start gap-3">
            <div className="flex flex-col gap-2">
              <Button onClick={() => fileRef.current?.click()} disabled={uploading} className="bg-gradient-primary text-primary-foreground gap-2 rounded-full px-5">
                <Camera className="h-4 w-4" /> {uploading ? "جارٍ الرفع..." : "تحديد..."}
              </Button>
              <Button onClick={() => update({ image_url: "" })} className="bg-gradient-primary text-primary-foreground gap-2 rounded-full px-5">
                <ImageOff className="h-4 w-4" /> حذف
              </Button>
            </div>
            <div className="h-32 w-32 rounded-xl border border-border bg-card flex items-center justify-center overflow-hidden shadow-sm">
              {form.image_url ? <img src={form.image_url} alt="" className="h-full w-full object-cover" /> : <ImageIcon className="h-16 w-16 text-muted-foreground" />}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
          </div>
        </Row>

        <Row label="ملاحظة">
          <Textarea value={form.notes} onChange={(e) => update({ notes: e.target.value })} rows={2} className="bg-card border-primary/40 text-right" />
        </Row>

        <Row label="الرموز الشريطية">
          <div className="flex items-center gap-3">
            <button className="text-foreground"><Barcode className="h-7 w-7" strokeWidth={1.5} /></button>
            <button onClick={() => { const c = prompt("أدخل الباركود"); if (c) update({ barcode: c }); }} className="text-foreground">
              <PencilLine className="h-6 w-6" />
            </button>
            <Switch checked={multiBarcode} onCheckedChange={setMultiBarcode} />
            <span className="text-sm">مسح متعدد</span>
            {form.barcode && <span className="text-xs font-mono text-muted-foreground truncate">{form.barcode}</span>}
          </div>
        </Row>
      </main>

      <div className="border-t border-border bg-card p-3">
        <Button onClick={save} disabled={saving} className="w-full h-12 bg-gradient-primary text-primary-foreground font-bold gap-2 rounded-full">
          <Save className="h-5 w-5" /> {saving ? "جارٍ الحفظ..." : "حفظ"}
        </Button>
      </div>
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
