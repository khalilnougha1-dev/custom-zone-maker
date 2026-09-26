export type SyncFailure = { label: string; error: string };
export type SyncEntry = { id: string; at: number; sent: number; failed: SyncFailure[] };

const KEY = "sahlapos-sync-log";

export function readSyncLog(): SyncEntry[] {
  if (typeof localStorage === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}

export function addSyncLog(sent: number, failed: SyncFailure[]) {
  if (!sent && !failed.length) return;
  const e: SyncEntry = { id: Math.random().toString(36).slice(2), at: Date.now(), sent, failed };
  try {
    localStorage.setItem(KEY, JSON.stringify([e, ...readSyncLog()].slice(0, 200)));
    window.dispatchEvent(new Event("sahlapos-synclog"));
  } catch { /* quota */ }
}

export function clearSyncLog() {
  localStorage.removeItem(KEY);
  window.dispatchEvent(new Event("sahlapos-synclog"));
}

const TABLES: Record<string, string> = {
  sales: "بيع", sale_items: "سطر بيع", customers: "زبون", customer_payments: "دفعة زبون",
  products: "منتج", purchases: "شراء", purchase_items: "سطر شراء", expenses: "مصروف",
  suppliers: "مورد", cash_movements: "حركة صندوق", product_packages: "عبوة منتج",
};
const METHODS: Record<string, string> = { POST: "إضافة", PATCH: "تعديل", PUT: "تعديل", DELETE: "حذف" };

export function describeRequest(url: string, method: string) {
  try {
    const p = new URL(url).pathname.split("/").filter(Boolean);
    const t = p[p.length - 1] || "";
    return `${METHODS[method] || method} ${TABLES[t] || t}`;
  } catch { return method; }
}
