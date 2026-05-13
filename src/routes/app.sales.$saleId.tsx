import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Trash2, Pencil, Printer, Clock, Calendar, ImageIcon } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { printReceipt as printReceiptHtml } from "@/lib/print-receipt";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/app/sales/$saleId")({ component: SaleDetailPage });

const digitFont = { fontFamily: '"DS-Digital","Courier New",monospace', letterSpacing: "0.05em" } as const;

function SaleDetailPage() {
  const { saleId } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [sale, setSale] = useState<any | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [customerName, setCustomerName] = useState("—");
  const [confirmDel, setConfirmDel] = useState(false);
  const [seq, setSeq] = useState<number | null>(null);

  useEffect(() => { if (!loading && !user) navigate({ to: "/login" }); }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: s } = await supabase.from("sales").select("*").eq("id", saleId).maybeSingle();
      if (!s) { toast.error("الفاتورة غير موجودة"); return; }
      setSale(s);
      const { data: it } = await supabase.from("sale_items").select("*").eq("sale_id", saleId);
      setItems(it || []);
      if (s.customer_id) {
        const { data: c } = await supabase.from("customers").select("name").eq("id", s.customer_id).maybeSingle();
        if (c) setCustomerName(c.name);
      }
      // sequence number among user sales (oldest = 1)
      const { data: all } = await supabase.from("sales").select("id,created_at")
        .eq("user_id", user.id).order("created_at", { ascending: true });
      const idx = (all || []).findIndex((x: any) => x.id === saleId);
      if (idx >= 0) setSeq(idx + 1);
    })();
  }, [user, saleId]);

  const fmtDate = (d: string) => {
    const x = new Date(d);
    const dd = String(x.getDate()).padStart(2, "0");
    const mm = String(x.getMonth() + 1).padStart(2, "0");
    return `${x.getFullYear()}/${mm}/${dd}`;
  };
  const fmtTime = (d: string) =>
    new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  const totalLines = items.length;
  const totalUnits = items.reduce((s, i) => s + Number(i.quantity), 0);
  const total = Number(sale?.total || 0);
  const paid = Number(sale?.paid || 0);

  const handleDelete = async () => {
    const { error } = await supabase.from("sales").delete().eq("id", saleId);
    if (error) return toast.error(error.message);
    toast.success("تم حذف الفاتورة");
    navigate({ to: "/app/sales" });
  };

  const printReceipt = () => window.print();

  const exportPdf = () => {
    window.print();
  };

  if (!sale) {
    return <div className="min-h-screen flex items-center justify-center bg-background">...</div>;
  }

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col" dir="rtl">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-gradient-primary text-primary-foreground shadow-md">
        <div className="flex h-14 items-center justify-between px-4">
          <button onClick={() => setConfirmDel(true)} className="rounded-lg p-2 hover:bg-white/10" aria-label="حذف">
            <Trash2 className="h-6 w-6" />
          </button>
          <h1 className="text-lg font-bold">عملية بيع رقم {seq ?? ""}</h1>
          <button onClick={() => navigate({ to: "/app/sales" })} className="rounded-lg p-2 hover:bg-white/10" aria-label="رجوع">
            <ArrowRight className="h-6 w-6 rotate-180" />
          </button>
        </div>
      </header>

      <main className="flex-1 px-4 pt-3 pb-6">
        {/* Action icons row */}
        <div className="flex items-center justify-between mb-4">
          <button className="p-1" aria-label="تعديل">
            <Pencil className="h-7 w-7 text-foreground/80" />
          </button>
          <div className="flex items-center gap-3">
            <button onClick={printReceipt} className="p-1" aria-label="طباعة">
              <Printer className="h-7 w-7 text-foreground/80" />
            </button>
            <button
              onClick={exportPdf}
              className="flex h-9 w-12 items-center justify-center rounded bg-foreground text-background text-xs font-bold"
              aria-label="PDF"
            >
              PDF
            </button>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-semibold text-right mb-3">وصل بيع رقم: {seq ?? ""}</h2>

        {/* Date & time */}
        <div className="flex items-center justify-end gap-6 mb-2 text-base">
          <div className="flex items-center gap-2">
            <span>{fmtTime(sale.created_at)}</span>
            <Clock className="h-5 w-5 text-foreground/70" />
          </div>
          <div className="flex items-center gap-2">
            <span>{fmtDate(sale.created_at)}</span>
            <Calendar className="h-5 w-5 text-foreground/70" />
          </div>
        </div>

        {/* Customer */}
        <div className="flex items-center justify-end gap-2 mb-2">
          <span className="text-base">{customerName}</span>
          <span className="text-muted-foreground">الزبون</span>
        </div>

        {/* Counts */}
        <div className="flex items-center justify-end gap-6 mb-4 text-sm">
          <div><span className="text-muted-foreground">المنتجات </span>{totalLines}</div>
          <div><span className="text-muted-foreground">المواد </span>{totalUnits}</div>
        </div>

        {/* Items list */}
        <div className="space-y-2">
          {items.map((i, idx) => (
            <div key={i.id} className="rounded-lg border border-border bg-card p-2 flex items-stretch gap-2">
              {/* image placeholder */}
              <div className="flex h-16 w-16 items-center justify-center rounded border-2 border-foreground/40 text-foreground/40 shrink-0">
                <ImageIcon className="h-7 w-7" />
              </div>
              {/* middle: qty */}
              <div className="flex-1 flex flex-col justify-between text-right py-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-2xl text-foreground" style={digitFont}>
                    {Number(i.unit_price).toFixed(2)}
                  </span>
                  <span className="text-base">
                    {i.product_name} <span className="text-muted-foreground">|{idx + 1}</span>
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xl text-muted-foreground" style={digitFont}>
                    {Number(i.total).toFixed(2)}
                  </span>
                  <span className="text-lg">{Number(i.quantity)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Bottom totals card */}
      <div className="sticky bottom-0 left-0 right-0 border-t border-border bg-card/95 backdrop-blur">
        <div className="px-5 py-3 space-y-1">
          <div className="flex items-center justify-between">
            <span className="font-mono text-3xl text-[#1a237e]" style={digitFont}>{total.toFixed(2)}</span>
            <span className="text-muted-foreground">المجموع</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-mono text-2xl text-foreground" style={digitFont}>{paid.toFixed(2)}</span>
            <span className="text-muted-foreground">المبلغ المدفوع</span>
          </div>
        </div>
      </div>

      <AlertDialog open={confirmDel} onOpenChange={setConfirmDel}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف الفاتورة</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم إرجاع المخزون تلقائياً. هل أنت متأكد؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive">حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
