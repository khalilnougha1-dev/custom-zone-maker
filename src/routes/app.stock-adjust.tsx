import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PosLayout } from "@/components/pos/PosLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/stock-adjust")({ component: StockAdjustPage });

function StockAdjustPage() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [products, setProducts] = useState<any[]>([]);
  const [productId, setProductId] = useState("");
  const [direction, setDirection] = useState<"in" | "out">("in");
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("products").select("id,name,stock_quantity").eq("user_id", user.id).order("name")
      .then(({ data }) => setProducts(data || []));
  }, [user]);

  const selected = products.find(p => p.id === productId);

  async function save() {
    if (!user) return;
    if (!productId) return toast.error("اختر المنتج");
    const n = Number(qty);
    if (!n || n <= 0) return toast.error("أدخل كمية صحيحة");
    if (!reason.trim()) return toast.error("أدخل سبب الحركة");

    const change = direction === "in" ? n : -n;
    if (selected && direction === "out" && Number(selected.stock_quantity) < n) {
      return toast.error("الكمية أكبر من المخزون المتاح");
    }

    setSaving(true);
    const newStock = Number(selected?.stock_quantity || 0) + change;
    const { error: e1 } = await supabase.from("products")
      .update({ stock_quantity: newStock, updated_at: new Date().toISOString() })
      .eq("id", productId);
    if (e1) { setSaving(false); return toast.error(e1.message); }

    const { error: e2 } = await supabase.from("stock_movements").insert({
      user_id: user.id,
      product_id: productId,
      product_name: selected?.name || "",
      movement_type: "adjustment",
      quantity_change: change,
      reference_type: "manual",
      notes: reason.trim(),
    });
    setSaving(false);
    if (e2) return toast.error(e2.message);
    toast.success("تم تسجيل الحركة");
    nav({ to: "/app/stock-movements" });
  }

  return (
    <PosLayout title="تعديل يدوي للمخزون">
      <div className="space-y-4 max-w-xl mx-auto pb-20">
        <div className="space-y-2">
          <Label className="text-right block">المنتج</Label>
          <Select value={productId} onValueChange={setProductId}>
            <SelectTrigger className="bg-card border-primary/40 h-12 text-right" dir="rtl">
              <SelectValue placeholder="اختر المنتج" />
            </SelectTrigger>
            <SelectContent dir="rtl">
              {products.map(p => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name} ({Number(p.stock_quantity)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-right block">نوع الحركة</Label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setDirection("in")}
              className={`h-12 rounded-md border ${direction === "in" ? "bg-success text-white border-success" : "bg-card border-border"}`}
            >إضافة (+)</button>
            <button
              onClick={() => setDirection("out")}
              className={`h-12 rounded-md border ${direction === "out" ? "bg-destructive text-white border-destructive" : "bg-card border-border"}`}
            >خصم (−)</button>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-right block">الكمية</Label>
          <Input type="number" inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} className="h-12 text-right bg-card border-primary/40" />
        </div>

        <div className="space-y-2">
          <Label className="text-right block">سبب الحركة</Label>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="مثال: جرد، تالف، هدية..." className="h-12 text-right bg-card border-primary/40" />
        </div>

        <Button onClick={save} disabled={saving} className="w-full h-12 text-base">
          {saving ? "جاري الحفظ..." : "حفظ الحركة"}
        </Button>
      </div>
    </PosLayout>
  );
}
