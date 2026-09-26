// Offline-first storage + sync queue for POS (sales, customers, customer payments).
import { supabase } from "@/integrations/supabase/client";

type Op =
  | { kind: "customer"; id: string; row: any; ts: number }
  | { kind: "sale"; id: string; sale: any; items: any[]; ts: number }
  | { kind: "payment"; id: string; row: any; ts: number };

const QKEY = "sahlapos-offline-queue";
const cacheKey = (uid: string, name: string) => `sahlapos-cache:${uid}:${name}`;
const listeners = new Set<() => void>();
let syncing = false;

export const uuid = () =>
  (crypto as any).randomUUID?.() ??
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });

export const isOnline = () => typeof navigator === "undefined" || navigator.onLine !== false;

function readQ(): Op[] {
  try { return JSON.parse(localStorage.getItem(QKEY) || "[]"); } catch { return []; }
}
function writeQ(q: Op[]) {
  localStorage.setItem(QKEY, JSON.stringify(q));
  listeners.forEach((l) => l());
}
export const pendingCount = () => (typeof localStorage === "undefined" ? 0 : readQ().length);
export const getPending = () => readQ();
export function onQueueChange(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }
export const isSyncing = () => syncing;

export function enqueue(op: Op) { writeQ([...readQ(), op]); }

export function saveCache(uid: string, name: string, data: unknown) {
  try { localStorage.setItem(cacheKey(uid, name), JSON.stringify(data)); } catch { /* quota */ }
}
export function loadCache<T = any>(uid: string, name: string, fallback: T): T {
  try {
    const v = localStorage.getItem(cacheKey(uid, name));
    return v ? (JSON.parse(v) as T) : fallback;
  } catch { return fallback; }
}

/** Network errors (not validation errors) → keep op queued. */
const isNetErr = (e: any) =>
  !isOnline() || /fetch|network|failed to|load failed|timeout/i.test(String(e?.message || e));

async function run(op: Op) {
  if (op.kind === "customer") {
    const { error } = await supabase.from("customers").upsert(op.row, { onConflict: "id", ignoreDuplicates: true });
    if (error) throw error;
  } else if (op.kind === "payment") {
    const { error } = await supabase.from("cash_transactions").upsert(op.row, { onConflict: "id", ignoreDuplicates: true });
    if (error) throw error;
  } else {
    const { data: exists } = await supabase.from("sales").select("id").eq("id", op.id).maybeSingle();
    if (!exists) {
      const { error } = await supabase.from("sales").insert(op.sale);
      if (error) throw error;
      const { error: e2 } = await supabase.from("sale_items").insert(op.items);
      if (e2) { await supabase.from("sales").delete().eq("id", op.id); throw e2; }
    }
  }
}

export async function syncNow(): Promise<{ done: number; failed: number }> {
  if (syncing || !isOnline()) return { done: 0, failed: 0 };
  syncing = true; listeners.forEach((l) => l());
  let done = 0, failed = 0;
  const fails: { label: string; error: string }[] = [];
  try {
    const { data } = await supabase.auth.getSession();
    if (!data.session) return { done, failed };
    for (const op of readQ()) {
      try {
        await run(op);
        writeQ(readQ().filter((o) => o.id !== op.id));
        done++;
      } catch (e) {
        if (isNetErr(e)) break;
        failed++;
        const error = String((e as any)?.message || e);
        const kind = (op as any).kind || (op as any).type || "عملية";
        fails.push({ label: kind === "sale" ? "بيع" : kind === "payment" ? "دفعة زبون" : kind === "customer" ? "زبون" : String(kind), error });
        console.error("[offline-sync] dropped op", op, e);
        localStorage.setItem("sahlapos-offline-failed", JSON.stringify([...JSON.parse(localStorage.getItem("sahlapos-offline-failed") || "[]"), { op, error }]));
        writeQ(readQ().filter((o) => o.id !== op.id));
      }
    }
  } finally {
    syncing = false; listeners.forEach((l) => l());
    addSyncLog(done, fails);
  }
  return { done, failed };
}

let started = false;
export function startAutoSync(onResult?: (r: { done: number; failed: number }) => void) {
  if (started || typeof window === "undefined") return;
  started = true;
  const go = () => syncNow().then((r) => { if (r.done || r.failed) onResult?.(r); });
  window.addEventListener("online", go);
  window.addEventListener("offline", () => listeners.forEach((l) => l()));
  window.addEventListener("online", () => listeners.forEach((l) => l()));
  setInterval(go, 30_000);
  go();
}
