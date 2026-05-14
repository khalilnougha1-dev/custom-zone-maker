import { supabase } from "@/integrations/supabase/client";
import { getActivePrinter, getPaperWidthMm, getPaperWidthPx } from "@/lib/printer-config";
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

async function fallbackToSystemPrint(html: string, message?: string) {
  try {
    await openSystemPrintDialog(html);
    toast.success(message || "تم فتح نافذة طباعة النظام كخطة بديلة");
    return true;
  } catch {
    toast.error("تعذر فتح نافذة طباعة النظام");
    return false;
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
    const receiptWidthPx = activePrinter.paper === "A4" ? 576 : paperWidthPx;
    const receiptWidthMm = activePrinter.paper === "A4" ? 72 : paperWidthMm;
    const isCompactReceipt = false;
    let forceSystemPrint = false;
    let preparedBluetoothPrinterId = d.preparedBluetoothPrinterId || null;

    if (activePrinter.connection === "bluetooth" && !preparedBluetoothPrinterId) {
      try {
        const { isWebBluetoothSupported, prepareBluetoothPrinter } = await import("./bt-printer");
        if (!isWebBluetoothSupported()) {
          forceSystemPrint = true;
        } else {
          const preparedPrinter = await prepareBluetoothPrinter({ promptIfMissing: true });
          preparedBluetoothPrinterId = preparedPrinter?.id || null;
        }
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

    const rowFont = `font-family:Arial,'Tahoma',sans-serif;font-size:14px;color:#000;`;
    const dashed = `<div style="border-top:1px dashed #000;margin:4px 0;"></div>`;

    const itemRows = d.items
      .map(
        (i) => `
      <tr style="${rowFont}">
        <td style="text-align:right;padding:2px 0;font-weight:700;">${i.product_name}</td>
        <td style="text-align:center;padding:2px 0;direction:ltr;">${i.quantity}</td>
        <td style="text-align:center;padding:2px 0;direction:ltr;">${i.unit_price.toFixed(2)}</td>
        <td style="text-align:left;padding:2px 0;direction:ltr;">${(i.unit_price * i.quantity).toFixed(2)}</td>
      </tr>`,
      )
      .join("");

    const sumRow = (label: string, value: string, bold = false) => `
      <tr style="${rowFont}${bold ? "font-weight:700;" : ""}">
        <td style="text-align:left;padding:2px 0;direction:ltr;">${value}</td>
        <td style="text-align:right;padding:2px 0;">${label}</td>
      </tr>`;

    // Plain text-style layout matching thermal receipt aesthetic (no boxes/borders)
    const receiptBody = `
      <div style="width:100%;font-family:Arial,'Tahoma',sans-serif;color:#000;background:#fff;padding:0;direction:rtl;box-sizing:border-box;font-size:14px;" dir="rtl">
        <table style="width:100%;border-collapse:collapse;${rowFont}">
          <tr>
            <td style="text-align:left;padding:1px 0;direction:ltr;">${timeStr}&nbsp;&nbsp;${dateStr}</td>
            <td style="text-align:right;padding:1px 0;">التاريخ:</td>
          </tr>
          <tr>
            <td style="text-align:left;padding:1px 0;">${d.customerName}</td>
            <td style="text-align:right;padding:1px 0;">الزبون:</td>
          </tr>
        </table>

        <div style="text-align:center;font-weight:700;margin-top:6px;font-size:15px;">وصل بيع رقم: ${d.saleSeq}</div>

        <table style="width:100%;border-collapse:collapse;margin-top:6px;${rowFont}font-weight:700;">
          <tr>
            <td style="text-align:right;padding:2px 0;">المنتج</td>
            <td style="text-align:center;padding:2px 0;width:30px;">الكمية</td>
            <td style="text-align:center;padding:2px 0;width:50px;">السعر</td>
            <td style="text-align:left;padding:2px 0;width:55px;">المبلغ</td>
          </tr>
        </table>
        ${dashed}
        <table style="width:100%;border-collapse:collapse;">
          ${itemRows}
        </table>
        ${dashed}

        <table style="width:100%;border-collapse:collapse;">
          ${sumRow("المجموع", total.toFixed(2), true)}
        </table>
        ${dashed}
        <table style="width:100%;border-collapse:collapse;">
          ${sumRow("الديون السابقة", prevDebt.toFixed(2))}
          ${sumRow("المبلغ المدفوع", paidNum.toFixed(2))}
          ${sumRow("المبلغ المتبقي", rest.toFixed(2))}
        </table>

        ${d.note ? `<div style="margin-top:6px;${rowFont}"><span style="font-weight:700;">ملاحظة:</span> ${d.note}</div>` : ""}

        <div style="text-align:center;margin-top:10px;font-weight:700;font-size:15px;">شكرا</div>
        ${isDemo ? `<div style="text-align:center;margin-top:2px;font-size:12px;">KuaiPOS 9.10 Illizi - Version Demo</div>` : ""}
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

    if (activePrinter.connection === "system" || forceSystemPrint) {
      await openSystemPrintDialog(html);
      toast.success(forceSystemPrint ? "تم فتح نافذة طباعة النظام لهذا الجهاز" : "تم إرسال الوصل إلى نافذة الطباعة");
      return;
    }

    if (activePrinter.connection !== "bluetooth") {
      await fallbackToSystemPrint(html, "تم تحويل الطباعة إلى نافذة النظام لهذا النوع من الطابعات");
      return;
    }

    // Direct Bluetooth printing — no system dialog
    try {
      const { printSimpleReceiptBluetooth, isWebBluetoothSupported, pairPrinter, syncRememberedBluetoothPrinter, clearRememberedPrinter } =
        await import("./bt-printer");

      if (!isWebBluetoothSupported()) {
        await fallbackToSystemPrint(html, "الطباعة المباشرة غير مدعومة على هذا المتصفح، فتم فتح طباعة النظام");
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
            { text: `التاريخ: ${dateStr}`, width: 1.35, align: "right" as const },
            { text: timeStr, width: 0.85, align: "left" as const, direction: "ltr" as const },
          ],
          size: isCompactReceipt ? 12 : 14,
        },
        {
          columns: [
            { text: `الزبون: ${d.customerName}`, width: 1.35, align: "right" as const, bold: true },
            { text: "", width: 0.85 },
          ],
          size: isCompactReceipt ? 12 : 14,
          gapTop: 2,
        },
        { text: `وصل بيع رقم: ${d.saleSeq}`, align: "center" as const, size: isCompactReceipt ? 17 : 20, bold: true, gapTop: 6 },
        {
          columns: [
            { text: "المنتج", width: 1.55, align: "right" as const, bold: true },
            { text: "ك", width: 0.45, align: "center" as const, bold: true },
            { text: "الإجمالي", width: 0.8, align: "left" as const, bold: true },
          ],
          size: isCompactReceipt ? 12 : 14,
          gapTop: 6,
        },
        { dashed: true, gapTop: 2 },
        ...d.items.flatMap((item) => [
          {
            columns: [
              { text: item.product_name, width: 1.55, align: "right" as const, bold: true },
              { text: String(item.quantity), width: 0.45, align: "center" as const, direction: "ltr" as const },
              {
                text: (item.unit_price * item.quantity).toFixed(2),
                width: 0.8,
                align: "left" as const,
                direction: "ltr" as const,
              },
            ],
            size: isCompactReceipt ? 13 : 15,
            gapTop: 2,
          },
          {
            text: `${item.unit_price.toFixed(2)} × ${item.quantity}`,
            align: "left" as const,
            size: isCompactReceipt ? 10 : 12,
            direction: "ltr" as const,
          },
          { dashed: true, gapTop: 2 },
        ]),
        {
          columns: [
            { text: "المجموع", width: 1.35, align: "right" as const, bold: true },
            { text: total.toFixed(2), width: 0.85, align: "left" as const, bold: true, direction: "ltr" as const },
          ],
          size: isCompactReceipt ? 14 : 16,
          gapTop: 2,
        },
        { dashed: true, gapTop: 2 },
        {
          columns: [
            { text: "الديون السابقة", width: 1.35, align: "right" as const },
            { text: prevDebt.toFixed(2), width: 0.85, align: "left" as const, direction: "ltr" as const },
          ],
          size: isCompactReceipt ? 12 : 15,
          gapTop: 2,
        },
        {
          columns: [
            { text: "المدفوع", width: 1.35, align: "right" as const },
            { text: paidNum.toFixed(2), width: 0.85, align: "left" as const, direction: "ltr" as const },
          ],
          size: isCompactReceipt ? 12 : 15,
          gapTop: 2,
        },
        {
          columns: [
            { text: "المتبقي", width: 1.35, align: "right" as const },
            { text: rest.toFixed(2), width: 0.85, align: "left" as const, direction: "ltr" as const },
          ],
          size: isCompactReceipt ? 12 : 15,
          gapTop: 2,
        },
        ...(d.note ? [{ text: `ملاحظة: ${d.note}`, align: "right" as const, size: isCompactReceipt ? 12 : 14, gapTop: 6 }] : []),
        { text: "شكراً", align: "center" as const, size: isCompactReceipt ? 14 : 16, gapTop: 8 },
        ...(isDemo ? [{ text: "KuaiPOS 9.10 Illizi - Version Demo", align: "center" as const, size: isCompactReceipt ? 10 : 13, direction: "ltr" as const, gapTop: 4 }] : []),
      ];

      const widthCandidates = getBluetoothWidthCandidates(receiptWidthPx);
      const MAX_ATTEMPTS = widthCandidates.length * 2;
      let lastError: unknown = null;
      let printed = false;

      for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        const widthIndex = Math.min(widthCandidates.length - 1, Math.floor((attempt - 1) / 2));
        const targetWidth = widthCandidates[widthIndex];
        try {
          if (attempt > 1) {
            const widthLabel = targetWidth === 384 ? "58مم" : "80مم";
            toast.message(`إعادة المحاولة ${attempt} من ${MAX_ATTEMPTS} (${widthLabel})...`);
          } else {
            toast.message("جاري الإرسال إلى الطابعة...");
          }

          await printSimpleReceiptBluetooth(simpleLines, targetWidth);
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

      const fallbackOpened = await fallbackToSystemPrint(html, `${userMessage} تم فتح طباعة النظام كبديل.`);

      if (!fallbackOpened) {
        toast.error(userMessage, {
          action: {
            label: "طباعة عبر النظام",
            onClick: () => {
              fallbackToSystemPrint(html);
            },
          },
        });
      }
    } catch (e) {
      console.warn("Bluetooth print pipeline failed:", e);
      toast.error((e as Error)?.message || "فشل الطباعة");
    }
  } finally {
    receiptPrintInFlight = false;
  }
}

