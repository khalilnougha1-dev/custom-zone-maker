import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, Plus, Minus, Trash2, ShoppingCart, X } from "lucide-react";
import { PosLayout } from "@/components/pos/PosLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/app/pos")({ component: PosPage });

type Cart = { id: string; name: string; price: number; cost: number; qty: number };

function PosPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<Cart[]>([]);
  const [q, setQ] = useState("");
  const [paid, setPaid] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase.from("products").select("*").eq("user_id", user.id).order("name").then(({ data }) => setProducts(data || []));
  }, [user]);

  const filtered = useMemo(() => products.filter(p => p.name.toLowerCase().includes(q.toLowerCase()) || (p.barcode || "").includes(q)), [products, q]);
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const change = (Number(paid) || 0) - total;

  const add = (p: any) => {
    setCart(prev => {
      const found = prev.find(i => i.id === p.id);
      if (found) return prev.map(i => i.id === p.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { id: p.id, name: p.name, price: Number(p.retail_price), cost: Number(p.cost_price), qty: 1 }];
    });
  };
  const setQty = (id: string, qty: number) => {
    if (qty <= 0) return setCart(prev => prev.filter(i => i.id !== id));
    setCart(prev => prev.map(i => i.id === id ? { ...i, qty } : i));
  };

  const checkout = async () => {
    if (!user || cart.length === 0) return;
    const { data: sale, error } = await supabase.from("sales").insert({
      user_id: user.id, subtotal: total, total, paid: Number(paid) || total, payment_method: "cash",
      invoice_number: `INV-${Date.now()}`,
    }).select().single();
    if (error || !sale) return toast.error(error?.message || "خطأ");
    const items = cart.map(i => ({
      sale_id: sale.id, product_id: i.id, product_name: i.name,
      quantity: i.qty, unit_price: i.price, cost_price: i.cost, total: i.price * i.qty,
    }));
    const { error: e2 } = await supabase.from("sale_items").insert(items);
    if (e2) return toast.error(e2.message);
    toast.success(`✅ تم البيع — ${total.toFixed(2)} دج`);
    setCart([]); setPaid("");
    // refresh stock
    supabase.from("products").select("*").eq("user_id", user.id).order("name").then(({ data }) => setProducts(data || []));
  };

  return (
    <PosLayout title="نقطة البيع">
      <div className="space-y-3">
        {/* Cart */}
        <div className="rounded-2xl bg-card border border-border p-3 shadow-card">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm font-semibold"><ShoppingCart className="h-4 w-4" />السلة ({cart.length})</div>
            {cart.length > 0 && <button onClick={() => setCart([])} className="text-xs text-destructive">إفراغ</button>}
          </div>
          {cart.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-6">السلة فارغة — اختر منتج للإضافة</div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {cart.map(i => (
                <div key={i.id} className="flex items-center gap-2 text-sm border-b border-border pb-2 last:border-0">
                  <button onClick={() => setQty(i.id, i.qty - 1)} className="rounded bg-muted p-1"><Minus className="h-3 w-3" /></button>
                  <span className="w-8 text-center font-mono font-bold">{i.qty}</span>
                  <button onClick={() => setQty(i.id, i.qty + 1)} className="rounded bg-muted p-1"><Plus className="h-3 w-3" /></button>
                  <div className="flex-1 truncate">{i.name}</div>
                  <div className="font-mono font-semibold">{(i.price * i.qty).toFixed(2)}</div>
                  <button onClick={() => setQty(i.id, 0)} className="text-destructive"><X className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          )}
          <div className="mt-3 border-t border-border pt-3 space-y-2">
            <div className="flex items-center justify-between text-lg font-bold">
              <span>الإجمالي</span>
              <span className="font-mono text-primary">{total.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Input type="number" inputMode="decimal" placeholder="المبلغ المدفوع" value={paid} onChange={(e) => setPaid(e.target.value)} className="bg-background" />
              <div className="text-sm text-muted-foreground whitespace-nowrap">الصرف: <span className="font-mono font-bold text-foreground">{Math.max(0, change).toFixed(2)}</span></div>
            </div>
            <Button onClick={checkout} disabled={cart.length === 0} className="w-full bg-gradient-primary text-primary-foreground font-bold">
              تأكيد البيع
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث عن منتج" className="pr-10 bg-card" />
        </div>

        {/* Products grid */}
        <div className="grid grid-cols-2 gap-2">
          {filtered.map(p => (
            <button key={p.id} onClick={() => add(p)} className="rounded-xl bg-card border border-border p-3 text-right hover:border-primary/50 transition shadow-sm">
              <div className="font-semibold truncate">{p.name}</div>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className={`font-mono font-bold ${Number(p.stock_quantity) <= 0 ? "text-destructive" : "text-success"}`}>{p.stock_quantity}</span>
                <span className="font-mono font-bold text-primary">{Number(p.retail_price).toFixed(2)}</span>
              </div>
            </button>
          ))}
          {filtered.length === 0 && <div className="col-span-2 text-center text-muted-foreground py-6">لا توجد منتجات</div>}
        </div>
      </div>
    </PosLayout>
  );
}
