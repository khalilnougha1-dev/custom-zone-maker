import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, Search, Plus, Save, ListX, ScanLine, Minus, Trash2, Package as PackageIcon } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type CartLine = {
  id: string; // unique row id
  product_id: string;
  product_name: string;
  quantity: number; // number of units OR number of cartons (depending on isPackage)
  unit_cost: number; // cost per unit OR cost per carton
  isPackage: boolean;
  packageId?: string | null;
  packageName?: string | null;
  unitsPerPackage?: number | null;
};

interface Props {
  purchaseId?: string; // when set => edit mode
}

export function PurchaseEditor({ purchaseId }: Props) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const isEdit = !!purchaseId;
  const [now, setNow] = useState(new Date());
  const [supplierQ, setSupplierQ] = useState("");
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [showSuppliers, setShowSuppliers] = useState(false);

  const [productQ, setProductQ] = useState("");
  const [products, setProducts] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [showProducts, setShowProducts] = useState(false);

  const [cart, setCart] = useState<CartLine[]>([]);
  const [saving, setSaving] = useState(false);
  const [loadingExisting, setLoadingExisting] = useState(isEdit);

  useEffect(() => { if (!loading && !user) navigate({ to: "/login" }); }, [user, loading, navigate]);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase.from("suppliers").select("*").eq("user_id", user.id).order("name").then(({ data }) => setSuppliers(data || []));
    supabase.from("products").select("*").eq("user_id", user.id).eq("is_inactive", false).order("name").then(({ data }) => setProducts(data || []));
    (supabase as any).from("product_packages").select("*").eq("user_id", user.id).eq("is_inactive", false)
      .then(({ data }: any) => setPackages(data || []));
  }, [user]);

  // Load existing purchase for edit
  useEffect(() => {
    if (!isEdit || !user) return;
    (async () => {
      const { data: p } = await supabase.from("purchases").select("*").eq("id", purchaseId!).maybeSingle();
      if (p) setSupplierId(p.supplier_id || null);
      const { data: items } = await (supabase as any).from("purchase_items").select("*").eq("purchase_id", purchaseId!);
      const lines: CartLine[] = (items || []).map((it: any) => {
        if (it.package_id && it.package_units_count && it.package_qty) {
          const upp = Number(it.package_units_count);
          const qty = Number(it.package_qty);
          const totalUnits = Number(it.quantity);
          const cartonCost = totalUnits > 0 ? (Number(it.total) / qty) : Number(it.unit_cost) * upp;
          return {
            id: `pkg:${it.id}`,
            product_id: it.product_id,
            product_name: it.product_name,
            quantity: qty,
            unit_cost: Number(cartonCost.toFixed(2)),
            isPackage: true,
            packageId: it.package_id,
            packageName: it.package_name || "",
            unitsPerPackage: upp,
          };
        }
        return {
          id: it.id,
          product_id: it.product_id,
          product_name: it.product_name,
          quantity: Number(it.quantity),
          unit_cost: Number(it.unit_cost),
          isPackage: false,
        };
      });
      setCart(lines);
      setLoadingExisting(false);
    })();
  }, [isEdit, purchaseId, user]);

  const supplier = useMemo(() => suppliers.find(s => s.id === supplierId), [suppliers, supplierId]);

  const filteredSuppliers = useMemo(() => {
    const q = supplierQ.trim().toLowerCase();
    if (!q) return suppliers.slice(0, 10);
    return suppliers.filter(s => (s.name || "").toLowerCase().includes(q) || (s.phone || "").includes(q)).slice(0, 10);
  }, [suppliers, supplierQ]);

  // Build unified entries: products + their packages
  const productEntries = useMemo(() => {
    const baseEntries = products.map((p: any) => ({ kind: "product" as const, product: p, pkg: null as any }));
    const pkgEntries = packages
      .map((pk: any) => {
        const product = products.find((p: any) => p.id === pk.product_id);
        return product ? { kind: "package" as const, product, pkg: pk } : null;
      })
      .filter(Boolean) as Array<{ kind: "package"; product: any; pkg: any }>;
    return [...baseEntries, ...pkgEntries];
  }, [products, packages]);

  const filteredEntries = useMemo(() => {
    const q = productQ.trim().toLowerCase();
    const list = !q ? productEntries.slice(0, 12) : productEntries.filter(e => {
      const name = e.kind === "package" ? `${e.product.name} ${e.pkg.name}` : e.product.name;
      const barcode = e.kind === "package" ? (e.pkg.barcode || "") : (e.product.barcode || "");
      const ref = e.product.reference || "";
      return (name || "").toLowerCase().includes(q) || (barcode || "").includes(q) || (ref || "").toLowerCase().includes(q);
    }).slice(0, 12);
    return list;
  }, [productEntries, productQ]);

  const addEntry = (entry: { kind: "product" | "package"; product: any; pkg: any }) => {
    const isPkg = entry.kind === "package";
    const rowId = isPkg ? `pkg:${entry.pkg.id}` : entry.product.id;
    setCart(prev => {
      const existing = prev.find(x => x.id === rowId);
      if (existing) return prev.map(x => x.id === rowId ? { ...x, quantity: x.quantity + 1 } : x);
      if (isPkg) {
        return [...prev, {
          id: rowId,
          product_id: entry.product.id,
          product_name: `${entry.product.name} (${entry.pkg.name})`,
          quantity: 1,
          unit_cost: Number(entry.pkg.cost_price || (Number(entry.product.cost_price || 0) * Number(entry.pkg.units_count || 1))),
          isPackage: true,
          packageId: entry.pkg.id,
          packageName: entry.pkg.name,
          unitsPerPackage: Number(entry.pkg.units_count || 1),
        }];
      }
      return [...prev, {
        id: rowId,
        product_id: entry.product.id,
        product_name: entry.product.name,
        quantity: 1,
        unit_cost: Number(entry.product.cost_price || 0),
        isPackage: false,
      }];
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
      let pid = purchaseId;
      if (isEdit) {
        // delete old items first (triggers will restore stock)
        await supabase.from("purchase_items").delete().eq("purchase_id", pid!);
        await supabase.from("purchases").update({
          supplier_id: supplierId, subtotal: total, total, paid: total,
        }).eq("id", pid!);
      } else {
        const { data: purchase, error: e1 } = await supabase
          .from("purchases")
          .insert({ user_id: user.id, supplier_id: supplierId, subtotal: total, total, paid: total })
          .select()
          .single();
        if (e1) throw e1;
        pid = purchase.id;
      }

      const items = cart.map(l => {
        if (l.isPackage && l.unitsPerPackage) {
          const baseQty = l.quantity * l.unitsPerPackage;
          const baseCost = l.unitsPerPackage > 0 ? l.unit_cost / l.unitsPerPackage : 0;
          return {
            purchase_id: pid,
            product_id: l.product_id,
            product_name: l.product_name,
            quantity: baseQty,
            unit_cost: Number(baseCost.toFixed(4)),
            total: l.quantity * l.unit_cost,
            package_id: l.packageId,
            package_name: l.packageName,
            package_units_count: l.unitsPerPackage,
            package_qty: l.quantity,
          };
        }
        return {
          purchase_id: pid,
          product_id: l.product_id,
          product_name: l.product_name,
          quantity: l.quantity,
          unit_cost: l.unit_cost,
          total: l.quantity * l.unit_cost,
        };
      });
      const { error: e2 } = await (supabase as any).from("purchase_items").insert(items);
      if (e2) throw e2;
      toast.success(isEdit ? "تم تحديث عملية الشراء" : "تم حفظ عملية الشراء");
      navigate({ to: "/app/purchases" });
    } catch (e: any) {
      toast.error(e.message || "فشل الحفظ");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !user || loadingExisting) return <div className="flex min-h-screen items-center justify-center bg-background">...</div>;

  const dateStr = now.toLocaleDateString("fr-FR");
  const timeStr = now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col" dir="rtl">
      <header className="sticky top-0 z-40 bg-gradient-primary text-primary-foreground shadow-md">
        <div className="flex h-14 items-center justify-between px-4">
          <button onClick={() => navigate({ to: "/app/purchases" })} className="rounded-lg p-2 hover:bg-white/10" aria-label="رجوع">
            <ArrowRight className="h-6 w-6" />
          </button>
          <h1 className="text-lg font-bold">{isEdit ? "تعديل عملية الشراء" : "شراء جديد"}</h1>
          <div className="w-10" />
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-5xl p-4 pb-44">
        <div className="flex items-center justify-end gap-4 mb-3 text-sm">
          <span className="text-muted-foreground">التاريخ</span>
          <span className="font-mono text-sky-500 font-semibold">{dateStr}</span>
          <span className="text-muted-foreground">التوقيت</span>
          <span className="font-mono text-sky-500 font-semibold">{timeStr}</span>
        </div>

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
                  <button key={s.id} type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { setSupplierId(s.id); setSupplierQ(""); setShowSuppliers(false); }}
                    className="w-full text-right px-3 py-2 hover:bg-muted text-sm">
                    {s.name}{s.phone && <span className="text-muted-foreground"> — {s.phone}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-3 mb-3">
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setShowProducts(true)}
              className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-foreground/30 text-foreground/70 hover:bg-muted"
              aria-label="إضافة">
              <Plus className="h-5 w-5" />
            </button>
            <div className="relative flex-1">
              <Input placeholder="إبحث عن منتج أو كرطون"
                value={productQ}
                onChange={(e) => { setProductQ(e.target.value); setShowProducts(true); }}
                onFocus={() => setShowProducts(true)}
                onBlur={() => setTimeout(() => setShowProducts(false), 200)}
                className="h-10 bg-transparent border-0 border-b border-foreground/30 rounded-none focus-visible:ring-0 text-right placeholder:text-muted-foreground" />
              {showProducts && filteredEntries.length > 0 && (
                <div className="absolute z-20 mt-1 w-full max-h-72 overflow-auto rounded-xl border border-border bg-card shadow-lg">
                  {filteredEntries.map((e, idx) => {
                    const isPkg = e.kind === "package";
                    const label = isPkg ? `${e.product.name} — ${e.pkg.name} (كرطون ×${e.pkg.units_count})` : e.product.name;
                    const cost = isPkg ? Number(e.pkg.cost_price || 0) : Number(e.product.cost_price || 0);
                    return (
                      <button key={`${e.kind}-${(isPkg ? e.pkg.id : e.product.id)}-${idx}`} type="button"
                        onMouseDown={(ev) => ev.preventDefault()}
                        onClick={() => addEntry(e)}
                        className="w-full text-right px-3 py-2 hover:bg-muted text-sm flex items-center justify-between gap-2">
                        <span className="font-mono text-xs text-muted-foreground">{cost.toFixed(2)}</span>
                        <span className="truncate flex items-center gap-1 justify-end flex-1">
                          {isPkg && <PackageIcon className="h-3 w-3 text-primary" />}
                          {label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {cart.map((l, i) => (
            <div key={l.id} className="rounded-xl bg-card border border-border p-3 shadow-sm">
              <div className="flex items-center justify-between gap-2 mb-2">
                <button onClick={() => removeLine(i)} className="text-destructive p-1" aria-label="حذف"><Trash2 className="h-4 w-4" /></button>
                <div className="font-semibold text-sm text-right flex-1 truncate flex items-center gap-1 justify-end">
                  {l.isPackage && <PackageIcon className="h-4 w-4 text-primary" />}
                  {l.product_name}
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <div>
                  <label className="block text-[10px] text-muted-foreground text-right mb-1">
                    {l.isPackage ? `الكمية (كرطون ×${l.unitsPerPackage})` : "الكمية"}
                  </label>
                  <div className="flex items-center gap-1">
                    <button onClick={() => updateLine(i, { quantity: Math.max(1, l.quantity - 1) })} className="h-8 w-8 rounded bg-muted flex items-center justify-center"><Minus className="h-3 w-3" /></button>
                    <Input type="number" value={l.quantity} onChange={(e) => updateLine(i, { quantity: Number(e.target.value) || 0 })} className="h-8 text-center px-1" />
                    <button onClick={() => updateLine(i, { quantity: l.quantity + 1 })} className="h-8 w-8 rounded bg-muted flex items-center justify-center"><Plus className="h-3 w-3" /></button>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-muted-foreground text-right mb-1">{l.isPackage ? "سعر الكرطون" : "سعر الشراء"}</label>
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

      <button
        onClick={() => toast.info("استخدم حقل البحث لمسح الباركود")}
        className="fixed bottom-44 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-linear-to-br from-red-600 to-red-700 text-white shadow-2xl hover:scale-110 transition active:scale-95"
        aria-label="مسح باركود">
        <ScanLine className="h-6 w-6" />
      </button>

      <div className="fixed bottom-16 left-0 right-0 z-20 border-t border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
          <div className="font-mono text-3xl font-bold text-[#1a237e] tabular-nums"
            style={{ fontFamily: '"DS-Digital", "Courier New", monospace', letterSpacing: "0.05em" }}>
            {total.toFixed(2)}
          </div>
          <div className="flex-1 text-right">
            <div className="text-base font-bold">المجموع</div>
            <div className="text-xs text-muted-foreground mt-0.5">{totalCount} عنصر</div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-card grid grid-cols-2">
        <button onClick={save} disabled={saving}
          className="flex items-center justify-center gap-2 py-4 text-foreground hover:bg-muted disabled:opacity-50">
          <Save className="h-5 w-5" />
        </button>
        <button onClick={clearAll}
          className="flex items-center justify-center gap-2 py-4 text-foreground hover:bg-muted border-r border-border">
          <ListX className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
