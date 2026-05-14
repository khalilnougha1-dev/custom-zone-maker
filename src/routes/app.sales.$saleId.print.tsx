import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Printer, FileDown, Bluetooth, RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  printReceipt as printReceiptDirect,
  buildReceiptHtmlPreview,
  type PreviewReceiptInput,
} from "@/lib/print-receipt";
import { getReceiptPaperWidth, setReceiptPaperWidth } from "@/lib/printer-config";

export const Route = createFileRoute("/app/sales/$saleId/print")({
  component: SalePrintPage,
});

function SalePrintPage() {
  const { saleId } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [sale, setSale] = useState<any | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [customerName, setCustomerName] = useState("—");
  const [seq, setSeq] = useState<number>(1);
  const [prevDebt, setPrevDebt] = useState(0);
  const [isDemo, setIsDemo] = useState(true);
  const [paper, setPaper] = useState<"58mm" | "80mm">(getReceiptPaperWidth());
  const [busy, setBusy] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

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

        const { data: prev } = await supabase
          .from("sales")
          .select("total,paid")
          .eq("user_id", user.id)
          .eq("customer_id", s.customer_id)
          .lt("created_at", s.created_at);
        const debt = (prev || []).reduce(
          (acc: number, r: any) => acc + (Number(r.total) - Number(r.paid || 0)),
          0,
        );
        setPrevDebt(Math.max(0, debt));
      }

      const { data: all } = await supabase.from("sales").select("id,created_at")
        .eq("user_id", user.id).order("created_at", { ascending: true });
      const idx = (all || []).findIndex((x: any) => x.id === saleId);
      if (idx >= 0) setSeq(idx + 1);

      const { data: prof } = await supabase
        .from("profiles")
        .select("subscription_status,subscription_expires_at,is_active")
        .eq("id", user.id)
        .maybeSingle();
      if (prof) {
        const exp = prof.subscription_expires_at ? new Date(prof.subscription_expires_at).getTime() : 0;
        const active = prof.is_active && (prof.subscription_status === "permanent" || exp > Date.now());
        setIsDemo(!active);
      }
    })();
  }, [user, saleId]);

  const previewInput: PreviewReceiptInput | null = useMemo(() => {
    if (!sale) return null;
    return {
      saleSeq: seq,
      customerName,
      items: items.map((i: any) => ({
        product_name: i.product_name,
        quantity: Number(i.quantity),
        unit_price: Number(i.unit_price),
      })),
      total: Number(sale.total),
      paid: Number(sale.paid || 0),
      prevDebt,
      note: sale.notes,
      createdAt: sale.created_at,
      isDemo,
    };
  }, [sale, items, customerName, seq, prevDebt, isDemo]);

  const previewHtml = useMemo(
    () => (previewInput ? buildReceiptHtmlPreview(previewInput, paper) : ""),
    [previewInput, paper],
  );

  // Inject HTML into iframe (avoids srcdoc reload jitter)
  useEffect(() => {
    if (!previewHtml || !iframeRef.current) return;
    const doc = iframeRef.current.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write(previewHtml);
    doc.close();
  }, [previewHtml]);

  const changePaper = (p: "58mm" | "80mm") => {
    setPaper(p);
    setReceiptPaperWidth(p);
  };

  const handleDirectPrint = async () => {
    if (!user || !sale || busy) return;
    setBusy(true);
    try {
      let preparedBluetoothPrinterId: string | null = null;
      const activeId = localStorage.getItem("sahla.printer.active");
      if (activeId) {
        try {
          const printers = JSON.parse(localStorage.getItem("sahla.printers") || "[]") as any[];
          const ap = printers.find((p) => p.id === activeId);
          if (ap?.connection === "bluetooth") {
            const { isWebBluetoothSupported, prepareBluetoothPrinter } = await import("@/lib/bt-printer");
            if (isWebBluetoothSupported()) {
              const prepared = await prepareBluetoothPrinter({ promptIfMissing: true });
              preparedBluetoothPrinterId = prepared?.id || null;
            }
          }
        } catch (e) {
          const m = (e as Error).message || "";
          if (!m.toLowerCase().includes("cancel")) toast.error(m || "تعذر تجهيز الطابعة");
          return;
        }
      }
      await printReceiptDirect({
        userId: user.id,
        saleSeq: seq,
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
        prevDebt,
        isDemo,
      });
    } finally {
      setBusy(false);
    }
  };

  const handleSystemPrint = () => {
    if (!iframeRef.current) return;
    try {
      const win = iframeRef.current.contentWindow;
      if (!win) return;
      win.focus();
      win.print();
    } catch (e) {
      toast.error("تعذر فتح نافذة الطباعة");
    }
  };

  const handleSavePdf = () => {
    // فتح المعاينة في نافذة جديدة وتشغيل الطباعة → "حفظ كـ PDF"
    if (!previewHtml) return;
    const w = window.open("", "_blank", "width=420,height=720");
    if (!w) { toast.error("اسمح بالنوافذ المنبثقة لحفظ PDF"); return; }
    w.document.open();
    w.document.write(previewHtml);
    w.document.close();
    setTimeout(() => { try { w.focus(); w.print(); } catch {} }, 400);
  };

  if (!sale) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" dir="rtl">
        <div className="text-muted-foreground">جاري التحميل...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/20 flex flex-col" dir="rtl">
      <header className="sticky top-0 z-40 bg-gradient-primary text-primary-foreground shadow-md">
        <div className="flex h-14 items-center justify-between px-4">
          <button
            onClick={() => navigate({ to: "/app/sales/$saleId", params: { saleId } })}
            className="rounded-lg p-2 hover:bg-white/10"
            aria-label="رجوع"
          >
            <ArrowRight className="h-6 w-6 rotate-180" />
          </button>
          <h1 className="text-lg font-bold">طباعة الوصل #{seq}</h1>
          <div className="w-10" />
        </div>
      </header>

      <main className="flex-1 p-4 space-y-4 max-w-md mx-auto w-full">
        {/* Paper selector */}
        <div className="bg-card rounded-xl border p-3">
          <div className="text-sm font-semibold mb-2 text-right">عرض الورق</div>
          <div className="grid grid-cols-2 gap-2">
            {(["58mm", "80mm"] as const).map((p) => (
              <button
                key={p}
                onClick={() => changePaper(p)}
                className={`h-10 rounded-lg text-sm font-bold border transition ${
                  paper === p
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div className="bg-card rounded-xl border p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold">معاينة مباشرة</div>
            <button
              onClick={() => {
                if (!iframeRef.current || !previewHtml) return;
                const doc = iframeRef.current.contentDocument;
                if (!doc) return;
                doc.open(); doc.write(previewHtml); doc.close();
              }}
              className="text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground"
            >
              <RefreshCw className="h-3.5 w-3.5" /> تحديث
            </button>
          </div>
          <div className="flex justify-center bg-muted/40 rounded-lg p-2">
            <iframe
              ref={iframeRef}
              title="receipt-preview"
              style={{
                width: paper === "58mm" ? 220 : 300,
                height: 520,
                border: "1px solid hsl(var(--border))",
                background: "#fff",
              }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-1 gap-2">
          <button
            onClick={handleDirectPrint}
            disabled={busy}
            className="h-12 rounded-lg bg-primary text-primary-foreground font-bold flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <Bluetooth className="h-5 w-5" />
            {busy ? "جاري الطباعة..." : "طباعة على الطابعة الافتراضية"}
          </button>
          <button
            onClick={handleSystemPrint}
            className="h-12 rounded-lg bg-foreground text-background font-bold flex items-center justify-center gap-2"
          >
            <Printer className="h-5 w-5" /> طباعة عبر النظام
          </button>
          <button
            onClick={handleSavePdf}
            className="h-12 rounded-lg border-2 border-foreground text-foreground font-bold flex items-center justify-center gap-2"
          >
            <FileDown className="h-5 w-5" /> حفظ PDF
          </button>
        </div>

        <div className="text-xs text-muted-foreground text-center leading-relaxed">
          نصيحة: عند حفظ PDF على أندرويد، اختر «حجم الورق ← مخصّص» وضع العرض {paper === "58mm" ? "58" : "80"}مم
          والطول «تلقائي» للحصول على نتيجة مطابقة للطابعة الحرارية.
        </div>
      </main>
    </div>
  );
}
