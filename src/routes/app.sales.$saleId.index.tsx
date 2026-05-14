import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Trash2, Pencil, Printer, Clock, Calendar, ImageIcon } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { printReceipt as printReceiptHtml } from "@/lib/print-receipt";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/app/sales/$saleId/")({ component: SaleDetailPage });

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
  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: s } = await supabase.from("sales").select("*").eq("id", saleId).maybeSingle();
      if (!s) {
        toast.error("الفاتورة غير موجودة");
        return;
      }
      setSale(s);
      const { data: it } = await supabase.from("sale_items").select("*").eq("sale_id", saleId);
      setItems(it || []);
      if (s.customer_id) {
        const { data: c } = await supabase.from("customers").select("name").eq("id", s.customer_id).maybeSingle();
        if (c) setCustomerName(c.name);
      }
      const { data: all } = await supabase
        .from("sales")
        .select("id,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });
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

  const fmtTime = (d: string) => new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

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

  const printReceipt = async () => {
    if (!user || !sale || isPrinting) return;
    setIsPrinting(true);
    try {
      let preparedBluetoothPrinterId: string | null = null;
      const activePrinterRaw = localStorage.getItem("sahla.printer.active");
      if (activePrinterRaw) {
        try {
          const rawPrinters = JSON.parse(localStorage.getItem("sahla.printers") || "[]") as Array<{
            id: string;
            connection: string;
          }>;
          const activePrinter = rawPrinters.find((printer) => printer.id === activePrinterRaw);
          if (activePrinter?.connection === "bluetooth") {
            const { isWebBluetoothSupported, prepareBluetoothPrinter } = await import("@/lib/bt-printer");
            if (isWebBluetoothSupported()) {
              const preparedPrinter = await prepareBluetoothPrinter({ promptIfMissing: true });
              preparedBluetoothPrinterId = preparedPrinter?.id || null;
            }
          }
        } catch (error) {
          const message = (error as Error).message || "تعذر تجهيز الطابعة";
          if (!message.toLowerCase().includes("cancel")) {
            toast.error(message);
          }
          return;
        }
      }

      await printReceiptHtml({
        userId: user.id,
        saleSeq: seq ?? 1,
        customerId: sale.customer_id,
        customerName,
        items: items.map((i: any) => ({
          product_name: i.product_name,
          quantity: Number(i.quantity),
          unit_price: Number(i.unit_price),
        })),
        total: Number(sale.total),
        paid: Number(sale.paid || 0),
        note: sale.notes,
        createdAt: sale.created_at,
        preparedBluetoothPrinterId,
      });
    } finally {
      setIsPrinting(false);
    }
  };

  const exportPdf = () => window.print();

  if (!sale) {
    return <div className="min-h-screen flex items-center justify-center bg-background">...</div>;
  }

  return (
    <div className="min-h-screen bg-muted/30 flex flex-col" dir="rtl">
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
        <div className="mb-4 flex items-center justify-between">
          <button className="p-1" aria-label="تعديل">
            <Pencil className="h-7 w-7 text-foreground/80" />
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate({ to: "/app/sales/$saleId/print", params: { saleId } })}
              className="flex h-9 items-center justify-center gap-1 rounded bg-primary px-3 text-xs font-bold text-primary-foreground"
              aria-label="شاشة الطباعة"
            >
              <Printer className="h-4 w-4" /> طباعة
            </button>
            <button
              onClick={exportPdf}
              className="flex h-9 w-12 items-center justify-center rounded bg-foreground text-xs font-bold text-background"
              aria-label="PDF"
            >
              PDF
            </button>
          </div>
        </div>

        <h2 className="mb-3 text-right text-2xl font-semibold">وصل بيع رقم: {seq ?? ""}</h2>

        <div className="mb-2 flex items-center justify-end gap-6 text-base">
          <div className="flex items-center gap-2">
            <span>{fmtTime(sale.created_at)}</span>
            <Clock className="h-5 w-5 text-foreground/70" />
          </div>
          <div className="flex items-center gap-2">
            <span>{fmtDate(sale.created_at)}</span>
            <Calendar className="h-5 w-5 text-foreground/70" />
          </div>
        </div>

        <div className="mb-2 flex items-center justify-end gap-2">
          <span className="text-base">{customerName}</span>
          <span className="text-muted-foreground">الزبون</span>
        </div>

        <div className="mb-4 flex items-center justify-end gap-6 text-sm">
          <div><span className="text-muted-foreground">المنتجات </span>{totalLines}</div>
          <div><span className="text-muted-foreground">المواد </span>{totalUnits}</div>
        </div>

        <div className="space-y-2">
          {items.map((i, idx) => (
            <div key={i.id} className="flex items-stretch gap-2 rounded-lg border border-border bg-card p-2">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded border-2 border-foreground/40 text-foreground/40">
                <ImageIcon className="h-7 w-7" />
              </div>
              <div className="flex flex-1 flex-col justify-between py-1 text-right">
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
                  <span className="text-lg">
                    {Number(i.quantity)}
                    {i.package_units_count ? (
                      <span className="text-sm text-primary mr-2 font-mono">
                        ({Number(i.package_qty)}×{i.package_units_count})
                      </span>
                    ) : null}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      <div className="sticky bottom-0 left-0 right-0 border-t border-border bg-card/95 backdrop-blur">
        <div className="space-y-1 px-5 py-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-3xl text-primary" style={digitFont}>{total.toFixed(2)}</span>
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