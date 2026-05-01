import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Users, User, Package } from "lucide-react";
import { PosLayout } from "@/components/pos/PosLayout";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/app/finance")({ component: FinancePage });

function FinancePage() {
  const { user } = useAuth();
  const [data, setData] = useState({
    customerDebt: 0, customerCredit: 0, debtorCustomers: 0, creditorCustomers: 0,
    supplierDebt: 0, supplierCredit: 0, debtorSuppliers: 0, creditorSuppliers: 0,
    productsTracked: 0, productsUntracked: 0, stockCost: 0, stockSale: 0,
  });

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from("customers").select("balance").eq("user_id", user.id),
      supabase.from("suppliers").select("balance").eq("user_id", user.id),
      supabase.from("products").select("stock_quantity, cost_price, retail_price, is_tracked").eq("user_id", user.id),
    ]).then(([c, s, p]) => {
      const customers = c.data || []; const suppliers = s.data || []; const products = p.data || [];
      setData({
        customerDebt: customers.filter((x: any) => x.balance > 0).reduce((s: number, x: any) => s + Number(x.balance), 0),
        customerCredit: customers.filter((x: any) => x.balance < 0).reduce((s: number, x: any) => s + Math.abs(Number(x.balance)), 0),
        debtorCustomers: customers.filter((x: any) => x.balance > 0).length,
        creditorCustomers: customers.filter((x: any) => x.balance < 0).length,
        supplierDebt: suppliers.filter((x: any) => x.balance > 0).reduce((s: number, x: any) => s + Number(x.balance), 0),
        supplierCredit: suppliers.filter((x: any) => x.balance < 0).reduce((s: number, x: any) => s + Math.abs(Number(x.balance)), 0),
        debtorSuppliers: suppliers.filter((x: any) => x.balance > 0).length,
        creditorSuppliers: suppliers.filter((x: any) => x.balance < 0).length,
        productsTracked: products.filter((x: any) => x.is_tracked).length,
        productsUntracked: products.filter((x: any) => !x.is_tracked).length,
        stockCost: products.reduce((s: number, x: any) => s + Number(x.stock_quantity) * Number(x.cost_price), 0),
        stockSale: products.reduce((s: number, x: any) => s + Number(x.stock_quantity) * Number(x.retail_price), 0),
      });
    });
  }, [user]);

  return (
    <PosLayout title="الوضعية المالية">
      <div className="space-y-3">
        {/* Customers */}
        <div className="rounded-2xl bg-card border border-border p-4 shadow-card">
          <div className="text-right font-bold mb-3">مجموع ديون الزبائن</div>
          <div className="flex items-center gap-3">
            <div className="font-mono text-2xl font-bold text-primary tabular-nums">{data.customerDebt.toFixed(2)}</div>
            <div className="flex-1" />
            <div className="text-right text-sm space-y-0.5">
              <div className="flex items-center gap-2 justify-end"><span>زبون مدين {data.debtorCustomers}</span><Users className="h-4 w-4 text-foreground" /></div>
              <div className="flex items-center gap-2 justify-end text-muted-foreground"><span>زبون دائن {data.creditorCustomers}</span></div>
            </div>
          </div>
        </div>
        {/* Suppliers */}
        <div className="rounded-2xl bg-card border border-border p-4 shadow-card">
          <div className="text-right font-bold mb-3">مجموع ديون الممونين</div>
          <div className="flex items-center gap-3">
            <div className="font-mono text-2xl font-bold text-primary tabular-nums">{data.supplierDebt.toFixed(2)}</div>
            <div className="flex-1" />
            <div className="text-right text-sm space-y-0.5">
              <div className="flex items-center gap-2 justify-end"><span>ممون دائن {data.creditorSuppliers}</span><User className="h-4 w-4" /></div>
              <div className="flex items-center gap-2 justify-end text-muted-foreground"><span>ممون مدين {data.debtorSuppliers}</span></div>
            </div>
          </div>
        </div>
        {/* Stock */}
        <div className="rounded-2xl bg-card border border-border p-4 shadow-card">
          <div className="text-right font-bold mb-3">قيمة المخزون</div>
          <div className="flex items-start gap-3">
            <div>
              <div className="text-xs text-muted-foreground">بسعر التكلفة المتوسط</div>
              <div className="font-mono text-xl font-bold text-primary tabular-nums">{data.stockCost.toFixed(2)}</div>
              <div className="text-xs text-muted-foreground mt-2">بسعر البيع</div>
              <div className="font-mono text-xl font-bold text-primary tabular-nums">{data.stockSale.toFixed(2)}</div>
            </div>
            <div className="flex-1" />
            <div className="text-right text-sm space-y-0.5">
              <div className="flex items-center gap-2 justify-end"><span>المنتجات المدرجة {data.productsTracked}</span><Package className="h-4 w-4" /></div>
              <div className="flex items-center gap-2 justify-end text-muted-foreground"><span>المنتجات الغير مدرجة {data.productsUntracked}</span></div>
            </div>
          </div>
        </div>
      </div>
    </PosLayout>
  );
}
