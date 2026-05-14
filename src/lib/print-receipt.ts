import { supabase } from "@/integrations/supabase/client";
import { getActivePrinter, getPaperWidthMm, getPaperWidthPx, getReceiptPaperWidth } from "@/lib/printer-config";
import { toast } from "sonner";

let receiptPrintInFlight = false;
const PRINT_ABORT_MESSAGES = ["cancel", "aborted", "notfounderror", "user gesture"];

function getBluetoothWidthCandidates(width: number) {
  return Array.from(new Set([Math.min(width, 576), 384].filter((value) => value > 0)));
}

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
  package_qty?: number | null;
  package_units_count?: number | null;
};

function fmtQty(i: ReceiptItem): string {
  if (i.package_qty && i.package_units_count) {
    const pq = Number(i.package_qty);
    const pqStr = Number.isInteger(pq) ? String(pq) : String(pq);
    return `${pqStr}×${i.package_units_count}`;
  }
  const q = Number(i.quantity);
  return Number.isInteger(q) ? String(q) : String(q);
}

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
  /** Pass to skip prev-debt query (huge speedup) */
  prevDebt?: number;
  /** Pass to skip subscription query */
  isDemo?: boolean;
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

    // عرض الورق المختار من المستخدم لوصل البيع — يطغى على إعداد الطابعة (إلا A4)
    const receiptPaper = getReceiptPaperWidth(); // "58mm" | "80mm"
    const effectivePaper = activePrinter.paper === "A4" ? "A4" : receiptPaper;
    const paperWidthPx = getPaperWidthPx(effectivePaper);
    const paperWidthMm = getPaperWidthMm(effectivePaper);
    const receiptWidthPx = effectivePaper === "A4" ? 576 : paperWidthPx;
    const receiptWidthMm = effectivePaper === "A4" ? 72 : paperWidthMm;
    const isCompactReceipt = effectivePaper === "58mm";
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

    // الديون السابقة — تخطّي الاستعلام إذا تم تمريرها مسبقًا
    let prevDebt = 0;
    if (typeof d.prevDebt === "number") {
      prevDebt = Math.max(0, d.prevDebt);
    } else if (d.customerId) {
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

    // حالة التفعيل — تخطّي الاستعلام إذا تم تمريرها مسبقًا
    let isDemo = true;
    if (typeof d.isDemo === "boolean") {
      isDemo = d.isDemo;
    } else {
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
    }

    const total = d.total;
    const paidNum = d.paid;
    const rest = Math.max(0, total - paidNum);

    const numCell = `font-family:'Courier New',monospace;font-weight:900;direction:ltr;unicode-bidi:embed;`;
    const headerCell = `font-weight:900;padding:5px 2px;border-bottom:2px solid #000;font-size:${isCompactReceipt ? 16 : 19}px;`;
    const bodyCell = `padding:7px 2px;border-bottom:1px dashed #000;font-size:${isCompactReceipt ? 17 : 20}px;vertical-align:top;font-weight:900;`;

    const itemRows = d.items
      .map(
        (i) => `
      <tr>
        <td style="${bodyCell}text-align:right;word-break:break-word;">${i.product_name}</td>
        <td style="${bodyCell}${numCell}text-align:center;">${fmtQty(i)}</td>
        <td style="${bodyCell}${numCell}text-align:center;">${i.unit_price.toFixed(2)}</td>
        <td style="${bodyCell}${numCell}text-align:left;">${(i.unit_price * i.quantity).toFixed(2)}</td>
      </tr>`,
      )
      .join("");

    const sumRow = (label: string, value: string, bold = false) => `
      <tr>
        <td style="padding:5px 2px;text-align:right;font-weight:900;font-size:${bold ? (isCompactReceipt ? 20 : 24) : (isCompactReceipt ? 17 : 20)}px;">${label}</td>
        <td style="padding:5px 2px;${numCell}text-align:left;font-weight:900;font-size:${bold ? (isCompactReceipt ? 20 : 24) : (isCompactReceipt ? 17 : 20)}px;">${value}</td>
      </tr>`;

    // Single inline-styled block — used for both system print and bluetooth raster
    const receiptBody = `
      <div style="width:100%;font-family:Arial,'Tahoma',sans-serif;color:#000;background:#fff;padding:0;direction:rtl;box-sizing:border-box;line-height:1.4;font-weight:900;" dir="rtl">

        <table style="width:100%;border-collapse:collapse;margin-bottom:6px;">
          <tbody>
            <tr>
              <td style="padding:3px 0;text-align:right;font-size:${isCompactReceipt ? 15 : 18}px;font-weight:900;">التاريخ:</td>
              <td style="padding:3px 0;text-align:left;${numCell}font-size:${isCompactReceipt ? 15 : 18}px;">${dateStr} ${timeStr}</td>
            </tr>
            <tr>
              <td style="padding:3px 0;text-align:right;font-size:${isCompactReceipt ? 15 : 18}px;font-weight:900;">الزبون:</td>
              <td style="padding:3px 0;text-align:left;font-size:${isCompactReceipt ? 15 : 18}px;font-weight:900;word-break:break-word;">${d.customerName}</td>
            </tr>
          </tbody>
        </table>

        <div style="text-align:center;font-size:${isCompactReceipt ? 22 : 26}px;font-weight:900;margin:6px 0 8px;">وصل بيع رقم: ${d.saleSeq}</div>

        <table style="width:100%;border-collapse:collapse;table-layout:fixed;">
          <colgroup>
            <col style="width:46%;" />
            <col style="width:14%;" />
            <col style="width:18%;" />
            <col style="width:22%;" />
          </colgroup>
          <thead>
            <tr>
              <th style="${headerCell}text-align:right;">المنتج</th>
              <th style="${headerCell}text-align:center;">الكمية</th>
              <th style="${headerCell}text-align:center;">السعر</th>
              <th style="${headerCell}text-align:left;">المبلغ</th>
            </tr>
          </thead>
          <tbody>${itemRows}</tbody>
        </table>

        <table style="width:100%;border-collapse:collapse;margin-top:8px;">
          <tbody>
            ${sumRow("المجموع", total.toFixed(2), true)}
          </tbody>
        </table>

        <div style="border-top:2px solid #000;margin-top:6px;padding-top:6px;">
          <table style="width:100%;border-collapse:collapse;">
            <tbody>
              ${sumRow("الديون السابقة", prevDebt.toFixed(2))}
              ${sumRow("المبلغ المدفوع", paidNum.toFixed(2))}
              ${sumRow("المبلغ المتبقي", rest.toFixed(2))}
            </tbody>
          </table>
        </div>

        ${d.note ? `<div style="margin-top:8px;border-top:1px dashed #000;padding-top:5px;font-size:${isCompactReceipt ? 15 : 18}px;font-weight:900;"><b>ملاحظة:</b> ${d.note}</div>` : ""}

        <div style="text-align:center;margin-top:14px;font-size:${isCompactReceipt ? 15 : 18}px;font-weight:900;">اعد الحساب من فضلك</div>
      </div>`;

    const html = `<html dir="rtl"><head><meta charset="utf-8"><title>وصل بيع ${d.saleSeq}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <style>
      @page { size: ${paperWidthMm}mm auto; margin: 0; }
      * { box-sizing: border-box; }
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        width: ${paperWidthMm}mm !important;
        min-height: 0 !important;
        height: auto !important;
        background: #fff;
        color: #000;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      body {
        padding: ${isCompactReceipt ? 1.5 : 2.5}mm ${isCompactReceipt ? 1.5 : 2.5}mm ${isCompactReceipt ? 3 : 4}mm !important;
      }
      table { page-break-inside: avoid; }
    </style>
    </head><body>${receiptBody}</body></html>`;

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

      const simpleLines: any[] = [
        {
          columns: [
            { text: `التاريخ:`, width: 0.6, align: "right" as const, bold: true },
            { text: `${dateStr} ${timeStr}`, width: 1.4, align: "left" as const, direction: "ltr" as const, bold: true },
          ],
          size: isCompactReceipt ? 20 : 24,
        },
        {
          columns: [
            { text: `الزبون:`, width: 0.5, align: "right" as const, bold: true },
            { text: d.customerName, width: 1.5, align: "left" as const, bold: true },
          ],
          size: isCompactReceipt ? 20 : 24,
          gapTop: 4,
        },
        { text: `وصل بيع رقم: ${d.saleSeq}`, align: "center" as const, size: isCompactReceipt ? 26 : 30, bold: true, gapTop: 10 },
        { dashed: true, gapTop: 6 },
        {
          columns: [
            { text: "المنتج", width: 1.4, align: "right" as const, bold: true },
            { text: "الكمية", width: 0.55, align: "center" as const, bold: true },
            { text: "السعر", width: 0.55, align: "center" as const, bold: true },
            { text: "المبلغ", width: 0.7, align: "left" as const, bold: true },
          ],
          size: isCompactReceipt ? 19 : 22,
          gapTop: 4,
        },
        { dashed: true, gapTop: 4 },
        ...d.items.map((item) => ({
          columns: [
            { text: item.product_name, width: 1.4, align: "right" as const, bold: true },
            { text: fmtQty(item), width: 0.55, align: "center" as const, direction: "ltr" as const, bold: true },
            { text: item.unit_price.toFixed(2), width: 0.55, align: "center" as const, direction: "ltr" as const, bold: true },
            { text: (item.unit_price * item.quantity).toFixed(2), width: 0.7, align: "left" as const, direction: "ltr" as const, bold: true },
          ],
          size: isCompactReceipt ? 20 : 24,
          gapTop: 6,
        })),
        { dashed: true, gapTop: 6 },
        {
          columns: [
            { text: "المجموع", width: 1.2, align: "right" as const, bold: true },
            { text: total.toFixed(2), width: 1.0, align: "left" as const, bold: true, direction: "ltr" as const },
          ],
          size: isCompactReceipt ? 26 : 30,
          gapTop: 6,
        },
        { dashed: true, gapTop: 6 },
        {
          columns: [
            { text: "الديون السابقة", width: 1.3, align: "right" as const, bold: true },
            { text: prevDebt.toFixed(2), width: 0.9, align: "left" as const, direction: "ltr" as const, bold: true },
          ],
          size: isCompactReceipt ? 20 : 24,
          gapTop: 6,
        },
        {
          columns: [
            { text: "المبلغ المدفوع", width: 1.3, align: "right" as const, bold: true },
            { text: paidNum.toFixed(2), width: 0.9, align: "left" as const, direction: "ltr" as const, bold: true },
          ],
          size: isCompactReceipt ? 20 : 24,
          gapTop: 4,
        },
        {
          columns: [
            { text: "المبلغ المتبقي", width: 1.3, align: "right" as const, bold: true },
            { text: rest.toFixed(2), width: 0.9, align: "left" as const, direction: "ltr" as const, bold: true },
          ],
          size: isCompactReceipt ? 20 : 24,
          gapTop: 4,
        },
        ...(d.note ? [{ text: `ملاحظة: ${d.note}`, align: "right" as const, size: isCompactReceipt ? 18 : 22, gapTop: 8, bold: true }] : []),
        { text: "اعد الحساب من فضلك", align: "center" as const, size: isCompactReceipt ? 20 : 24, gapTop: 16, bold: true },
      ];


      const widthCandidates = getBluetoothWidthCandidates(receiptWidthPx);
      const MAX_ATTEMPTS = widthCandidates.length;
      let lastError: unknown = null;
      let printed = false;

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        const targetWidth = widthCandidates[attempt - 1];
        try {
          await printSimpleReceiptBluetooth(simpleLines, targetWidth);
          toast.success("تمت الطباعة");
          printed = true;
          break;
        } catch (err) {
          lastError = err;
          const msg = (err as Error)?.message || "";
          console.warn(`Bluetooth print attempt ${attempt} failed:`, err);
          if (PRINT_ABORT_MESSAGES.some((token) => msg.toLowerCase().includes(token))) break;
          if (attempt < MAX_ATTEMPTS) await new Promise((r) => setTimeout(r, 250));
        }
      }

      if (printed) return;

      const message = (lastError as Error)?.message || "فشل الطباعة";
      const isCancelled = PRINT_ABORT_MESSAGES.some((token) => message.toLowerCase().includes(token));
      const isConnectionIssue =
        message.includes("NetworkError") ||
        message.includes("GATT Server is disconnected") ||
        message.includes("gatt.connect") ||
        message.includes("انتهت مهلة الاتصال") ||
        message.includes("تعذر إعادة الاتصال");
      const isSendIssue =
        message.includes("انتهت مهلة إرسال") ||
        message.includes("تعذر إرسال") ||
        message.includes("تعذر إيجاد قناة الكتابة");
      const isBusy = message.includes("GATT operation already in progress");

      if (isCancelled) return;

      let userMessage: string;
      if (isBusy) {
        userMessage = "الطابعة مشغولة حاليًا. أعد المحاولة بعد ثوانٍ قليلة.";
      } else if (isConnectionIssue) {
        userMessage = `فشل الاتصال بالطابعة بعد ${MAX_ATTEMPTS} محاولات. تأكد من تشغيل الطابعة وقربها من الجهاز ثم أعد المحاولة.`;
      } else if (isSendIssue) {
        userMessage = `فشل إرسال البيانات إلى الطابعة بعد ${MAX_ATTEMPTS} محاولات. أعد تشغيل الطابعة ثم حاول مجددًا.`;
      } else {
        userMessage = `فشلت الطباعة: ${message}`;
      }

      toast.error(userMessage, {
        action: {
          label: "طباعة عبر النظام",
          onClick: () => {
            openSystemPrintDialog(html).catch(() => {
              toast.error("تعذر فتح نافذة طباعة النظام");
            });
          },
        },
      });
    } catch (e) {
      console.warn("Bluetooth print pipeline failed:", e);
      toast.error((e as Error)?.message || "فشل الطباعة");
    }
  } finally {
    receiptPrintInFlight = false;
  }
}


