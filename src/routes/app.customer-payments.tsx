import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, Plus, Printer, Trash2, X, Banknote, CreditCard, Smartphone, FileText } from "lucide-react";
import { PosLayout } from "@/components/pos/PosLayout";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/app/customer-payments")({ component: CustomerPaymentsPage });

type Period = "today" | "yesterday" | "week" | "month" | "all";

const METHODS = [
  { key: "cash", label: "نقدا", icon: Banknote },
  { key: "check", label: "صك", icon: FileText },
  { key: "card", label: "بطاقة", icon: CreditCard },
  { key: "phone", label: "الهاتف", icon: Smartphone },
];

function getRange(period: Period): { from?: Date; to?: Date } {
  const now = new Date();
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  if (period === "today") return { from: start, to: now };
  if (period === "yesterday") { const y = new Date(start); y.setDate(y.getDate() - 1); return { from: y, to: start }; }
  if (period === "week") { const w = new Date(start); w.setDate(w.getDate() - 7); return { from: w, to: now }; }
  if (period === "month") { const m = new Date(start); m.setMonth(m.getMonth() - 1); return { from: m, to: now }; }
  return {};
}

function refOf(id: string) {
  const n = parseInt(id.replace(/-/g, "").slice(0, 6), 16) % 100000;
  return `Ref. ${7000 + (n % 999)}`;
}

function CustomerPaymentsPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>("today");
  const [customerQ, setCustomerQ] = useState("");
  const [methods, setMethods] = useState<Record<string, boolean>>({ cash: true, check: true, card: true, phone: true });
  const [items, setItems] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ customerId: "", amount: "", method: "cash", description: "" });
  const [delId, setDelId] = useState<string | null>(null);

  const range = useMemo(() => getRange(period), [period]);
  const customersMap = useMemo(() => {
    const m: Record<string, string> = {};
    customers.forEach(c => { m[c.id] = c.name; });
    return m;
  }, [customers]);

  const load = () => {
    if (!user) return;
    let q = supabase.from("cash_transactions").select("*")
      .eq("user_id", user.id).eq("type", "customer_payment")
      .order("created_at", { ascending: false });
    if (range.from) q = q.gte("created_at", range.from.toISOString());
    if (range.to) q = q.lte("created_at", range.to.toISOString());
    q.limit(300).then(({ data }) => setItems(data || []));
    supabase.from("customers").select("id,name").eq("user_id", user.id)
      .order("name").then(({ data }) => setCustomers(data || []));
  };
  useEffect(load, [user, period]);

  const filtered = useMemo(() => {
    return items.filter(it => {
      const m = (it.description?.match(/\[(\w+)\]/)?.[1]) || "cash";
      if (!methods[m]) return false;
      if (customerQ.trim()) {
        const name = customersMap[it.reference_id] || "";
        if (!name.toLowerCase().includes(customerQ.toLowerCase())) return false;
      }
      return true;
    });
  }, [items, methods, customerQ, customersMap]);

  const total = filtered.reduce((s, x) => s + Number(x.amount || 0), 0);

  const save = async () => {
    if (!user) return;
    const amount = Number(form.amount);
    if (!form.customerId) return toast.error("اختر الزبون");
    if (!amount || amount <= 0) return toast.error("أدخل مبلغاً صحيحاً");
    const desc = `[${form.method}] ${form.description || ""}`.trim();
    const { error } = await supabase.from("cash_transactions").insert({
      user_id: user.id, type: "customer_payment", amount,
      reference_id: form.customerId, description: desc,
    });
    if (error) return toast.error(error.message);
    toast.success("تم الحفظ");
    setFormOpen(false);
    setForm({ customerId: "", amount: "", method: "cash", description: "" });
    load();
  };

  const doDelete = async () => {
    if (!delId) return;
    const { error } = await supabase.from("cash_transactions").delete().eq("id", delId);
    if (error) return toast.error(error.message);
    toast.success("تم الحذف");
    setDelId(null);
    load();
  };

  const printReceipt = (it: any) => {
    const name = customersMap[it.reference_id] || "—";
    const html = `<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8"><title>وصل دفع</title>
<style>body{font-family:Cairo,sans-serif;padding:16px;max-width:300px}h2{text-align:center}
.row{display:flex;justify-content:space-between;margin:6px 0}.amt{font-size:24px;font-weight:bold;text-align:center;margin:12px 0}
hr{border:none;border-top:1px dashed #999}</style></head><body>
<h2>وصل دفع زبون</h2><hr>
<div class="row"><span>الزبون</span><b>${name}</b></div>
<div class="row"><span>التاريخ</span><span>${new Date(it.created_at).toLocaleString("ar")}</span></div>
<div class="row"><span>المرجع</span><span>${refOf(it.id)}</span></div>
<hr><div class="amt">${Number(it.amount).toFixed(2)}</div><hr>
</body></html>`;
    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); w.focus(); setTimeout(() => w.print(), 300); }
  };

  return (
    <PosLayout title="مدفوعات الزبائن">
      {/* Filters */}
      <div className="space-y-3 mb-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold w-14 text-right">الفترة</span>
          <div className="flex-1">
            <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
              <SelectTrigger className="bg-card border-primary/40 h-11 text-right" dir="rtl"><SelectValue /></SelectTrigger>
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
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold w-14 text-right">الزبون</span>
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={customerQ} onChange={(e) => setCustomerQ(e.target.value)}
              className="pr-10 h-11 bg-card border-primary/40 text-right" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold w-14 text-right">طريقة الدفع</span>
          <div className="flex-1 grid grid-cols-4 gap-2">
            {METHODS.map(m => (
              <button key={m.key}
                onClick={() => setMethods(p => ({ ...p, [m.key]: !p[m.key] }))}
                className={`flex items-center justify-center gap-1 rounded-md border px-2 py-1.5 text-xs ${methods[m.key] ? "bg-red-600/10 border-red-600 text-red-700" : "bg-card border-border text-muted-foreground"}`}>
                <m.icon className="h-3.5 w-3.5" />{m.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* List */}
      <div className="space-y-2 pb-40">
        {filtered.length === 0 ? (
          <div className="py-24 text-center text-muted-foreground">لا توجد أي عملية دفع</div>
        ) : filtered.map(it => {
          const m = (it.description?.match(/\[(\w+)\]/)?.[1]) || "cash";
          const Icon = METHODS.find(x => x.key === m)?.icon || Banknote;
          return (
            <div key={it.id} className="rounded-xl bg-card border border-border p-3 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button onClick={() => setDelId(it.id)} className="p-1.5 hover:bg-muted rounded">
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <button onClick={() => printReceipt(it)} className="p-1.5 hover:bg-muted rounded">
                    <Printer className="h-4 w-4" />
                  </button>
                </div>
                <div className="text-xs text-muted-foreground text-right">
                  <div>{new Date(it.created_at).toLocaleString("ar", { weekday: "long", day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
                  <div>{refOf(it.id)}</div>
                </div>
              </div>
              <div className="text-right font-bold text-base mt-1">{customersMap[it.reference_id] || "—"}</div>
              <div className="flex items-center justify-between mt-1">
                <Icon className="h-5 w-5 text-muted-foreground" />
                <div className="font-mono text-2xl font-bold text-[#1a237e] tabular-nums"
                  style={{ fontFamily: '"DS-Digital", "Courier New", monospace', letterSpacing: "0.05em" }}>
                  {Number(it.amount).toFixed(2)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* FAB */}
      <button onClick={() => setFormOpen(true)}
        className="fixed bottom-44 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-linear-to-br from-red-600 to-red-700 text-white shadow-2xl hover:scale-110 transition active:scale-95"
        aria-label="دفع جديد">
        <Plus className="h-7 w-7" />
      </button>

      {/* Total bar */}
      <div className="fixed bottom-16 left-0 right-0 z-20 border-t border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
          <div className="font-mono text-3xl font-bold text-[#1a237e] tabular-nums"
            style={{ fontFamily: '"DS-Digital", "Courier New", monospace', letterSpacing: "0.05em" }}>
            {total.toFixed(2)}
          </div>
          <div className="flex-1 text-right">
            <div className="text-base font-bold">المجموع</div>
            <div className="text-xs text-muted-foreground mt-0.5">{filtered.length} عملية دفع</div>
          </div>
        </div>
      </div>

      {/* Form */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-right flex items-center justify-between">
              <span>مدفوعات الزبائن</span>
              <button onClick={() => setFormOpen(false)}><X className="h-5 w-5" /></button>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>الزبون</Label>
              <Select value={form.customerId} onValueChange={(v) => setForm({ ...form, customerId: v })}>
                <SelectTrigger className="text-right" dir="rtl"><SelectValue placeholder="اختر الزبون" /></SelectTrigger>
                <SelectContent dir="rtl">
                  {customers.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>المبلغ</Label>
              <Input type="number" inputMode="decimal" value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="text-right font-mono text-lg" autoFocus />
            </div>
            <div>
              <Label>طريقة الدفع</Label>
              <div className="grid grid-cols-4 gap-2 mt-1">
                {METHODS.map(m => (
                  <button key={m.key} onClick={() => setForm({ ...form, method: m.key })}
                    className={`flex flex-col items-center gap-1 rounded-md border px-2 py-2 text-xs ${form.method === m.key ? "bg-red-600/10 border-red-600 text-red-700" : "bg-card border-border"}`}>
                    <m.icon className="h-4 w-4" />{m.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>الوصف (اختياري)</Label>
              <Input value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="text-right" />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setFormOpen(false)} className="flex-1">إلغاء</Button>
            <Button onClick={save} className="flex-1 bg-gradient-primary text-primary-foreground">حفظ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!delId} onOpenChange={(o) => !o && setDelId(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف عملية الدفع</AlertDialogTitle>
            <AlertDialogDescription>هل تريد حذف هذه العملية؟</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete} className="bg-red-600 hover:bg-red-700">حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PosLayout>
  );
}
