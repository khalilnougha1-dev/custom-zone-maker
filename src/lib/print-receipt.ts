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
        <td style="text-align:left;font-family:'Courier New',monospace;padding:6px 2px;border-bottom:1px dashed #000;white-space:nowrap;">${(i.unit_price * i.quantity).toFixed(2)}</td>
        <td style="text-align:left;font-family:'Courier New',monospace;padding:6px 2px;border-bottom:1px dashed #000;white-space:nowrap;">${i.unit_price.toFixed(2)}</td>
        <td style="text-align:center;padding:6px 2px;border-bottom:1px dashed #000;font-weight:bold;">${i.quantity}</td>
        <td style="text-align:right;padding:6px 2px;border-bottom:1px dashed #000;">${i.product_name}</td>
      </tr>`,
      )
      .join("");

    // Single inline-styled block — used for both system print and bluetooth raster
    const receiptBody = `
      <div style="width:100%;font-family:Arial,'Tahoma',sans-serif;font-size:22px;line-height:1.4;color:#000;background:#fff;padding:6px 4px;direction:rtl;" dir="rtl">
        <div style="display:flex;justify-content:space-between;margin:2px 0;font-weight:bold;">
          <span>${timeStr}&nbsp;&nbsp;${dateStr}</span>
          <span>:التاريخ</span>
        </div>
        <div style="display:flex;justify-content:space-between;margin:2px 0;font-weight:bold;">
          <span>${d.customerName}</span>
          <span>:الزبون</span>
        </div>
        <div style="text-align:center;font-weight:bold;margin:10px 0 6px;font-size:26px;">وصل بيع رقم: ${d.saleSeq}</div>
        <table style="width:100%;border-collapse:collapse;margin-top:4px;">
          <thead>
            <tr>
              <th style="text-align:left;border-top:1px dashed #000;border-bottom:1px dashed #000;padding:6px 2px;font-weight:normal;">المبلغ</th>
              <th style="text-align:left;border-top:1px dashed #000;border-bottom:1px dashed #000;padding:6px 2px;font-weight:normal;">السعر</th>
              <th style="text-align:center;border-top:1px dashed #000;border-bottom:1px dashed #000;padding:6px 2px;font-weight:normal;">الكمية</th>
              <th style="text-align:right;border-top:1px dashed #000;border-bottom:1px dashed #000;padding:6px 2px;font-weight:normal;">المنتج</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div style="margin-top:6px;">
          <div style="display:flex;justify-content:space-between;padding:4px 2px;border-bottom:1px dashed #000;margin-bottom:4px;">
            <span style="font-family:'Courier New',monospace;font-weight:bold;">${total.toFixed(2)}</span>
            <span style="font-weight:bold;">المجموع</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:3px 2px;">
            <span style="font-family:'Courier New',monospace;">${prevDebt.toFixed(2)}</span>
            <span>الديون السابقة</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:3px 2px;">
            <span style="font-family:'Courier New',monospace;">${paidNum.toFixed(2)}</span>
            <span>المبلغ المدفوع</span>
          </div>
          <div style="display:flex;justify-content:space-between;padding:3px 2px;">
            <span style="font-family:'Courier New',monospace;">${rest.toFixed(2)}</span>
            <span>المبلغ المتبقى</span>
          </div>
        </div>
        ${d.note ? `<div style="margin-top:8px;text-align:right;">ملاحظة: ${d.note}</div>` : ""}
        <div style="text-align:center;margin-top:14px;font-weight:bold;font-size:24px;">شكرا</div>
        ${isDemo ? `<div style="text-align:center;margin-top:6px;font-size:18px;">KuaiPOS 9.10 Illizi - Version Demo</div>` : ""}
      </div>`;

    const html = `<html dir="rtl"><head><meta charset="utf-8"><title>وصل بيع ${d.saleSeq}</title>
    <style>@page { size: 80mm auto; margin: 3mm; } body { margin:0; }</style>
    </head><body>${receiptBody}</body></html>`;

    const bodyHtml = receiptBody;

    const activePrinter = getActivePrinter();
    // Force 80mm raster width (user requirement) when no explicit paper set
    const paperWidthPx = getPaperWidthPx(activePrinter?.paper || "80mm");

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
      const { printHtmlBluetooth, isWebBluetoothSupported, pairPrinter, syncRememberedBluetoothPrinter, clearRememberedPrinter } =
        await import("./bt-printer");

      if (!isWebBluetoothSupported()) {
        toast.error("متصفحك لا يدعم الطباعة المباشرة. استخدم Chrome على أندرويد.");
        return;
      }

      if (activePrinter.address) {
        syncRememberedBluetoothPrinter(activePrinter.address, activePrinter.name);
      } else {
        clearRememberedPrinter();
      }

      // Auto-pair on first print (user gesture from the print button)
      if (!localStorage.getItem("sahla.bt.printerId")) {
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

