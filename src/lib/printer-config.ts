export type PrinterConnection = "bluetooth" | "usb" | "network" | "system";

export type SavedPrinter = {
  id: string;
  name: string;
  connection: PrinterConnection;
  address?: string;
  paper?: "58mm" | "80mm" | "A4";
};

export const SAVED_PRINTERS_KEY = "sahla.printers";
export const ACTIVE_PRINTER_KEY = "sahla.printer.active";
export const RECEIPT_PAPER_KEY = "sahla.receipt.paper";
export const AUTO_CUT_KEY = "sahla.receipt.autocut";

/** قص الوصل تلقائياً بعد الطباعة (مفعّل افتراضياً) */
export function getAutoCutEnabled(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(AUTO_CUT_KEY) !== "0";
}

export function setAutoCutEnabled(value: boolean) {
  if (typeof window === "undefined") return;
  localStorage.setItem(AUTO_CUT_KEY, value ? "1" : "0");
}


export type ReceiptPaperWidth = "58mm" | "80mm";

export function getReceiptPaperWidth(): ReceiptPaperWidth {
  if (typeof window === "undefined") return "80mm";
  const v = localStorage.getItem(RECEIPT_PAPER_KEY);
  return v === "58mm" || v === "80mm" ? v : "80mm";
}

export function setReceiptPaperWidth(value: ReceiptPaperWidth) {
  if (typeof window === "undefined") return;
  localStorage.setItem(RECEIPT_PAPER_KEY, value);
}

export function getSavedPrinters(): SavedPrinter[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(SAVED_PRINTERS_KEY) || "[]";
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getActivePrinter(): SavedPrinter | null {
  if (typeof window === "undefined") return null;

  const activeId = localStorage.getItem(ACTIVE_PRINTER_KEY);
  if (!activeId) return null;

  return getSavedPrinters().find((printer) => printer.id === activeId) || null;
}

export function getPaperWidthPx(paper?: string | null): number {
  switch ((paper || "").toLowerCase()) {
    case "80mm":
      return 576;
    case "a4":
      return 794;
    case "58mm":
    default:
      return 384;
  }
}

export function getPaperWidthMm(paper?: string | null): number {
  switch ((paper || "").toLowerCase()) {
    case "80mm":
      return 80;
    case "a4":
      return 210;
    case "58mm":
    default:
      return 58;
  }
}