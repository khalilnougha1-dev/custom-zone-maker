import { supabase } from "@/integrations/supabase/client";
import { getActivePrinter, getPaperWidthMm, getPaperWidthPx } from "@/lib/printer-config";
import { toast } from "sonner";

let receiptPrintInFlight = false;
const PRINT_ABORT_MESSAGES = ["cancel", "aborted", "notfounderror", "user gesture"];

async function openSystemPrintDialog(html: string) {
  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;left:-9999px;top:0;width:0;height:0;border:0;";
  document.body.appendChild(iframe);

  try {
    const doc = iframe.contentDocument;
    if (!doc) throw new Error("تعذر فتح نافذة الطباعة");

    doc.open();
    doc.write(html);
    doc.close();

    await new Promise((resolve) => setTimeout(resolve, 350));
    const frameWindow = iframe.contentWindow;
    if (!frameWindow) throw new Error("تعذر فتح نافذة الطباعة");

    await new Promise<void>((resolve) => {
      const done = () => {
        frameWindow.removeEventListener?.("afterprint", done);
        resolve();
      };

      frameWindow.addEventListener?.("afterprint", done, { once: true });
      window.setTimeout(done, 1200);
      frameWindow.focus();
      frameWindow.print();
    });
  } finally {
    setTimeout(() => iframe.remove(), 1500);
  }
}

export type ReceiptItem = {
  product_name: string;
  quantity: number;
  unit_price: number;
};

export type ReceiptData = {
  userId: string;
  saleSeq: number;
  customerId: string | null;
  customerName: string;
  items: ReceiptItem[];
  total: number;
  paid: number;
  note?: string | null;
  createdAt?: string | Date;
  preparedBluetoothPrinterId?: string | null;
};

