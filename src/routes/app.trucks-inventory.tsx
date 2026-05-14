import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Truck as TruckIcon, Package, History, ArrowRight, Search } from "lucide-react";
import { PosLayout } from "@/components/pos/PosLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/trucks-inventory")({ component: TrucksInventoryPage });

type Truck = { id: string; name: string; plate_number: string | null; is_active: boolean };
type Dist = {
  id: string; truck_id: string; product_id: string | null; product_name: string;
  customer_name: string | null; quantity: number; unit_price: number; total: number;
  paid: number; status: string; notes: string | null; created_at: string; updated_at: string;
};
type Product = { id: string; name: string; stock_quantity: number; cost_price: number; retail_price: number; unit: string | null };

function TrucksInventoryPage() {
  const { user } = useAuth();
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [dists, setDists] = useState<Dist[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [truckId, setTruckId] = useState<string>("all");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const [{ data: ts }, { data: ds }, { data: ps }] = await Promise.all([
      supabase.from("trucks").select("*").eq("owner_id", user.id).order("name"),
      supabase.from("truck_distributions").select("*").eq("owner_id", user.id).order("created_at", { ascending: false }),
      supabase.from("products").select("id,name,stock_quantity,cost_price,retail_price,unit").eq("user_id", user.id).eq("is_inactive", false).order("name").limit(500),
    ]);
    setTrucks((ts as any) || []);
    setDists((ds as any) || []);
    setProducts((ps as any) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [user]);

  const filteredDists = useMemo(() => {
    return dists.filter(d =>
      (truckId === "all" || d.truck_id === truckId) &&
      (!q || d.product_name.toLowerCase().includes(q.toLowerCase()) ||
        (d.customer_name || "").toLowerCase().includes(q.toLowerCase()))
    );
  }, [dists, truckId, q]);

  // Aggregate by product per current filter — quantity available = pending qty
  const aggregated = useMemo(() => {
    const map = new Map<string, {
      product_name: string; pending: number; delivered: number; cancelled: number;
      total_value: number; trucks: Set<string>;
    }>();
    for (const d of filteredDists) {
      const key = d.product_name;
      const cur = map.get(key) || {
        product_name: d.product_name, pending: 0, delivered: 0, cancelled: 0,
        total_value: 0, trucks: new Set<string>(),
      };
      const qty = Number(d.quantity) || 0;
      if (d.status === "pending") cur.pending += qty;
      else if (d.status === "delivered") cur.delivered += qty;
      else if (d.status === "cancelled") cur.cancelled += qty;
      cur.total_value += Number(d.total) || 0;
      cur.trucks.add(d.truck_id);
      map.set(key, cur);
    }
    return Array.from(map.values()).sort((a, b) => b.pending - a.pending);
  }, [filteredDists]);

  const truckName = (id: string) => trucks.find(t => t.id === id)?.name || "—";

  const totals = useMemo(() => ({
    pending: aggregated.reduce((s, a) => s + a.pending, 0),
    delivered: aggregated.reduce((s, a) => s + a.delivered, 0),
    value: aggregated.reduce((s, a) => s + a.total_value, 0),
  }), [aggregated]);

  return (
    <PosLayout title="مخزون الشاحنات">
      <div className="mb-3">
        <Button asChild variant="ghost" size="sm" className="gap-1">
          <Link to="/app/trucks"><ArrowRight className="h-4 w-4" /> رجوع للشاحنات</Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 gap-2 mb-3 sm:grid-cols-2">
        <Select value={truckId} onValueChange={setTruckId}>
          <SelectTrigger dir="rtl" className="bg-card"><SelectValue /></SelectTrigger>
          <SelectContent dir="rtl">
            <SelectItem value="all">كل الشاحنات</SelectItem>
            {trucks.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث منتج/زبون" className="pr-10 bg-card" />
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <Stat label="المتاح (قيد الانتظار)" value={totals.pending.toFixed(2)} className="text-amber-600" />
        <Stat label="المُسلَّم" value={totals.delivered.toFixed(2)} className="text-emerald-600" />
        <Stat label="القيمة" value={totals.value.toFixed(2)} className="text-primary" />
      </div>

      {/* Main warehouse */}
      <section className="mb-5">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-muted-foreground">
          <Package className="h-4 w-4" /> المخزون الرئيسي (المستودع)
        </h2>
        {(() => {
          const filteredProducts = products.filter(p => !q || p.name.toLowerCase().includes(q.toLowerCase()));
          const totalStockValue = filteredProducts.reduce((s, p) => s + Number(p.stock_quantity) * Number(p.cost_price || 0), 0);
          if (filteredProducts.length === 0) {
            return <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">لا توجد منتجات في المخزون الرئيسي</div>;
          }
          return (
            <>
              <div className="mb-2 grid grid-cols-2 gap-2">
                <Stat label="عدد الأصناف" value={String(filteredProducts.length)} className="text-primary" />
                <Stat label="قيمة المخزون" value={totalStockValue.toFixed(2)} className="text-emerald-600" />
              </div>
              <div className="space-y-2">
                {filteredProducts.slice(0, 100).map(p => (
                  <div key={p.id} className="rounded-xl border border-border bg-card p-3 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold truncate">{p.name}</div>
                        <div className="mt-1 flex flex-wrap gap-1 text-xs">
                          <Badge className={Number(p.stock_quantity) > 0 ? "bg-emerald-500" : "bg-destructive"}>
                            مخزون {Number(p.stock_quantity)} {p.unit || ""}
                          </Badge>
                          <Badge variant="secondary">تكلفة {Number(p.cost_price).toFixed(2)}</Badge>
                          <Badge variant="secondary">بيع {Number(p.retail_price).toFixed(2)}</Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">القيمة</div>
                        <div className="font-mono font-bold text-primary">
                          {(Number(p.stock_quantity) * Number(p.cost_price || 0)).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {filteredProducts.length > 100 && (
                  <div className="text-center text-xs text-muted-foreground py-2">
                    يُعرض أول 100 من {filteredProducts.length}
                  </div>
                )}
              </div>
            </>
          );
        })()}
      </section>

      {/* Inventory by product (from trucks) */}
      <section className="mb-5">
        <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-muted-foreground">
          <Package className="h-4 w-4" /> المنتجات والمخزون
        </h2>
        {loading ? (
          <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">جارٍ التحميل…</div>
        ) : aggregated.length === 0 ? (
          <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">لا توجد بيانات</div>
        ) : (
          <div className="space-y-2">
            {aggregated.map(a => (
              <div key={a.product_name} className="rounded-xl border border-border bg-card p-3 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold truncate">{a.product_name}</div>
                    <div className="mt-1 flex flex-wrap gap-1 text-xs">
                      <Badge variant="secondary" className="gap-1"><TruckIcon className="h-3 w-3" />{a.trucks.size} شاحنة</Badge>
                      <Badge className="bg-amber-500">متاح {a.pending}</Badge>
                      <Badge className="bg-emerald-500">مُسلّم {a.delivered}</Badge>
                      {a.cancelled > 0 && <Badge variant="destructive">ملغى {a.cancelled}</Badge>}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">القيمة</div>
                    <div className="font-mono font-bold text-primary">{a.total_value.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* History */}
      <section>
        <h2 className="mb-2 flex items-center gap-2 text-sm font-bold text-muted-foreground">
          <History className="h-4 w-4" /> سجل التغييرات
        </h2>
        {filteredDists.length === 0 ? (
          <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">لا يوجد سجل</div>
        ) : (
          <div className="space-y-2">
            {filteredDists.slice(0, 100).map(d => (
              <div key={d.id} className="rounded-xl border border-border bg-card p-3 text-sm shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold truncate">{d.product_name}</div>
                    <div className="text-xs text-muted-foreground">
                      <TruckIcon className="inline h-3 w-3 ml-1" />{truckName(d.truck_id)}
                      {d.customer_name && <> · {d.customer_name}</>}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {d.quantity} × {Number(d.unit_price).toFixed(2)} = <span className="font-bold text-primary">{Number(d.total).toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatusBadge status={d.status} />
                    <div className="text-[10px] text-muted-foreground" dir="ltr">
                      {new Date(d.updated_at || d.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {filteredDists.length > 100 && (
              <div className="text-center text-xs text-muted-foreground py-2">
                يُعرض أول 100 من {filteredDists.length}
              </div>
            )}
          </div>
        )}
      </section>
    </PosLayout>
  );
}

function Stat({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="rounded-xl bg-card border border-border p-3 text-center">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`font-mono text-base font-bold ${className || ""}`}>{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "delivered") return <Badge className="bg-emerald-500">مُسلّم</Badge>;
  if (status === "cancelled") return <Badge variant="destructive">ملغى</Badge>;
  return <Badge variant="secondary">قيد الانتظار</Badge>;
}
