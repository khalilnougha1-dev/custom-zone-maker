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
  preparedBluetoothPrinterId?: string | null;
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
      <div style="width:100%;font-family:Arial,'Tahoma',sans-serif;color:#000;background:#fff;padding:8px 6px 10px;direction:rtl;" dir="rtl">
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

      const preparedPrinterId = d.preparedBluetoothPrinterId || null;
      const rememberedPrinterId = localStorage.getItem("sahla.bt.printerId");

      if (preparedPrinterId) {
        syncRememberedBluetoothPrinter(preparedPrinterId, activePrinter.name);
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

