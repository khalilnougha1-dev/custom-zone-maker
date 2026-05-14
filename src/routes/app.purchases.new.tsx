import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Search, Plus, Save, ListX, ScanLine, Minus, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/app/purchases/new")({ component: NewPurchasePage });

type CartLine = {
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_cost: number;
};

function NewPurchasePage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [now, setNow] = useState(new Date());
  const [supplierQ, setSupplierQ] = useState("");
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [showSuppliers, setShowSuppliers] = useState(false);

  const [productQ, setProductQ] = useState("");
  const [products, setProducts] = useState<any[]>([]);
  const [showProducts, setShowProducts] = useState(false);

  const [cart, setCart] = useState<CartLine[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (!loading && !user) navigate({ to: "/login" }); }, [user, loading, navigate]);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase.from("suppliers").select("*").eq("user_id", user.id).order("name").then(({ data }) => setSuppliers(data || []));
    supabase.from("products").select("*").eq("user_id", user.id).eq("is_inactive", false).order("name").then(({ data }) => setProducts(data || []));
  }, [user]);

  const supplier = useMemo(() => suppliers.find(s => s.id === supplierId), [suppliers, supplierId]);

  const filteredSuppliers = useMemo(() => {
    const q = supplierQ.trim().toLowerCase();
    if (!q) return suppliers.slice(0, 10);
    return suppliers.filter(s => (s.name || "").toLowerCase().includes(q) || (s.phone || "").includes(q)).slice(0, 10);
  }, [suppliers, supplierQ]);

  const filteredProducts = useMemo(() => {
    const q = productQ.trim().toLowerCase();
    if (!q) return products.slice(0, 10);
    return products.filter(p =>
      (p.name || "").toLowerCase().includes(q) ||
      (p.barcode || "").includes(q) ||
      (p.reference || "").toLowerCase().includes(q)
    ).slice(0, 10);
  }, [products, productQ]);

  const addProduct = (p: any) => {
    setCart(prev => {
      const existing = prev.find(x => x.product_id === p.id);
      if (existing) {
        return prev.map(x => x.product_id === p.id ? { ...x, quantity: x.quantity + 1 } : x);
      }
      return [...prev, { product_id: p.id, product_name: p.name, quantity: 1, unit_cost: Number(p.cost_price || 0) }];
    });
    setProductQ("");
    setShowProducts(false);
  };

  const updateLine = (i: number, patch: Partial<CartLine>) => {
    setCart(prev => prev.map((l, idx) => idx === i ? { ...l, ...patch } : l));
  };
  const removeLine = (i: number) => setCart(prev => prev.filter((_, idx) => idx !== i));

  const totalCount = cart.reduce((s, l) => s + l.quantity, 0);
  const total = cart.reduce((s, l) => s + l.quantity * l.unit_cost, 0);

  const clearAll = () => {
    if (cart.length === 0) return;
    if (confirm("مسح كل المنتجات؟")) setCart([]);
  };

  const save = async () => {
    if (!user) return;
    if (cart.length === 0) { toast.error("أضف منتجات أولا"); return; }
    setSaving(true);
    try {
      const { data: purchase, error: e1 } = await supabase
        .from("purchases")
        .insert({ user_id: user.id, supplier_id: supplierId, subtotal: total, total, paid: total })
        .select()
        .single();
      if (e1) throw e1;
      const items = cart.map(l => ({
        purchase_id: purchase.id,
        product_id: l.product_id,
        product_name: l.product_name,
        quantity: l.quantity,
        unit_cost: l.unit_cost,
        total: l.quantity * l.unit_cost,
      }));
      const { error: e2 } = await supabase.from("purchase_items").insert(items);
      if (e2) throw e2;
      toast.success("تم حفظ عملية الشراء");
      navigate({ to: "/app/purchases" });
    } catch (e: any) {
      toast.error(e.message || "فشل الحفظ");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !user) return <div className="flex min-h-screen items-center justify-center bg-background">...</div>;

  const dateStr = now.toLocaleDateString("fr-FR");
  const timeStr = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-gradient-primary text-primary-foreground shadow-md">
        <div className="flex h-14 items-center justify-between px-4">
          <button onClick={() => navigate({ to: "/app/purchases" })} className="rounded-lg p-2 hover:bg-white/10" aria-label="رجوع">
            <ArrowRight className="h-6 w-6" />
          </button>
          <h1 className="text-lg font-bold">شراء جديد</h1>
          <div className="w-10" />
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-5xl p-4 pb-44">
        {/* Date / time */}
        <div className="flex items-center justify-end gap-4 mb-3 text-sm">
          <span className="text-muted-foreground">التاريخ</span>
          <span className="font-mono text-sky-500 font-semibold">{dateStr}</span>
          <span className="text-muted-foreground">التوقيت</span>
          <span className="font-mono text-sky-500 font-semibold">{timeStr}</span>
        </div>

        {/* Supplier */}
        <div className="flex items-center gap-3 mb-3">
          <span className="text-sm font-semibold text-foreground/80 w-16 text-right">الممون</span>
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={supplier ? supplier.name : supplierQ}
              onChange={(e) => { setSupplierQ(e.target.value); setSupplierId(null); setShowSuppliers(true); }}
              onFocus={() => setShowSuppliers(true)}
              onBlur={() => setTimeout(() => setShowSuppliers(false), 200)}
              className="pr-10 h-12 bg-card border-primary/40 text-right"
            />
            {showSuppliers && filteredSuppliers.length > 0 && (
              <div className="absolute z-20 mt-1 w-full max-h-64 overflow-auto rounded-xl border border-border bg-card shadow-lg">
                {filteredSuppliers.map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { setSupplierId(s.id); setSupplierQ(""); setShowSuppliers(false); }}
                    className="w-full text-right px-3 py-2 hover:bg-muted text-sm"
                  >
                    {s.name}{s.phone && <span className="text-muted-foreground"> — {s.phone}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Product search */}
        <div className="rounded-xl border border-border bg-card p-3 mb-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowProducts(true)}
              className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-foreground/30 text-foreground/70 hover:bg-muted"
              aria-label="إضافة"
            >
              <Plus className="h-5 w-5" />
            </button>
            <div className="relative flex-1">
              <Input
                placeholder="إبحث عن منتج"
                value={productQ}
                onChange={(e) => { setProductQ(e.target.value); setShowProducts(true); }}
                onFocus={() => setShowProducts(true)}
                onBlur={() => setTimeout(() => setShowProducts(false), 200)}
                className="h-10 bg-transparent border-0 border-b border-foreground/30 rounded-none focus-visible:ring-0 text-right placeholder:text-muted-foreground"
              />
              {showProducts && filteredProducts.length > 0 && (
                <div className="absolute z-20 mt-1 w-full max-h-72 overflow-auto rounded-xl border border-border bg-card shadow-lg">
                  {filteredProducts.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => addProduct(p)}
                      className="w-full text-right px-3 py-2 hover:bg-muted text-sm flex items-center justify-between gap-2"
                    >
                      <span className="font-mono text-xs text-muted-foreground">{Number(p.cost_price || 0).toFixed(2)}</span>
                      <span className="truncate">{p.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Cart lines */}
        <div className="space-y-2">
          {cart.map((l, i) => (
            <div key={i} className="rounded-xl bg-card border border-border p-3 shadow-sm">
              <div className="flex items-center justify-between gap-2 mb-2">
                <button onClick={() => removeLine(i)} className="text-destructive p-1" aria-label="حذف"><Trash2 className="h-4 w-4" /></button>
                <div className="font-semibold text-sm text-right flex-1 truncate">{l.product_name}</div>
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <div>
                  <label className="block text-[10px] text-muted-foreground text-right mb-1">الكمية</label>
                  <div className="flex items-center gap-1">
                    <button onClick={() => updateLine(i, { quantity: Math.max(1, l.quantity - 1) })} className="h-8 w-8 rounded bg-muted flex items-center justify-center"><Minus className="h-3 w-3" /></button>
                    <Input type="number" value={l.quantity} onChange={(e) => updateLine(i, { quantity: Number(e.target.value) || 0 })} className="h-8 text-center px-1" />
                    <button onClick={() => updateLine(i, { quantity: l.quantity + 1 })} className="h-8 w-8 rounded bg-muted flex items-center justify-center"><Plus className="h-3 w-3" /></button>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-muted-foreground text-right mb-1">سعر الشراء</label>
                  <Input type="number" value={l.unit_cost} onChange={(e) => updateLine(i, { unit_cost: Number(e.target.value) || 0 })} className="h-8 text-right" />
                </div>
                <div>
                  <label className="block text-[10px] text-muted-foreground text-right mb-1">المجموع</label>
                  <div className="h-8 flex items-center justify-end font-mono font-bold text-primary">{(l.quantity * l.unit_cost).toFixed(2)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Floating barcode button */}
      <button
        onClick={() => toast.info("استخدم حقل البحث لمسح الباركود")}
        className="fixed bottom-44 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-linear-to-br from-red-600 to-red-700 text-white shadow-2xl hover:scale-110 transition active:scale-95"
        aria-label="مسح باركود"
      >
        <ScanLine className="h-6 w-6" />
      </button>

      {/* Total bar */}
      <div className="fixed bottom-16 left-0 right-0 z-20 border-t border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
          <div
            className="font-mono text-3xl font-bold text-[#1a237e] tabular-nums"
            style={{ fontFamily: '"DS-Digital", "Courier New", monospace', letterSpacing: "0.05em" }}
          >
            {total.toFixed(2)}
          </div>
          <div className="flex-1 text-right">
            <div className="text-base font-bold">المجموع</div>
            <div className="text-xs text-muted-foreground mt-0.5">{totalCount} المنتجات</div>
          </div>
        </div>
      </div>

      {/* Bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-card grid grid-cols-2">
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center justify-center gap-2 py-4 text-foreground hover:bg-muted disabled:opacity-50"
        >
          <Save className="h-5 w-5" />
        </button>
        <button
          onClick={clearAll}
          className="flex items-center justify-center gap-2 py-4 text-foreground hover:bg-muted border-r border-border"
        >
          <ListX className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
