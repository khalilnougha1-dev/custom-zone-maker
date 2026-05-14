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
    const receiptWidthPx = activePrinter.paper === "A4" ? 384 : Math.min(paperWidthPx, 384);
    const receiptWidthMm = activePrinter.paper === "A4" ? 72 : Math.min(paperWidthMm, 58);
    const isCompactReceipt = receiptWidthPx <= 384;
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
        <td style="padding:5px 0 3px;text-align:right;font-weight:700;font-size:${isCompactReceipt ? 15 : 18}px;line-height:1.3;word-break:break-word;">${index + 1}. ${i.product_name}</td>
      </tr>
      <tr>
        <td style="padding:0 0 6px;border-bottom:1px dashed #000;">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;font-family:'Courier New',monospace;font-size:${isCompactReceipt ? 12 : 17}px;direction:ltr;">
            <span>${(i.unit_price * i.quantity).toFixed(2)}</span>
            <span>${i.unit_price.toFixed(2)} × ${i.quantity}</span>
          </div>
        </td>
      </tr>`,
      )
      .join("");

    const lineStyle = `display:flex;justify-content:space-between;align-items:flex-start;gap:10px;padding:${isCompactReceipt ? 2 : 4}px 0;`;
    const labelStyle = `font-size:${isCompactReceipt ? 14 : 18}px;font-weight:700;white-space:nowrap;`;
    const valueStyle = `font-size:${isCompactReceipt ? 13 : 18}px;font-family:'Courier New',monospace;font-weight:700;text-align:left;direction:ltr;unicode-bidi:embed;`;

    // Single inline-styled block — used for both system print and bluetooth raster
    const receiptBody = `
      <div style="width:100%;font-family:Arial,'Tahoma',sans-serif;color:#000;background:#fff;padding:0;direction:rtl;box-sizing:border-box;" dir="rtl">
        <div style="text-align:center;border-bottom:2px solid #000;padding-bottom:${isCompactReceipt ? 6 : 8}px;margin-bottom:${isCompactReceipt ? 6 : 8}px;">
          <div style="font-size:${isCompactReceipt ? 20 : 30}px;font-weight:900;line-height:1.2;">وصل بيع رقم</div>
          <div style="font-size:${isCompactReceipt ? 24 : 34}px;font-weight:900;line-height:1.2;margin-top:3px;">${d.saleSeq}</div>
        </div>

        <div style="border-bottom:1px dashed #000;padding-bottom:${isCompactReceipt ? 6 : 8}px;margin-bottom:${isCompactReceipt ? 6 : 8}px;">
          <div style="${lineStyle}">
            <span style="${valueStyle}">${dateStr}</span>
            <span style="${labelStyle}">التاريخ</span>
          </div>
          <div style="${lineStyle}">
            <span style="${valueStyle}">${timeStr}</span>
            <span style="${labelStyle}">الوقت</span>
          </div>
          <div style="${lineStyle}">
            <span style="font-size:${isCompactReceipt ? 14 : 18}px;font-weight:700;text-align:right;flex:1;word-break:break-word;">${d.customerName}</span>
            <span style="${labelStyle}">الزبون</span>
          </div>
        </div>

        <table style="width:100%;border-collapse:collapse;table-layout:fixed;">
          <tbody>${rows}</tbody>
        </table>

        <div style="border-top:2px solid #000;border-bottom:2px solid #000;padding:${isCompactReceipt ? 6 : 8}px 0;margin-top:${isCompactReceipt ? 6 : 8}px;">
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

        ${d.note ? `<div style="margin-top:${isCompactReceipt ? 8 : 10}px;border-bottom:1px dashed #000;padding-bottom:${isCompactReceipt ? 6 : 8}px;"><div style="font-size:${isCompactReceipt ? 14 : 18}px;font-weight:700;margin-bottom:4px;">ملاحظة</div><div style="font-size:${isCompactReceipt ? 13 : 17}px;line-height:1.5;word-break:break-word;">${d.note}</div></div>` : ""}

        <div style="text-align:center;margin-top:${isCompactReceipt ? 9 : 12}px;font-size:${isCompactReceipt ? 16 : 23}px;font-weight:900;">شكراً لتعاملكم معنا</div>
        ${isDemo ? `<div style="text-align:center;margin-top:6px;font-size:${isCompactReceipt ? 11 : 16}px;line-height:1.4;">KuaiPOS 9.10 Illizi - Version Demo</div>` : ""}
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
        width: ${receiptWidthMm}mm !important;
        min-width: ${receiptWidthMm}mm !important;
        max-width: ${receiptWidthMm}mm !important;
        margin: 0 auto !important;
        padding: ${isCompactReceipt ? 1.8 : 2.5}mm ${isCompactReceipt ? 1.6 : 2.5}mm 4mm !important;
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
        {
          columns: [
            { text: `التاريخ: ${dateStr}`, width: 1.45, align: "right" as const },
            { text: timeStr, width: 0.95, align: "left" as const, direction: "ltr" as const },
          ],
          size: 14,
        },
        {
          columns: [
            { text: `الزبون: ${d.customerName}`, width: 1.45, align: "right" as const, bold: true },
            { text: "", width: 0.95 },
          ],
          size: 14,
          gapTop: 2,
        },
        { text: `وصل بيع رقم: ${d.saleSeq}`, align: "center" as const, size: 20, bold: true, gapTop: 8 },
        {
          columns: [
            { text: "المنتج", width: 1.8, align: "right" as const, bold: true },
            { text: "الكمية", width: 0.7, align: "center" as const, bold: true },
            { text: "السعر", width: 0.8, align: "center" as const, bold: true },
            { text: "المبلغ", width: 0.9, align: "left" as const, bold: true },
          ],
          size: 14,
          gapTop: 8,
        },
        { dashed: true, gapTop: 2 },
        ...d.items.flatMap((item) => [
          {
            columns: [
              { text: item.product_name, width: 1.8, align: "right" as const, bold: true },
              { text: String(item.quantity), width: 0.7, align: "center" as const, direction: "ltr" as const },
              { text: item.unit_price.toFixed(2), width: 0.8, align: "center" as const, direction: "ltr" as const },
              {
                text: (item.unit_price * item.quantity).toFixed(2),
                width: 0.9,
                align: "left" as const,
                direction: "ltr" as const,
              },
            ],
            size: 15,
            gapTop: 2,
          },
          { dashed: true, gapTop: 2 },
        ]),
        {
          columns: [
            { text: "المجموع", width: 1.6, align: "right" as const, bold: true },
            { text: total.toFixed(2), width: 1, align: "left" as const, bold: true, direction: "ltr" as const },
          ],
          size: 16,
          gapTop: 2,
        },
        { dashed: true, gapTop: 2 },
        {
          columns: [
            { text: "الديون السابقة", width: 1.6, align: "right" as const },
            { text: prevDebt.toFixed(2), width: 1, align: "left" as const, direction: "ltr" as const },
          ],
          size: 15,
          gapTop: 2,
        },
        {
          columns: [
            { text: "المبلغ المدفوع", width: 1.6, align: "right" as const },
            { text: paidNum.toFixed(2), width: 1, align: "left" as const, direction: "ltr" as const },
          ],
          size: 15,
          gapTop: 2,
        },
        {
          columns: [
            { text: "المبلغ المتبقي", width: 1.6, align: "right" as const },
            { text: rest.toFixed(2), width: 1, align: "left" as const, direction: "ltr" as const },
          ],
          size: 15,
          gapTop: 2,
        },
        ...(d.note ? [{ text: `ملاحظة: ${d.note}`, align: "right" as const, size: 14, gapTop: 8 }] : []),
        { text: "شكراً", align: "center" as const, size: 16, gapTop: 10 },
        ...(isDemo ? [{ text: "KuaiPOS 9.10 Illizi - Version Demo", align: "center" as const, size: 13, direction: "ltr" as const, gapTop: 4 }] : []),
      ];

      const MAX_ATTEMPTS = 3;
      let lastError: unknown = null;
      let printed = false;

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
          if (attempt > 1) {
            toast.message(`إعادة المحاولة ${attempt} من ${MAX_ATTEMPTS}...`);
          } else {
            toast.message("جاري الإرسال إلى الطابعة...");
          }

          await printSimpleReceiptBluetooth(simpleLines, paperWidthPx);
          toast.success("تم إرسال الوصل إلى الطابعة");
          printed = true;
          break;
        } catch (err) {
          lastError = err;
          const msg = (err as Error)?.message || "";
          console.warn(`Bluetooth print attempt ${attempt} failed:`, err);

          // لا نعيد المحاولة عند إلغاء المستخدم
          if (PRINT_ABORT_MESSAGES.some((token) => msg.toLowerCase().includes(token))) {
            break;
          }

          if (attempt < MAX_ATTEMPTS) {
            await new Promise((r) => setTimeout(r, 700 * attempt));
          }
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