// ===================== Receipt preview (no DB calls) =====================

export type PreviewReceiptInput = {
  saleSeq: number;
  customerName: string;
  items: ReceiptItem[];
  total: number;
  paid: number;
  prevDebt?: number;
  note?: string | null;
  isDemo?: boolean;
  createdAt?: string | Date;
};

export function buildReceiptHtmlPreview(d: PreviewReceiptInput, paper: "58mm" | "80mm" = "80mm") {
  const paperWidthMm = paper === "58mm" ? 58 : 80;
  const receiptWidthMm = paperWidthMm;
  const isCompactReceipt = paper === "58mm";

  const date = d.createdAt ? new Date(d.createdAt) : new Date();
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dateStr = `${date.getFullYear()}/${mm}/${dd}`;
  const timeStr = date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  const total = d.total;
  const paidNum = d.paid;
  const prevDebt = Math.max(0, d.prevDebt ?? 0);
  const rest = Math.max(0, total - paidNum);
  const isDemo = d.isDemo ?? true;

  const numCell = `font-family:'Courier New',monospace;font-weight:900;direction:ltr;unicode-bidi:embed;`;
  const headerCell = `font-weight:900;padding:5px 2px;border-bottom:2px solid #000;font-size:${isCompactReceipt ? 16 : 19}px;`;
  const bodyCell = `padding:7px 2px;border-bottom:1px dashed #000;font-size:${isCompactReceipt ? 17 : 20}px;vertical-align:top;font-weight:900;`;

  const itemRows = d.items
    .map(
      (i) => `
    <tr>
      <td style="${bodyCell}text-align:right;word-break:break-word;">${i.product_name}</td>
      <td style="${bodyCell}${numCell}text-align:center;">${fmtQty(i)}</td>
      <td style="${bodyCell}${numCell}text-align:center;">${i.unit_price.toFixed(2)}</td>
      <td style="${bodyCell}${numCell}text-align:left;">${(i.unit_price * i.quantity).toFixed(2)}</td>
    </tr>`,
    )
    .join("");

  const sumRow = (label: string, value: string, bold = false) => `
    <tr>
      <td style="padding:5px 2px;text-align:right;font-weight:900;font-size:${bold ? (isCompactReceipt ? 20 : 24) : (isCompactReceipt ? 17 : 20)}px;">${label}</td>
      <td style="padding:5px 2px;${numCell}text-align:left;font-weight:900;font-size:${bold ? (isCompactReceipt ? 20 : 24) : (isCompactReceipt ? 17 : 20)}px;">${value}</td>
    </tr>`;

  const receiptBody = `
    <div style="width:100%;font-family:Arial,'Tahoma',sans-serif;color:#000;background:#fff;padding:0;direction:rtl;box-sizing:border-box;line-height:1.4;font-weight:900;" dir="rtl">
      <table style="width:100%;border-collapse:collapse;margin-bottom:6px;">
        <tbody>
          <tr>
            <td style="padding:3px 0;text-align:right;font-size:${isCompactReceipt ? 15 : 18}px;font-weight:900;">التاريخ:</td>
            <td style="padding:3px 0;text-align:left;${numCell}font-size:${isCompactReceipt ? 15 : 18}px;">${dateStr} ${timeStr}</td>
          </tr>
          <tr>
            <td style="padding:3px 0;text-align:right;font-size:${isCompactReceipt ? 15 : 18}px;font-weight:900;">الزبون:</td>
            <td style="padding:3px 0;text-align:left;font-size:${isCompactReceipt ? 15 : 18}px;font-weight:900;word-break:break-word;">${d.customerName}</td>
          </tr>
        </tbody>
      </table>
      <div style="text-align:center;font-size:${isCompactReceipt ? 22 : 26}px;font-weight:900;margin:6px 0 8px;">وصل بيع رقم: ${d.saleSeq}</div>
      <table style="width:100%;border-collapse:collapse;table-layout:fixed;">
        <colgroup>
          <col style="width:46%;" />
          <col style="width:14%;" />
          <col style="width:18%;" />
          <col style="width:22%;" />
        </colgroup>
        <thead>
          <tr>
            <th style="${headerCell}text-align:right;">المنتج</th>
            <th style="${headerCell}text-align:center;">الكمية</th>
            <th style="${headerCell}text-align:center;">السعر</th>
            <th style="${headerCell}text-align:left;">المبلغ</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>
      <table style="width:100%;border-collapse:collapse;margin-top:8px;">
        <tbody>${sumRow("المجموع", total.toFixed(2), true)}</tbody>
      </table>
      <div style="border-top:2px solid #000;margin-top:6px;padding-top:6px;">
        <table style="width:100%;border-collapse:collapse;">
          <tbody>
            ${sumRow("الديون السابقة", prevDebt.toFixed(2))}
            ${sumRow("المبلغ المدفوع", paidNum.toFixed(2))}
            ${sumRow("المبلغ المتبقي", rest.toFixed(2))}
          </tbody>
        </table>
      </div>
      ${d.note ? `<div style="margin-top:8px;border-top:1px dashed #000;padding-top:5px;font-size:${isCompactReceipt ? 15 : 18}px;font-weight:900;"><b>ملاحظة:</b> ${d.note}</div>` : ""}
      <div style="text-align:center;margin-top:14px;font-size:${isCompactReceipt ? 15 : 18}px;font-weight:900;">اعد الحساب من فضلك</div>
    </div>`;

  return `<html dir="rtl"><head><meta charset="utf-8"><title>معاينة وصل ${d.saleSeq}</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    @page { size: ${paperWidthMm}mm auto; margin: 0; }
    * { box-sizing: border-box; }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      width: ${paperWidthMm}mm !important;
      min-height: 0 !important;
      height: auto !important;
      background: #fff;
      color: #000;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body { padding: ${isCompactReceipt ? 1.5 : 2.5}mm ${isCompactReceipt ? 1.5 : 2.5}mm ${isCompactReceipt ? 3 : 4}mm !important; }
    table { page-break-inside: avoid; }
  </style>
  </head><body>${receiptBody}</body></html>`;
}

export const SAMPLE_RECEIPT: PreviewReceiptInput = {
  saleSeq: 1001,
  customerName: "زبون تجريبي",
  items: [
    { product_name: "منتج (أ)", quantity: 2, unit_price: 150 },
    { product_name: "منتج (ب) باسم طويل لاختبار الالتفاف", quantity: 1, unit_price: 75.5 },
    { product_name: "منتج (ج)", quantity: 3, unit_price: 40 },
  ],
  total: 495.5,
  paid: 400,
  prevDebt: 120,
  note: "هذا وصل تجريبي للمعاينة فقط",
  isDemo: true,
};