export async function printReceipt(d: ReceiptData) {
  if (receiptPrintInFlight) {
    toast.message("الطباعة قيد التنفيذ، يرجى الانتظار...");
    return;
  }

  receiptPrintInFlight = true;

  try {
    const activePrinter = getActivePrinter();
    if (!activePrinter) {
      toast.error("لم يتم تحديد طابعة افتراضية من صفحة الطابعة");
      return;
    }

    const paperWidthPx = getPaperWidthPx(activePrinter.paper || "80mm");
    const paperWidthMm = getPaperWidthMm(activePrinter.paper || "80mm");
    let preparedBluetoothPrinterId = d.preparedBluetoothPrinterId || null;

    if (activePrinter.connection === "bluetooth" && !preparedBluetoothPrinterId) {
      try {
        const { isWebBluetoothSupported, prepareBluetoothPrinter } = await import("./bt-printer");
        if (!isWebBluetoothSupported()) {
          toast.error("متصفحك لا يدعم الطباعة المباشرة. استخدم Chrome على أندرويد.");
          return;
        }

        const preparedPrinter = await prepareBluetoothPrinter({ promptIfMissing: true });
        preparedBluetoothPrinterId = preparedPrinter?.id || null;
      } catch (error) {
        const message = (error as Error).message || "تعذر تجهيز الطابعة";
        if (!PRINT_ABORT_MESSAGES.some((token) => message.toLowerCase().includes(token))) {
          toast.error(message);
        }
        return;
      }
    }

    const date = d.createdAt ? new Date(d.createdAt) : new Date();
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dateStr = `${date.getFullYear()}/${mm}/${dd}`;
    const timeStr = date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

    // الديون السابقة
    let prevDebt = 0;
    if (d.customerId) {
      const { data } = await supabase
        .from("sales")
        .select("total,paid,created_at")
        .eq("user_id", d.userId)
        .eq("customer_id", d.customerId)
        .lt("created_at", date.toISOString());
      prevDebt = (data || []).reduce(
        (s: number, r: any) => s + (Number(r.total) - Number(r.paid || 0)),
        0,
      );
      prevDebt = Math.max(0, prevDebt);
    }

    // حالة التفعيل
    let isDemo = true;
    const { data: prof } = await supabase
      .from("profiles")
      .select("subscription_status,subscription_expires_at,is_active")
      .eq("id", d.userId)
      .maybeSingle();
    if (prof) {
      const exp = prof.subscription_expires_at
        ? new Date(prof.subscription_expires_at).getTime()
        : 0;
      const active =
        prof.is_active &&
        (prof.subscription_status === "permanent" || exp > Date.now());
      isDemo = !active;
    }

    const total = d.total;
    const paidNum = d.paid;
    const rest = Math.max(0, total - paidNum);

    const rows = d.items
      .map(
        (i, index) => `
      <tr>
        <td style="padding:8px 0 6px;text-align:right;font-weight:700;font-size:18px;line-height:1.35;word-break:break-word;">${index + 1}. ${i.product_name}</td>
      </tr>
      <tr>
        <td style="padding:0 0 8px;border-bottom:1px dashed #000;">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;font-family:'Courier New',monospace;font-size:17px;direction:ltr;">
            <span>${(i.unit_price * i.quantity).toFixed(2)}</span>
            <span>${i.unit_price.toFixed(2)} × ${i.quantity}</span>
          </div>
        </td>
      </tr>`,
      )
      .join("");

    const lineStyle = "display:flex;justify-content:space-between;align-items:flex-start;gap:12px;padding:4px 0;";
    const labelStyle = "font-size:18px;font-weight:700;white-space:nowrap;";
    const valueStyle = "font-size:18px;font-family:'Courier New',monospace;font-weight:700;text-align:left;direction:ltr;unicode-bidi:embed;";

    // Single inline-styled block — used for both system print and bluetooth raster
    const receiptBody = `
      <div style="width:100%;font-family:Arial,'Tahoma',sans-serif;color:#000;background:#fff;padding:0;direction:rtl;box-sizing:border-box;" dir="rtl">
        <div style="text-align:center;border-bottom:2px solid #000;padding-bottom:8px;margin-bottom:8px;">
          <div style="font-size:30px;font-weight:900;line-height:1.2;">وصل بيع رقم</div>
          <div style="font-size:34px;font-weight:900;line-height:1.2;margin-top:4px;">${d.saleSeq}</div>
        </div>

        <div style="border-bottom:1px dashed #000;padding-bottom:8px;margin-bottom:8px;">
          <div style="${lineStyle}">
            <span style="${valueStyle}">${dateStr}</span>
            <span style="${labelStyle}">التاريخ</span>
          </div>
          <div style="${lineStyle}">
            <span style="${valueStyle}">${timeStr}</span>
            <span style="${labelStyle}">الوقت</span>
          </div>
          <div style="${lineStyle}">
            <span style="font-size:18px;font-weight:700;text-align:right;flex:1;word-break:break-word;">${d.customerName}</span>
            <span style="${labelStyle}">الزبون</span>
          </div>
        </div>

        <table style="width:100%;border-collapse:collapse;table-layout:fixed;">
          <tbody>${rows}</tbody>
        </table>

        <div style="border-top:2px solid #000;border-bottom:2px solid #000;padding:8px 0;margin-top:8px;">
          <div style="${lineStyle}">
            <span style="${valueStyle}">${total.toFixed(2)}</span>
            <span style="${labelStyle}">المجموع</span>
          </div>
          <div style="${lineStyle}">
            <span style="${valueStyle}">${prevDebt.toFixed(2)}</span>
            <span style="${labelStyle}">الديون السابقة</span>
          </div>
          <div style="${lineStyle}">
            <span style="${valueStyle}">${paidNum.toFixed(2)}</span>
            <span style="${labelStyle}">المدفوع</span>
          </div>
          <div style="${lineStyle}">
            <span style="${valueStyle}">${rest.toFixed(2)}</span>
            <span style="${labelStyle}">المتبقي</span>
          </div>
        </div>

        ${d.note ? `<div style="margin-top:10px;border-bottom:1px dashed #000;padding-bottom:8px;"><div style="font-size:18px;font-weight:700;margin-bottom:4px;">ملاحظة</div><div style="font-size:17px;line-height:1.5;word-break:break-word;">${d.note}</div></div>` : ""}

        <div style="text-align:center;margin-top:12px;font-size:23px;font-weight:900;">شكراً لتعاملكم معنا</div>
        ${isDemo ? `<div style="text-align:center;margin-top:8px;font-size:16px;line-height:1.4;">KuaiPOS 9.10 Illizi - Version Demo</div>` : ""}
      </div>`;

    const html = `<html dir="rtl"><head><meta charset="utf-8"><title>وصل بيع ${d.saleSeq}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      @page { size: ${paperWidthMm}mm auto; margin: 0; }
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        width: ${paperWidthMm}mm !important;
        min-width: ${paperWidthMm}mm !important;
        max-width: ${paperWidthMm}mm !important;
        background: #fff;
        overflow: hidden;
      }
      body {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
      .receipt-sheet {
        width: ${paperWidthMm}mm !important;
        min-width: ${paperWidthMm}mm !important;
        max-width: ${paperWidthMm}mm !important;
        margin: 0 auto !important;
        padding: 2.5mm 2.5mm 4mm !important;
        box-sizing: border-box !important;
        background: #fff;
      }
      @media screen {
        html, body {
          background: #fff;
        }
      }
    </style>
    </head><body><div class="receipt-sheet">${receiptBody}</div></body></html>`;

    if (activePrinter.connection === "system") {
      await openSystemPrintDialog(html);
      toast.success("تم إرسال الوصل إلى نافذة الطباعة");
      return;
    }

    if (activePrinter.connection !== "bluetooth") {
      toast.error("نوع الطابعة المحدد غير مدعوم بعد للطباعة المباشرة");
      return;
    }

    // Direct Bluetooth printing — no system dialog
    try {
      const { printSimpleReceiptBluetooth, isWebBluetoothSupported, pairPrinter, syncRememberedBluetoothPrinter, clearRememberedPrinter } =
        await import("./bt-printer");

      if (!isWebBluetoothSupported()) {
        toast.error("متصفحك لا يدعم الطباعة المباشرة. استخدم Chrome على أندرويد.");
        return;
      }

      const rememberedPrinterId = localStorage.getItem("sahla.bt.printerId");

      if (preparedBluetoothPrinterId) {
        syncRememberedBluetoothPrinter(preparedBluetoothPrinterId, activePrinter.name);
      } else if (!rememberedPrinterId && activePrinter.address) {
        syncRememberedBluetoothPrinter(activePrinter.address, activePrinter.name);
      } else if (!rememberedPrinterId) {
        clearRememberedPrinter();
      }

      // Auto-pair only when no printer was prepared earlier in the same user click.
      if (!localStorage.getItem("sahla.bt.printerId")) {
        toast.message("اختر الطابعة من القائمة");
        try {
          const paired = await pairPrinter();
          syncRememberedBluetoothPrinter(paired.id, paired.name);
        } catch (err) {
          const pairMessage = (err as Error).message || "لم يتم اختيار طابعة";
          if (!PRINT_ABORT_MESSAGES.some((token) => pairMessage.toLowerCase().includes(token))) {
            toast.error(pairMessage);
          }
          return;
        }
      }

      const simpleLines = [
        { text: `وصل بيع رقم ${d.saleSeq}`, align: "center" as const, size: 28, bold: true },
        { dashed: true },
        { text: `التاريخ ${dateStr}`, align: "right" as const, size: 20, bold: true },
        { text: `الوقت ${timeStr}`, align: "right" as const, size: 20 },
        { text: `الزبون ${d.customerName}`, align: "right" as const, size: 20, bold: true },
        { dashed: true },
        ...d.items.flatMap((item, index) => [
          { text: `${index + 1}. ${item.product_name}`, align: "right" as const, size: 21, bold: true },
          {
            text: `${(item.unit_price * item.quantity).toFixed(2)}    ${item.unit_price.toFixed(2)} x ${item.quantity}`,
            align: "left" as const,
            direction: "ltr" as const,
            size: 19,
          },
          { dashed: true },
        ]),
        { text: `المجموع ${total.toFixed(2)}`, align: "right" as const, size: 22, bold: true, gapTop: 4 },
        { text: `الدين السابق ${prevDebt.toFixed(2)}`, align: "right" as const, size: 20 },
        { text: `المدفوع ${paidNum.toFixed(2)}`, align: "right" as const, size: 20 },
        { text: `المتبقي ${rest.toFixed(2)}`, align: "right" as const, size: 22, bold: true },
        ...(d.note ? [{ text: `ملاحظة ${d.note}`, align: "right" as const, size: 19, gapTop: 4 }] : []),
        { dashed: true, gapTop: 4 },
        { text: "شكراً", align: "center" as const, size: 24, bold: true, gapTop: 4 },
        ...(isDemo ? [{ text: "KuaiPOS 9.10 Illizi - Version Demo", align: "center" as const, size: 16, direction: "ltr" as const, gapTop: 4 }] : []),
      ];

      await printSimpleReceiptBluetooth(simpleLines, paperWidthPx);
      toast.success("تم إرسال الوصل إلى الطابعة");
      return;
    } catch (e) {
      console.warn("Bluetooth print failed:", e);
      const message = (e as Error).message || "فشل الطباعة";
      const shouldFallbackToSystemPrint =
        message.includes("NetworkError") ||
        message.includes("GATT Server is disconnected") ||
        message.includes("انتهت مهلة");

      if (shouldFallbackToSystemPrint) {
        try {
          await openSystemPrintDialog(html);
          toast.success("تعذرت طباعة البلوتوث، فتم فتح طباعة النظام كحل بديل");
          return;
        } catch {
          // continue to the main error toast below
        }
      }

      toast.error(
        message.includes("GATT operation already in progress")
          ? "الطابعة مشغولة حاليًا. أعد المحاولة بعد ثوانٍ قليلة."
          : message.includes("NetworkError") || message.includes("GATT Server is disconnected")
            ? "انقطع الاتصال بالطابعة. أعد تشغيل الطابعة ثم أعد المحاولة."
          : message,
      );
    }
  } finally {
    receiptPrintInFlight = false;
  }
}

