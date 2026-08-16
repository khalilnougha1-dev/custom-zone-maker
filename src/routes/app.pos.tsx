import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Search, ArrowRight, Calculator, ListChecks, ScanLine,
  ListPlus, Save, ListX, Plus, Minus, X,
  Banknote, CreditCard, Receipt as ReceiptIcon, Smartphone,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { printReceipt as printReceiptHtml } from "@/lib/print-receipt";
import { getActivePrinter } from "@/lib/printer-config";

export const Route = createFileRoute("/app/pos")({
  component: NewSalePage,
  validateSearch: (search: Record<string, unknown>) => ({
    edit: typeof search.edit === "string" ? search.edit : undefined,
  }),
});

type CartItem = {
  id: string; // unique row id (product id, or `pkg:<packageId>`)
  productId: string;
  name: string;
  price: number;
  cost: number;
  qty: number;
  packageId?: string;
  packageName?: string;
  unitsPerPackage?: number; // when set, this is a package row
};

function NewSalePage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { edit: editSaleId } = Route.useSearch();
  const isEditMode = !!editSaleId;

  const [now, setNow] = useState({ date: "", time: "" });
  const [products, setProducts] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerQ, setCustomerQ] = useState("");
  const [productQ, setProductQ] = useState("");
  const [showCustomerList, setShowCustomerList] = useState(false);
  const [showProductList, setShowProductList] = useState(false);
  const [browseAll, setBrowseAll] = useState(false);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [qtyDraft, setQtyDraft] = useState<Record<string, string>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [paid, setPaid] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "check" | "card" | "phone">("cash");
  const [note, setNote] = useState("");
  const [originalUnits, setOriginalUnits] = useState<Record<string, number>>({});
  const [editLoaded, setEditLoaded] = useState(false);
  const productInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      setNow({
        date: `${dd}/${mm}/${d.getFullYear()}`,
        time: d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
      });
    };
    tick();
    const i = setInterval(tick, 30_000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase.from("products").select("*").eq("user_id", user.id).order("name")
      .then(({ data }) => setProducts(data || []));
    supabase.from("customers").select("id,name,phone").eq("user_id", user.id).order("name")
      .then(({ data }) => setCustomers(data || []));
    (supabase as any).from("product_packages")
      .select("id,product_id,name,units_count,retail_price,cost_price,barcode,is_inactive")
      .eq("user_id", user.id)
      .then(({ data }: any) => setPackages((data || []).filter((p: any) => !p.is_inactive)));
  }, [user]);

  // Load existing sale into cart when in edit mode
  useEffect(() => {
    if (!user || !editSaleId || editLoaded) return;
    if (products.length === 0) return; // wait for products
    (async () => {
      const { data: sale } = await supabase.from("sales").select("*").eq("id", editSaleId).maybeSingle();
      if (!sale) { toast.error("الفاتورة غير موجودة"); return; }
      const { data: items } = await supabase.from("sale_items").select("*").eq("sale_id", editSaleId);
      const loadedCart: CartItem[] = [];
      const orig: Record<string, number> = {};
      for (const it of (items || []) as any[]) {
        const product = products.find((p: any) => p.id === it.product_id);
        if (!product) continue;
        const units = Number(it.quantity);
        orig[it.product_id] = (orig[it.product_id] || 0) + units;
        if (it.package_id && it.package_units_count && it.package_qty) {
          const upp = Number(it.package_units_count);
          const qty = Number(it.package_qty);
          loadedCart.push({
            id: `pkg:${it.package_id}`,
            productId: it.product_id,
            name: it.product_name,
            price: Number(it.unit_price) * upp,
            cost: Number(it.cost_price || 0) * upp,
            qty,
            packageId: it.package_id,
            packageName: it.package_name || "",
            unitsPerPackage: upp,
          });
        } else {
          loadedCart.push({
            id: it.product_id,
            productId: it.product_id,
            name: it.product_name,
            price: Number(it.unit_price),
            cost: Number(it.cost_price || 0),
            qty: units,
          });
        }
      }
      setCart(loadedCart);
      setOriginalUnits(orig);
      setPaid(String(Number(sale.paid || 0)));
      setPaymentMethod((sale.payment_method as any) || "cash");
      setNote(sale.notes || "");
      if (sale.customer_id) {
        setCustomerId(sale.customer_id);
        const { data: c } = await supabase.from("customers").select("name").eq("id", sale.customer_id).maybeSingle();
        if (c) setCustomerQ(c.name);
      }
      setEditLoaded(true);
    })();
  }, [user, editSaleId, products, editLoaded]);

  const filteredCustomers = useMemo(() => {
    const q = customerQ.toLowerCase().trim();
    if (!q) return customers.slice(0, 20);
    return customers.filter((c: any) =>
      c.name?.toLowerCase().includes(q) || (c.phone || "").includes(q)
    ).slice(0, 20);
  }, [customers, customerQ]);

  // Build a unified search list of products + their packages (cartons).
  const searchEntries = useMemo(() => {
    const productEntries = products.map((p: any) => ({ kind: "product" as const, product: p, pkg: null as any }));
    const pkgEntries = packages.map((pk: any) => {
      const product = products.find((p: any) => p.id === pk.product_id);
      return product ? { kind: "package" as const, product, pkg: pk } : null;
    }).filter(Boolean) as Array<{ kind: "package"; product: any; pkg: any }>;
    return [...productEntries, ...pkgEntries];
  }, [products, packages]);

  const filteredProducts = useMemo(() => {
    const q = productQ.toLowerCase().trim();
    const match = (e: any) => {
      if (!q) return true;
      const name = e.kind === "package" ? `${e.product.name} ${e.pkg.name}` : e.product.name;
      const barcode = e.kind === "package" ? (e.pkg.barcode || "") : (e.product.barcode || "");
      return (
        name?.toLowerCase().includes(q) ||
        (barcode || "").includes(q) ||
        (e.product.reference || "").toLowerCase().includes(q)
      );
    };
    return searchEntries.filter(match).slice(0, 40);
  }, [searchEntries, productQ]);

  const totalAmount = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const totalUnits = cart.reduce((s, i) => s + i.qty * (i.unitsPerPackage || 1), 0);

  const totalLines = cart.length;

  const getStock = (productId: string) => {
    const p = products.find((x: any) => x.id === productId);
    const base = p ? Number(p.stock_quantity) : 0;
    return base + (originalUnits[productId] || 0);
  };
  const isTracked = (productId: string) => {
    const p = products.find((x: any) => x.id === productId);
    return p ? (p.is_tracked !== false) : true;
  };

  // Total units of a product currently held in cart (counting packages × unitsPerPackage)
  const unitsInCartFor = (productId: string, exceptRowId?: string) =>
    cart
      .filter((i) => i.productId === productId && i.id !== exceptRowId)
      .reduce((s, i) => s + i.qty * (i.unitsPerPackage || 1), 0);

  const addEntry = (entry: { kind: "product" | "package"; product: any; pkg: any }) => {
    const { product, pkg } = entry;
    const isPkg = entry.kind === "package";
    const rowId = isPkg ? `pkg:${pkg.id}` : product.id;
    const unitsPerPackage = isPkg ? Number(pkg.units_count) || 1 : 1;
    const tracked = product.is_tracked !== false;
    const stock = Number(product.stock_quantity) || 0;
    const usedUnits = unitsInCartFor(product.id);
    if (tracked && usedUnits + unitsPerPackage > stock) {
      return toast.error(`المخزون غير كافٍ (المتبقي ${stock})`);
    }
    setCart((prev) => {
      const found = prev.find((i) => i.id === rowId);
      if (found) return prev.map((i) => (i.id === rowId ? { ...i, qty: i.qty + 1 } : i));
      const row: CartItem = {
        id: rowId,
        productId: product.id,
        name: isPkg ? `${product.name} [${pkg.name}]` : product.name,
        price: Number(isPkg ? pkg.retail_price : product.retail_price) || 0,
        cost: Number(isPkg ? pkg.cost_price : product.cost_price) || 0,
        qty: 1,
        ...(isPkg
          ? { packageId: pkg.id, packageName: pkg.name, unitsPerPackage }
          : {}),
      };
      return [...prev, row];
    });
    setProductQ("");
    setShowProductList(false);
    productInputRef.current?.focus();
  };

  const setQty = (rowId: string, qty: number) => {
    const row = cart.find((i) => i.id === rowId);
    if (!row) return;
    if (qty <= 0) return setCart((prev) => prev.filter((i) => i.id !== rowId));
    const unitsPerPackage = row.unitsPerPackage || 1;
    if (isTracked(row.productId)) {
      const wouldUse = unitsInCartFor(row.productId, rowId) + qty * unitsPerPackage;
      if (wouldUse > getStock(row.productId)) {
        return toast.error(`المخزون غير كافٍ (المتبقي ${getStock(row.productId)})`);
      }
    }
    setCart((prev) => prev.map((i) => (i.id === rowId ? { ...i, qty } : i)));
  };

  const clearCart = () => {
    if (cart.length === 0) return;
    setCart([]);
    setCustomerId(null);
    setCustomerQ("");
    toast.success("تم تفريغ القائمة");
  };

  const openConfirm = () => {
    if (cart.length === 0) return toast.error("السلة فارغة");
    setPaid("0");
    setPaymentMethod("cash");
    setNote("");
    setConfirmOpen(true);
  };

  // print moved to shared lib (src/lib/print-receipt.ts)

  const save = async () => {
    if (!user || cart.length === 0 || isSaving) return;

    setIsSaving(true);
    let preparedBluetoothPrinterId: string | null = null;
    try {
      // Aggregate units per product across all cart rows (incl. packages) for stock check
      const usedByProduct = new Map<string, number>();
      for (const i of cart) {
        const u = i.qty * (i.unitsPerPackage || 1);
        usedByProduct.set(i.productId, (usedByProduct.get(i.productId) || 0) + u);
      }
      for (const [pid, units] of usedByProduct) {
        if (isTracked(pid) && units > getStock(pid)) {
          const name = products.find((p: any) => p.id === pid)?.name || "";
          toast.error(`المخزون غير كافٍ للمنتج ${name} (المتبقي ${getStock(pid)})`);
          return;
        }
      }

      const activePrinter = getActivePrinter();
      if (activePrinter?.connection === "bluetooth") {
        try {
          const { isWebBluetoothSupported, prepareBluetoothPrinter } = await import("@/lib/bt-printer");
          if (isWebBluetoothSupported()) {
            const preparedPrinter = await prepareBluetoothPrinter({ promptIfMissing: true });
            preparedBluetoothPrinterId = preparedPrinter?.id || null;
          }
        } catch (error) {
          const msg = (error as Error).message || "تعذر تجهيز الطابعة";
          if (!msg.toLowerCase().includes("cancel")) {
            toast.error(msg);
          }
          return;
        }
      }

      let saleRow: any;
      if (isEditMode && editSaleId) {
        const { data: sale, error } = await supabase.from("sales").update({
          customer_id: customerId,
          subtotal: totalAmount,
          total: totalAmount,
          paid: Number(paid) || 0,
          payment_method: paymentMethod,
          notes: note || null,
        }).eq("id", editSaleId).select().single();
        if (error || !sale) { toast.error(error?.message || "خطأ"); return; }
        saleRow = sale;
        const { error: eDel } = await supabase.from("sale_items").delete().eq("sale_id", editSaleId);
        if (eDel) { toast.error(eDel.message); return; }
      } else {
        const invoiceNumber = `INV-${Date.now()}`;
        const { data: sale, error } = await supabase.from("sales").insert({
          user_id: user.id,
          customer_id: customerId,
          subtotal: totalAmount,
          total: totalAmount,
          paid: Number(paid) || 0,
          payment_method: paymentMethod,
          notes: note || null,
          invoice_number: invoiceNumber,
        }).select().single();
        if (error || !sale) { toast.error(error?.message || "خطأ"); return; }
        saleRow = sale;
      }

      const items = cart.map((i) => {
        const units = i.qty * (i.unitsPerPackage || 1);
        const unitPrice = i.unitsPerPackage ? i.price / i.unitsPerPackage : i.price;
        const unitCost = i.unitsPerPackage ? i.cost / i.unitsPerPackage : i.cost;
        return {
          sale_id: saleRow.id,
          product_id: i.productId,
          product_name: i.name,
          quantity: units,
          unit_price: unitPrice,
          cost_price: unitCost,
          total: i.price * i.qty,
          ...(i.unitsPerPackage
            ? {
                package_id: i.packageId,
                package_name: i.packageName,
                package_units_count: i.unitsPerPackage,
                package_qty: i.qty,
              }
            : {}),
        };
      });
      const { error: e2 } = await supabase.from("sale_items").insert(items);
      if (e2) {
        toast.error(e2.message);
        return;
      }

      if (isEditMode) {
        toast.success("تم تحديث الفاتورة");
        setConfirmOpen(false);
        navigate({ to: "/app/sales/$saleId", params: { saleId: editSaleId! } });
        return;
      }

      toast.success(`✅ تم البيع — ${totalAmount.toFixed(2)}`);
      const { count } = await supabase.from("sales").select("id", { count: "exact", head: true }).eq("user_id", user.id);
      await printReceiptHtml({
        userId: user.id,
        saleSeq: count || 1,
        customerId,
        customerName: customers.find((c: any) => c.id === customerId)?.name || "—",
        items: cart.map(i => ({
          product_name: i.name,
          quantity: i.qty * (i.unitsPerPackage || 1),
          unit_price: i.unitsPerPackage ? i.price / i.unitsPerPackage : i.price,
          package_qty: i.unitsPerPackage ? i.qty : null,
          package_units_count: i.unitsPerPackage || null,
        })),
        total: totalAmount,
        paid: Number(paid) || 0,
        note,
        createdAt: saleRow.created_at,
        preparedBluetoothPrinterId,
      });

      setCart([]); setPaid(""); setNote(""); setCustomerId(null); setCustomerQ("");
      setConfirmOpen(false);
      supabase.from("products").select("*").eq("user_id", user.id).order("name")
        .then(({ data }) => setProducts(data || []));
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center bg-background">...</div>;
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-muted/30 flex flex-col" dir="rtl">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-gradient-primary text-primary-foreground shadow-md">
        <div className="flex h-14 items-center justify-between gap-2 px-3 sm:px-4">
          <button
            onClick={() => navigate({ to: "/app/sales" })}
            className="shrink-0 rounded-lg p-2 hover:bg-white/10 transition"
            aria-label="رجوع"
          >
            <ArrowRight className="h-6 w-6" />
          </button>
          <h1 className="min-w-0 truncate text-center text-base sm:text-lg font-bold">{isEditMode ? "تعديل عملية بيع" : "بيع جديد"}</h1>
          <button
            onClick={openConfirm}
            className="shrink-0 rounded-lg p-2 hover:bg-white/10 transition"
            aria-label="حاسبة"
          >
            <Calculator className="h-6 w-6" />
          </button>
        </div>
      </header>

      <main className="flex-1 w-full max-w-3xl mx-auto px-3 sm:px-4 pt-3 pb-32">
        {/* Date & time */}
        <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1 text-xs sm:text-sm mb-3">
          <span className="text-muted-foreground">التوقيت <span className="text-sky-500 font-mono">{now.time}</span></span>
          <span className="text-muted-foreground">التاريخ <span className="text-sky-500 font-mono">{now.date}</span></span>
        </div>

        {/* Customer */}
        <div className="flex items-center gap-2 sm:gap-3 mb-3">
          <span className="shrink-0 text-sm font-semibold w-12 sm:w-14 text-right">الزبون</span>

          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={customerQ}
              onChange={(e) => { setCustomerQ(e.target.value); setShowCustomerList(true); setCustomerId(null); }}
              onFocus={() => setShowCustomerList(true)}
              className="pr-10 h-12 bg-card border-primary/40 text-right"
            />
            {showCustomerList && (filteredCustomers.length > 0 || (customerQ.trim() && !customerId)) && (
              <div className="absolute top-full left-0 right-0 mt-1 z-30 max-h-64 overflow-y-auto rounded-lg border border-border bg-card shadow-xl">
                {customerQ.trim() && !filteredCustomers.some((c: any) => c.name?.toLowerCase() === customerQ.trim().toLowerCase()) && (
                  <button
                    onClick={async () => {
                      const name = customerQ.trim();
                      if (!name || !user) return;
                      const { data, error } = await supabase
                        .from("customers")
                        .insert({ user_id: user.id, name })
                        .select("id,name,phone")
                        .single();
                      if (error || !data) { toast.error(error?.message || "خطأ"); return; }
                      setCustomers((prev) => [data, ...prev]);
                      setCustomerId(data.id);
                      setCustomerQ(data.name);
                      setShowCustomerList(false);
                      toast.success("تمت إضافة الزبون");
                    }}
                    className="w-full text-right px-3 py-2 text-sm bg-primary/10 hover:bg-primary/20 border-b border-border font-semibold text-primary"
                  >
                    + إضافة زبون جديد: «{customerQ.trim()}»
                  </button>
                )}
                {filteredCustomers.map((c: any) => (
                  <button
                    key={c.id}
                    onClick={() => { setCustomerId(c.id); setCustomerQ(c.name); setShowCustomerList(false); }}
                    className="w-full text-right px-3 py-2 text-sm hover:bg-muted border-b border-border last:border-0"
                  >
                    {c.name}{c.phone && <span className="text-xs text-muted-foreground"> — {c.phone}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Product search */}
        <div className="rounded-xl bg-card border border-border p-3 mb-3 shadow-sm">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => { setBrowseAll((v) => !v); setShowProductList(true); }}
              className={`shrink-0 rounded-lg p-1 transition ${browseAll ? "text-primary bg-primary/10" : "text-foreground/80 hover:bg-muted"}`}
              aria-label="عرض كل المنتجات"
            >
              <ListChecks className="h-6 w-6 sm:h-7 sm:w-7" />
            </button>
            <Input
              ref={productInputRef}
              value={productQ}
              onChange={(e) => { setProductQ(e.target.value); setShowProductList(true); }}
              onFocus={() => setShowProductList(true)}
              placeholder="إبحث عن منتج"
              className="min-w-0 flex-1 border-0 border-b border-foreground/40 rounded-none bg-transparent text-right focus-visible:ring-0 focus-visible:border-primary"
            />
          </div>
          {showProductList && (productQ || browseAll) && filteredProducts.length > 0 && (

            <div className="mt-2 max-h-64 overflow-y-auto rounded-lg border border-border bg-background">
              {filteredProducts.map((e: any) => {
                const isPkg = e.kind === "package";
                const price = Number(isPkg ? e.pkg.retail_price : e.product.retail_price);
                const label = isPkg
                  ? `${e.product.name} — كرطون ${e.pkg.name} (${e.pkg.units_count})`
                  : e.product.name;
                const key = isPkg ? `pkg:${e.pkg.id}` : e.product.id;
                return (
                  <button
                    key={key}
                    onClick={() => addEntry(e)}
                    className={`w-full text-right px-3 py-2 text-sm hover:bg-muted border-b border-border last:border-0 flex items-center justify-between gap-2 ${isPkg ? "bg-primary/5" : ""}`}
                  >
                    <span className="font-mono font-bold text-primary">{price.toFixed(2)}</span>
                    <span className="flex-1 truncate">{label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Display panel — black with green digits */}
        <div className="overflow-hidden rounded-xl bg-[#1f1f1f] text-white p-3 sm:p-4 shadow-card">
          <div className="flex items-center justify-between gap-2 sm:gap-3">
            <div
              className="min-w-0 flex-1 truncate font-mono font-bold text-green-400 tabular-nums tracking-tight text-[clamp(1.75rem,10vw,3rem)] leading-none"
              style={{ textShadow: "0 0 8px rgba(74,222,128,0.45)" }}
            >
              {totalAmount.toFixed(2)}
            </div>
            <div className="shrink-0 text-right space-y-1">
              <div className="text-sm sm:text-base font-bold">المجموع</div>
              <div className="text-xs sm:text-sm flex items-center justify-end gap-2">
                <span className="font-mono text-green-400">{totalLines}</span>
                <span className="text-white/80">المنتجات</span>
              </div>
              <div className="text-xs sm:text-sm flex items-center justify-end gap-2">
                <span className="font-mono text-green-400">{totalUnits}</span>
                <span className="text-white/80">المواد</span>
              </div>
            </div>
          </div>
        </div>

        {/* Cart items list */}
        {cart.length > 0 && (
          <div className="mt-3 space-y-2">
            {cart.map(i => (
              <div key={i.id} className="flex items-center gap-2 rounded-lg bg-card border border-border p-2 shadow-sm">
                <button onClick={() => setQty(i.id, 0)} className="shrink-0 text-destructive p-1" aria-label="حذف"><X className="h-4 w-4" /></button>
                <div className="shrink-0 font-mono font-bold text-primary w-[4.5rem] sm:w-20 text-left text-sm sm:text-base">{(i.price * i.qty).toFixed(2)}</div>

                <Input
                  type="text"
                  inputMode="decimal"
                  value={qtyDraft[i.id] ?? String(i.qty)}
                  onChange={(e) => {
                    const v = e.target.value.replace(",", ".");
                    if (!/^\d*\.?\d*$/.test(v)) return;
                    setQtyDraft(prev => ({ ...prev, [i.id]: v }));
                    if (v === "" || v === ".") return;
                    const n = Number(v);
                    if (!Number.isFinite(n) || n < 0) return;
                    const unitsPerPackage = i.unitsPerPackage || 1;
                    if (isTracked(i.productId)) {
                      const wouldUse = unitsInCartFor(i.productId, i.id) + n * unitsPerPackage;
                      if (wouldUse > getStock(i.productId)) {
                        return toast.error(`المخزون غير كافٍ (المتبقي ${getStock(i.productId)})`);
                      }
                    }
                    setCart(prev => prev.map(x => x.id === i.id ? { ...x, qty: n } : x));
                  }}
                  onBlur={() => {
                    setQtyDraft(prev => { const { [i.id]: _, ...rest } = prev; return rest; });
                    if (i.qty <= 0) setCart(prev => prev.filter(x => x.id !== i.id));
                  }}
                  className="w-16 h-8 text-center font-mono font-bold px-1"
                />
                <div className="flex-1 truncate text-right text-sm">
                  {i.name}
                  {i.unitsPerPackage && (
                    <span className="text-xs text-muted-foreground mr-1">({i.qty}×{i.unitsPerPackage})</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Floating barcode button */}
      <button
        onClick={() => toast.info("شغّل الكاميرا لمسح الباركود")}
        className="fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-linear-to-br from-red-600 to-red-700 text-white shadow-2xl hover:scale-110 transition active:scale-95"
        aria-label="مسح الباركود"
      >
        <ScanLine className="h-6 w-6" />
      </button>

      {/* Bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-card/95 backdrop-blur">
        <div className="mx-auto grid max-w-5xl grid-cols-3">
          <button
            onClick={() => productInputRef.current?.focus()}
            className="flex items-center justify-center py-4 hover:bg-muted/50 transition"
            aria-label="إضافة سطر"
          >
            <ListPlus className="h-7 w-7" />
          </button>
          <button
            onClick={openConfirm}
            className="flex items-center justify-center py-4 hover:bg-muted/50 transition border-x border-border"
            aria-label="حفظ"
          >
            <Save className="h-7 w-7" />
          </button>
          <button
            onClick={clearCart}
            className="flex items-center justify-center py-4 hover:bg-muted/50 transition"
            aria-label="مسح القائمة"
          >
            <ListX className="h-7 w-7" />
          </button>
        </div>
      </div>

      {/* Confirm dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent dir="rtl" className="max-w-md p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle className="text-center text-xl">تأكيد العملية</DialogTitle>
          </DialogHeader>
          <div className="px-6 py-3 space-y-4">
            {/* Customer */}
            <div className="flex items-center justify-between">
              <span className="text-base font-bold">{customers.find((c: any) => c.id === customerId)?.name || "—"}</span>
              <span className="text-muted-foreground">الزبون</span>
            </div>

            {/* Due amount — digital style */}
            <div className="flex items-center justify-between">
              <span
                className="font-mono text-3xl font-bold tabular-nums"
                style={{ color: "#1a237e", fontFamily: '"DS-Digital","Courier New",monospace', letterSpacing: "0.05em" }}
              >
                {totalAmount.toFixed(2)}
              </span>
              <span className="text-muted-foreground">المبلغ المستحق</span>
            </div>

            {/* Payment method */}
            <div>
              <div className="text-muted-foreground text-right mb-2">طريقة الدفع</div>
              <div className="flex items-center justify-between gap-2" dir="ltr">
                {([
                  { id: "phone", label: "الهاتف", Icon: Smartphone },
                  { id: "card", label: "بطاقة", Icon: CreditCard },
                  { id: "check", label: "صك", Icon: ReceiptIcon },
                  { id: "cash", label: "نقدا", Icon: Banknote },
                ] as const).map(({ id, label, Icon }) => {
                  const active = paymentMethod === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setPaymentMethod(id)}
                      className="flex flex-col items-center gap-1"
                    >
                      <Icon className="h-6 w-6 text-foreground/80" />
                      <span className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${active ? "border-red-600" : "border-muted-foreground/40"}`}>
                        {active && <span className="h-2.5 w-2.5 rounded-full bg-red-600" />}
                      </span>
                      <span className="text-xs">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Paid amount */}
            <div>
              <div className="text-muted-foreground text-right mb-1">المبلغ المدفوع</div>
              <Input
                type="number"
                inputMode="decimal"
                value={paid}
                onChange={(e) => setPaid(e.target.value)}
                className="text-right font-mono text-lg border-primary/40"
              />
            </div>

            {/* Note */}
            <div>
              <div className="text-muted-foreground text-right mb-1">ملاحظة</div>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                className="text-right border-primary/40 resize-none"
              />
            </div>
          </div>
          <DialogFooter className="flex-row justify-between gap-2 border-t border-border px-6 py-3 bg-muted/30 sm:justify-between">
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              className="text-primary font-bold text-base px-3 py-1 disabled:opacity-50"
              disabled={isSaving}
            >
              إلغاء
            </button>
            <button
              type="button"
              onClick={save}
              className="text-primary font-bold text-base px-3 py-1 disabled:opacity-50"
              disabled={isSaving}
            >
              {isSaving ? "جارٍ الحفظ والطباعة..." : "تأكيد"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
