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

export const Route = createFileRoute("/app/pos")({ component: NewSalePage });

type CartItem = { id: string; name: string; price: number; cost: number; qty: number };

function NewSalePage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [now, setNow] = useState({ date: "", time: "" });
  const [products, setProducts] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerQ, setCustomerQ] = useState("");
  const [productQ, setProductQ] = useState("");
  const [showCustomerList, setShowCustomerList] = useState(false);
  const [showProductList, setShowProductList] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [paid, setPaid] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "check" | "card" | "phone">("cash");
  const [note, setNote] = useState("");
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
  }, [user]);

  const filteredCustomers = useMemo(() => {
    const q = customerQ.toLowerCase().trim();
    if (!q) return customers.slice(0, 20);
    return customers.filter((c: any) =>
      c.name?.toLowerCase().includes(q) || (c.phone || "").includes(q)
    ).slice(0, 20);
  }, [customers, customerQ]);

  const filteredProducts = useMemo(() => {
    const q = productQ.toLowerCase().trim();
    if (!q) return products.slice(0, 30);
    return products.filter((p: any) =>
      p.name?.toLowerCase().includes(q) ||
      (p.barcode || "").includes(q) ||
      (p.reference || "").toLowerCase().includes(q)
    ).slice(0, 30);
  }, [products, productQ]);

  const totalAmount = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const totalUnits = cart.reduce((s, i) => s + i.qty, 0);
  const totalLines = cart.length;

  const getStock = (id: string) => {
    const p = products.find((x: any) => x.id === id);
    return p ? Number(p.stock_quantity) : 0;
  };
  const isTracked = (id: string) => {
    const p = products.find((x: any) => x.id === id);
    return p ? (p.is_tracked !== false) : true;
  };

  const addProduct = (p: any) => {
    const tracked = p.is_tracked !== false;
    const stock = Number(p.stock_quantity) || 0;
    const inCart = cart.find(i => i.id === p.id)?.qty || 0;
    if (tracked && inCart + 1 > stock) {
      return toast.error(`المخزون غير كافٍ (المتبقي ${stock})`);
    }
    setCart(prev => {
      const found = prev.find(i => i.id === p.id);
      if (found) return prev.map(i => i.id === p.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, {
        id: p.id, name: p.name,
        price: Number(p.retail_price) || 0,
        cost: Number(p.cost_price) || 0, qty: 1,
      }];
    });
    setProductQ("");
    setShowProductList(false);
    productInputRef.current?.focus();
  };

  const setQty = (id: string, qty: number) => {
    if (qty <= 0) return setCart(prev => prev.filter(i => i.id !== id));
    if (isTracked(id) && qty > getStock(id)) {
      return toast.error(`المخزون غير كافٍ (المتبقي ${getStock(id)})`);
    }
    setCart(prev => prev.map(i => i.id === id ? { ...i, qty } : i));
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
      for (const i of cart) {
        if (isTracked(i.id) && i.qty > getStock(i.id)) {
          toast.error(`المخزون غير كافٍ للمنتج ${i.name} (المتبقي ${getStock(i.id)})`);
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
      if (error || !sale) {
        toast.error(error?.message || "خطأ");
        return;
      }

      const items = cart.map(i => ({
        sale_id: sale.id, product_id: i.id, product_name: i.name,
        quantity: i.qty, unit_price: i.price, cost_price: i.cost,
        total: i.price * i.qty,
      }));
      const { error: e2 } = await supabase.from("sale_items").insert(items);
      if (e2) {
        toast.error(e2.message);
        return;
      }

      toast.success(`✅ تم البيع — ${totalAmount.toFixed(2)}`);
      const { count } = await supabase.from("sales").select("id", { count: "exact", head: true }).eq("user_id", user.id);
      await printReceiptHtml({
        userId: user.id,
        saleSeq: count || 1,
        customerId,
        customerName: customers.find((c: any) => c.id === customerId)?.name || "—",
        items: cart.map(i => ({ product_name: i.name, quantity: i.qty, unit_price: i.price })),
        total: totalAmount,
        paid: Number(paid) || 0,
        note,
        createdAt: sale.created_at,
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
    <div className="min-h-screen bg-muted/30 flex flex-col" dir="rtl">
      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-gradient-primary text-primary-foreground shadow-md">
        <div className="flex h-14 items-center justify-between px-4">
          <button
            onClick={() => navigate({ to: "/app/sales" })}
            className="rounded-lg p-2 hover:bg-white/10 transition"
            aria-label="رجوع"
          >
            <ArrowRight className="h-6 w-6" />
          </button>
          <h1 className="text-lg font-bold">بيع جديد</h1>
          <button
            onClick={openConfirm}
            className="rounded-lg p-2 hover:bg-white/10 transition"
            aria-label="حاسبة"
          >
            <Calculator className="h-6 w-6" />
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 pt-3 pb-32">
        {/* Date & time */}
        <div className="flex items-center justify-end gap-4 text-sm mb-3">
          <span className="text-muted-foreground">التوقيت <span className="text-sky-500 font-mono">{now.time}</span></span>
          <span className="text-muted-foreground">التاريخ <span className="text-sky-500 font-mono">{now.date}</span></span>
        </div>

        {/* Customer */}
        <div className="flex items-center gap-3 mb-3">
          <span className="text-sm font-semibold w-14 text-right">الزبون</span>
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
          <div className="flex items-center gap-3">
            <button className="text-foreground/80 shrink-0" aria-label="قائمة">
              <ListChecks className="h-7 w-7" />
            </button>
            <Input
              ref={productInputRef}
              value={productQ}
              onChange={(e) => { setProductQ(e.target.value); setShowProductList(true); }}
              onFocus={() => setShowProductList(true)}
              placeholder="إبحث عن منتج"
              className="flex-1 border-0 border-b border-foreground/40 rounded-none bg-transparent text-right focus-visible:ring-0 focus-visible:border-primary"
            />
          </div>
          {showProductList && productQ && filteredProducts.length > 0 && (
            <div className="mt-2 max-h-64 overflow-y-auto rounded-lg border border-border bg-background">
              {filteredProducts.map((p: any) => (
                <button
                  key={p.id}
                  onClick={() => addProduct(p)}
                  className="w-full text-right px-3 py-2 text-sm hover:bg-muted border-b border-border last:border-0 flex items-center justify-between gap-2"
                >
                  <span className="font-mono font-bold text-primary">{Number(p.retail_price).toFixed(2)}</span>
                  <span className="flex-1 truncate">{p.name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Display panel — black with green digits */}
        <div className="rounded-xl bg-[#1f1f1f] text-white p-4 shadow-card">
          <div className="grid grid-cols-[1fr_auto] gap-3 items-center">
            <div
              className="font-mono text-5xl font-bold text-green-400 tabular-nums tracking-wider"
              style={{ textShadow: "0 0 8px rgba(74,222,128,0.45)" }}
            >
              {totalAmount.toFixed(2)}
            </div>
            <div className="text-right space-y-1">
              <div className="text-base font-bold">المجموع</div>
              <div className="text-sm flex items-center justify-end gap-2">
                <span className="font-mono text-green-400">{totalLines}</span>
                <span className="text-white/80">المنتجات</span>
              </div>
              <div className="text-sm flex items-center justify-end gap-2">
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
                <button onClick={() => setQty(i.id, 0)} className="text-destructive p-1"><X className="h-4 w-4" /></button>
                <div className="font-mono font-bold text-primary w-20 text-left">{(i.price * i.qty).toFixed(2)}</div>
                <Input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={i.qty}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "") return setCart(prev => prev.map(x => x.id === i.id ? { ...x, qty: 0 } : x));
                    const n = Number(v);
                    if (!Number.isFinite(n) || n < 0) return;
                    if (isTracked(i.id) && n > getStock(i.id)) {
                      return toast.error(`المخزون غير كافٍ (المتبقي ${getStock(i.id)})`);
                    }
                    setCart(prev => prev.map(x => x.id === i.id ? { ...x, qty: n } : x));
                  }}
                  onBlur={() => { if (i.qty <= 0) setCart(prev => prev.filter(x => x.id !== i.id)); }}
                  className="w-14 h-8 text-center font-mono font-bold px-1"
                />
                
                <div className="flex-1 truncate text-right text-sm">{i.name}</div>
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
