import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarClock, ShoppingCart, Banknote, CreditCard, PackageOpen,
  Users, UtensilsCrossed, ArrowDownToLine, Calculator, ArrowLeftRight,
  Building2, ArrowUpFromLine, X
} from "lucide-react";
import { PosLayout } from "@/components/pos/PosLayout";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/app/cash")({ component: CashPage });

type Period = "today" | "yesterday" | "week" | "month" | "all";

const TX_TYPES = [
  { key: "customer_payment", label: "مدفوعات الزبائن", icon: Users, color: "text-violet-600 bg-violet-100" },
  { key: "supplier_payment", label: "مدفوعات الممونين", icon: Users, color: "text-violet-600 bg-violet-100" },
  { key: "expense", label: "المصاريف", icon: UtensilsCrossed, color: "text-violet-600 bg-violet-100" },
  { key: "bank_deposit", label: "إيداع في البنك", icon: Building2, color: "text-violet-600 bg-violet-100" },
  { key: "cash_deposit", label: "إيداع في الصندوق", icon: ArrowDownToLine, color: "text-violet-600 bg-violet-100" },
  { key: "cash_withdraw", label: "سحب من الصندوق", icon: ArrowUpFromLine, color: "text-violet-600 bg-violet-100" },
];

function getRange(period: Period): { from?: Date; to?: Date } {
  const now = new Date();
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  if (period === "today") return { from: start, to: now };
  if (period === "yesterday") {
    const y = new Date(start); y.setDate(y.getDate() - 1);
    return { from: y, to: start };
  }
  if (period === "week") {
    const w = new Date(start); w.setDate(w.getDate() - 7);
    return { from: w, to: now };
  }
  if (period === "month") {
    const m = new Date(start); m.setMonth(m.getMonth() - 1);
    return { from: m, to: now };
  }
  return {};
}

function CashPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>("today");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [activeType, setActiveType] = useState<typeof TX_TYPES[number] | null>(null);
  const [form, setForm] = useState({ amount: "", description: "" });

  const [sales, setSales] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [cashTx, setCashTx] = useState<any[]>([]);

  const range = useMemo(() => getRange(period), [period]);

  const load = () => {
    if (!user) return;
    const filters = (q: any) => {
      let qq = q.eq("user_id", user.id);
      if (range.from) qq = qq.gte("created_at", range.from.toISOString());
      if (range.to) qq = qq.lte("created_at", range.to.toISOString());
      return qq;
    };
    Promise.all([
      filters(supabase.from("sales").select("*")),
      filters(supabase.from("purchases").select("*")),
      filters(supabase.from("expenses").select("*")),
      filters(supabase.from("cash_transactions").select("*")),
    ]).then(([s, p, e, c]) => {
      setSales(s.data || []);
      setPurchases(p.data || []);
      setExpenses(e.data || []);
      setCashTx(c.data || []);
    });
  };
  useEffect(load, [user, period]);

  const sum = (arr: any[], key = "total") => arr.reduce((s, x) => s + Number(x[key] || 0), 0);
  const sumByType = (t: string) =>
    cashTx.filter(x => x.type === t).reduce((s, x) => s + Number(x.amount || 0), 0);

  const salesTotal = sum(sales);
  const cashSales = sum(sales.filter((s: any) => !s.payment_method || s.payment_method === "cash"));
  const otherSales = salesTotal - cashSales;
  const purchasesTotal = sum(purchases);
  const supplierPayments = sumByType("supplier_payment");
  const customerPayments = sumByType("customer_payment");
  const expensesTotal = sum(expenses, "amount");
  const bankDeposit = sumByType("bank_deposit");
  const cashDeposit = sumByType("cash_deposit");
  const cashWithdraw = sumByType("cash_withdraw");
  const previousBalance = 0;
  const inCashRegister =
    previousBalance + cashSales + customerPayments + cashDeposit
    - purchasesTotal - supplierPayments - expensesTotal - bankDeposit - cashWithdraw;

  const openForm = (t: typeof TX_TYPES[number]) => {
    setActiveType(t);
    setForm({ amount: "", description: "" });
    setPickerOpen(false);
    setFormOpen(true);
  };

  const save = async () => {
    if (!user || !activeType) return;
    const amount = Number(form.amount);
    if (!amount || amount <= 0) return toast.error("أدخل مبلغاً صحيحاً");
    if (activeType.key === "expense") {
      const { error } = await supabase.from("expenses").insert({
        user_id: user.id, amount, description: form.description || activeType.label,
      });
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("cash_transactions").insert({
        user_id: user.id, type: activeType.key, amount, description: form.description || null,
      });
      if (error) return toast.error(error.message);
    }
    toast.success("تم الحفظ");
    setFormOpen(false);
    load();
  };

  return (
    <PosLayout title="الصندوق">
      {/* Period selector */}
      <div className="flex items-center gap-3 mb-3">
        <span className="text-sm text-muted-foreground">الفترة</span>
        <div className="flex-1">
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="bg-card border-primary/40 h-11 text-right" dir="rtl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent dir="rtl">
              <SelectItem value="today">اليوم</SelectItem>
              <SelectItem value="yesterday">أمس</SelectItem>
              <SelectItem value="week">آخر 7 أيام</SelectItem>
              <SelectItem value="month">آخر 30 يوم</SelectItem>
              <SelectItem value="all">الكل</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Rows */}
      <div className="space-y-2 pb-24">
        <Row icon={CalendarClock} label="الباقي (من اليوم السابق)" value={previousBalance} />
        <Row icon={ShoppingCart} label="مجموع المبيعات" value={salesTotal} count={sales.length} />
        <Row icon={Banknote} label="المدفوعات نقدا" value={cashSales} count={sales.filter((s:any)=>!s.payment_method||s.payment_method==='cash').length} />
        <Row icon={CreditCard} label="المدفوعات (طرق أخرى)" value={otherSales} count={sales.filter((s:any)=>s.payment_method&&s.payment_method!=='cash').length} />
        <Row icon={PackageOpen} label="مجموع المشتريات" value={purchasesTotal} count={purchases.length} />
        <Row icon={Users} label="مدفوعات الممونين" value={supplierPayments} count={cashTx.filter(x=>x.type==='supplier_payment').length} />
        <Row icon={UtensilsCrossed} label="المصاريف" value={expensesTotal} count={expenses.length} />
        <Row icon={Building2} label="الإيداع في البنك" value={bankDeposit} count={cashTx.filter(x=>x.type==='bank_deposit').length} />
        <Row icon={Calculator} label="في الصندوق" value={inCashRegister} highlight />
      </div>

      {/* Floating arrows button */}
      <button
        onClick={() => setPickerOpen(true)}
        className="fixed bottom-24 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-linear-to-br from-red-600 to-red-700 text-white shadow-2xl hover:scale-110 transition active:scale-95"
        aria-label="عملية جديدة"
      >
        <ArrowLeftRight className="h-6 w-6" />
      </button>

      {/* Type picker dialog */}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent dir="rtl" className="max-w-sm p-0 gap-0 overflow-hidden">
          <DialogHeader className="p-4 pb-2">
            <DialogTitle className="text-center text-base font-bold">إختر نوع العملية</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 p-4 pt-2">
            {TX_TYPES.map((t) => (
              <button
                key={t.key}
                onClick={() => openForm(t)}
                className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card p-4 text-center shadow-sm hover:border-primary hover:shadow-md transition active:scale-95"
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${t.color}`}>
                  <t.icon className="h-5 w-5" />
                </div>
                <span className="text-xs font-semibold leading-tight">{t.label}</span>
              </button>
            ))}
          </div>
          <button
            onClick={() => setPickerOpen(false)}
            className="border-t border-border py-3 text-sm font-bold text-primary hover:bg-muted/50 transition"
          >
            إلغاء
          </button>
        </DialogContent>
      </Dialog>

      {/* Form dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-right">{activeType?.label}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>المبلغ</Label>
              <Input
                type="number"
                inputMode="decimal"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="text-right font-mono text-lg"
                autoFocus
              />
            </div>
            <div>
              <Label>الوصف (اختياري)</Label>
              <Input
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="text-right"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setFormOpen(false)} className="flex-1">إلغاء</Button>
            <Button onClick={save} className="flex-1 bg-gradient-primary text-primary-foreground">حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PosLayout>
  );
}

function Row({
  icon: Icon, label, value, count, highlight,
}: { icon: any; label: string; value: number; count?: number; highlight?: boolean }) {
  return (
    <div className={`flex items-center gap-3 rounded-xl border p-3 shadow-sm ${highlight ? "bg-primary/5 border-primary/30" : "bg-card border-border"}`}>
      <div className="font-mono text-2xl font-bold text-primary tracking-tight tabular-nums">
        {value.toFixed(2)}
      </div>
      <div className="flex-1 min-w-0 text-right">
        <div className="text-sm font-semibold truncate">{label}</div>
        {typeof count === "number" && (
          <div className="text-[11px] text-muted-foreground mt-0.5">{count} عملية</div>
        )}
      </div>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-foreground/80">
        <Icon className="h-5 w-5" />
      </div>
    </div>
  );
}
