import { supabase } from "@/integrations/supabase/client";
import { getActivePrinter, getPaperWidthPx } from "@/lib/printer-config";

let receiptPrintInFlight = false;

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
};

export async function printReceipt(d: ReceiptData) {
  if (receiptPrintInFlight) {
    const { toast } = await import("sonner");
    toast.message("الطباعة قيد التنفيذ، يرجى الانتظار...");
    return;
  }

  receiptPrintInFlight = true;

  try {
    const { toast } = await import("sonner");
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
        (i) => `
      <tr>
        <td class="num">${(i.unit_price * i.quantity).toFixed(2)}</td>
        <td class="num">${i.unit_price.toFixed(2)}</td>
        <td class="qty">${i.quantity}</td>
        <td class="name">${i.product_name}</td>
      </tr>`,
      )
      .join("");

    const html = `
    <html dir="rtl"><head><meta charset="utf-8"><title>وصل بيع ${d.saleSeq}</title>
    <style>
      @page { size: 80mm auto; margin: 3mm; }
      body { font-family: Arial, sans-serif; font-size: 13px; color:#000; margin:0; }
      .head { display:flex; justify-content:space-between; margin: 2px 0; }
      .center { text-align:center; font-weight:bold; margin: 6px 0; font-size:14px; }
      table { width:100%; border-collapse:collapse; }
      th { text-align:right; border-bottom:1px dashed #000; padding:4px 2px; font-weight:normal; }
      .num { text-align:left; font-family:monospace; padding:2px 4px; }
      .qty { text-align:center; padding:2px 4px; }
      .name { text-align:right; padding:2px 4px; }
      tbody tr td { border-bottom:1px dashed #000; }
      .totals { margin-top:4px; }
      .totals .row { display:flex; justify-content:space-between; padding:2px 2px; }
      .totals .row.sum { border-bottom:1px dashed #000; padding-bottom:4px; margin-bottom:2px; }
      .mono { font-family:monospace; }
      .thanks { text-align:center; margin-top:10px; }
      .footer { text-align:center; margin-top:4px; font-size:12px; }
    </style></head><body>
      <div class="head"><b>${timeStr}&nbsp;&nbsp;${dateStr}</b><b>:التاريخ</b></div>
      <div class="head"><b>${d.customerName}</b><b>:الزبون</b></div>
      <div class="center">وصل بيع رقم: ${d.saleSeq}</div>
      <table>
        <thead>
          <tr>
            <th class="num">المبلغ</th>
            <th class="num">السعر</th>
            <th class="qty">الكمية</th>
            <th>المنتج</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="totals">
        <div class="row sum"><span class="mono">${total.toFixed(2)}</span><span>المجموع</span></div>
        <div class="row"><span class="mono">${prevDebt.toFixed(2)}</span><span>الديون السابقة</span></div>
        <div class="row"><span class="mono">${paidNum.toFixed(2)}</span><span>المبلغ المدفوع</span></div>
        <div class="row"><span class="mono">${rest.toFixed(2)}</span><span>المبلغ المتبقى</span></div>
      </div>
      ${d.note ? `<div style="margin-top:6px;text-align:right;">ملاحظة: ${d.note}</div>` : ""}
      <div class="thanks">شكرا</div>
      ${isDemo ? `<div class="footer">KuaiPOS 9.10 Illizi - Version Demo</div>` : ""}
    </body></html>`;

    // Body-only HTML for the bluetooth raster path
    const bodyHtml = `<div style="width:100%;font-family:Arial,sans-serif;font-size:18px;color:#000;background:#fff;padding:4px;">${html
      .split("<body>")[1]
      .split("</body>")[0]}</div>`;

    const activePrinter = getActivePrinter();
    const paperWidthPx = getPaperWidthPx(activePrinter?.paper);

    if (!activePrinter) {
      toast.error("لم يتم تحديد طابعة افتراضية من صفحة الطابعة");
      return;
    }

    if (activePrinter.connection === "system") {
      const iframe = document.createElement("iframe");
      iframe.style.cssText = "position:fixed;left:-9999px;top:0;width:0;height:0;border:0;";
      document.body.appendChild(iframe);

      try {
        const doc = iframe.contentDocument;
        if (!doc) throw new Error("تعذر فتح نافذة الطباعة");

        doc.open();
        doc.write(html);
        doc.close();

        await new Promise((resolve) => setTimeout(resolve, 250));
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } finally {
        setTimeout(() => iframe.remove(), 1000);
      }
      return;
    }

    if (activePrinter.connection !== "bluetooth") {
      toast.error("نوع الطابعة المحدد غير مدعوم بعد للطباعة المباشرة");
      return;
    }

    // Direct Bluetooth printing — no system dialog
    try {
      const { printHtmlBluetooth, isWebBluetoothSupported, pairPrinter, syncRememberedBluetoothPrinter } =
        await import("./bt-printer");

      if (!isWebBluetoothSupported()) {
        toast.error("متصفحك لا يدعم الطباعة المباشرة. استخدم Chrome على أندرويد.");
        return;
      }

      syncRememberedBluetoothPrinter(activePrinter.address, activePrinter.name);

      // Auto-pair on first print (user gesture from the print button)
      if (!activePrinter.address && !localStorage.getItem("sahla.bt.printerId")) {
        toast.message("اختر الطابعة من القائمة");
        try {
          const paired = await pairPrinter();
          syncRememberedBluetoothPrinter(paired.id, paired.name);
        } catch (err) {
          toast.error("لم يتم اختيار طابعة");
          return;
        }
      }

      await printHtmlBluetooth(bodyHtml, paperWidthPx);
      return;
    } catch (e) {
      console.warn("Bluetooth print failed:", e);
      const message = (e as Error).message || "فشل الطباعة";
      toast.error(
        message.includes("GATT operation already in progress")
          ? "الطابعة مشغولة حاليًا. أعد المحاولة بعد ثوانٍ قليلة."
          : message,
      );
    }
  } finally {
    receiptPrintInFlight = false;
  }
}

