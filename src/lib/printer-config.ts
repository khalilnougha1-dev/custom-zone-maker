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