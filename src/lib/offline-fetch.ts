// Whole-app offline layer: wraps window.fetch for backend data requests.
// - Reads: network first, saved to device; served from device when offline.
// - Writes while offline: queued on the device, answered locally, replayed in order when online.
// Must be imported before the backend client is created (see src/router.tsx).

const DATA_CACHE = "sahlapos-data-v1";
const QKEY = "sahlapos-fetch-queue";
const EVT = "sahlapos-fetch-queue-change";
const NO_ID_TABLES = new Set(["app_settings"]);

type QItem = { id: string; url: string; method: string; headers: Record<string, string>; body: string | null; ts: number };

let origFetch: typeof fetch;
let flushing = false;

const rid = () =>
  (crypto as any).randomUUID?.() ??
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });

function readQ(): QItem[] { try { return JSON.parse(localStorage.getItem(QKEY) || "[]"); } catch { return []; } }
function writeQ(q: QItem[]) { localStorage.setItem(QKEY, JSON.stringify(q)); window.dispatchEvent(new Event(EVT)); }
export const fetchQueueCount = () => (typeof localStorage === "undefined" ? 0 : readQ().length);
export const FETCH_QUEUE_EVENT = EVT;

const isData = (u: URL) => u.pathname.startsWith("/rest/v1/") && u.hostname.includes("supabase");
const tableOf = (u: URL) => u.pathname.replace("/rest/v1/", "").split("/")[0];

function hdrs(init?: RequestInit, req?: Request): Record<string, string> {
  const h = new Headers(req?.headers);
  new Headers(init?.headers).forEach((v, k) => h.set(k, v));
  const o: Record<string, string> = {};
  h.forEach((v, k) => { o[k] = v; });
  return o;
}

function cacheKey(u: URL, method: string, body: string | null) {
  const k = new URL(u.toString());
  k.searchParams.set("__m", method);
  if (body) k.searchParams.set("__b", body.slice(0, 1500));
  return new Request(k.toString());
}

function currentToken(): string | null {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)!;
      if (/^sb-.*-auth-token$/.test(k)) return JSON.parse(localStorage.getItem(k) || "{}")?.access_token || null;
    }
  } catch { /* ignore */ }
  return null;
}

/** Add rows written offline to cached list responses so they show immediately. */
function mergePending(u: URL, data: any): any {
  if (!Array.isArray(data)) return data;
  const table = tableOf(u);
  const filters: [string, string][] = [];
  u.searchParams.forEach((v, k) => { if (v.startsWith("eq.") && !k.startsWith("__")) filters.push([k, v.slice(3)]); });
  const add: any[] = [];
  for (const q of readQ()) {
    if (q.method !== "POST" || !q.body) continue;
    const qu = new URL(q.url);
    if (tableOf(qu) !== table || qu.pathname.includes("/rpc/")) continue;
    let rows: any; try { rows = JSON.parse(q.body); } catch { continue; }
    for (const r of Array.isArray(rows) ? rows : [rows]) {
      if (filters.every(([k, v]) => r[k] === undefined || String(r[k]) === v) && !data.some((d: any) => d?.id && d.id === r.id)) add.push(r);
    }
  }
  return add.length ? [...add.reverse(), ...data] : data;
}

function json(body: any, status = 200, extra: Record<string, string> = {}) {
  return new Response(body === null ? null : JSON.stringify(body), {
    status, headers: { "Content-Type": "application/json", "X-Offline": "1", ...extra },
  });
}

async function fromCache(u: URL, method: string, body: string | null, h: Record<string, string>) {
  try {
    const c = await caches.open(DATA_CACHE);
    const hit = await c.match(cacheKey(u, method, body));
    if (hit) {
      if (method === "HEAD") return new Response(null, { status: hit.status, headers: hit.headers });
      const text = await hit.text();
      let data: any = null; try { data = JSON.parse(text); } catch { /* */ }
      return new Response(JSON.stringify(mergePending(u, data)), { status: hit.status, headers: hit.headers });
    }
  } catch { /* no cache api */ }
  const single = (h["accept"] || "").includes("vnd.pgrst.object");
  return single ? json(null, 406) : json(method === "HEAD" ? null : mergePending(u, []), 200, { "Content-Range": "*/0" });
}

function queueWrite(u: URL, method: string, body: string | null, h: Record<string, string>) {
  const table = tableOf(u);
  let parsed: any = null;
  if (body) { try { parsed = JSON.parse(body); } catch { /* */ } }
  if (method === "POST" && parsed && !NO_ID_TABLES.has(table) && !u.pathname.includes("/rpc/")) {
    const fill = (r: any) => (r && typeof r === "object" && !r.id ? { ...r, id: rid() } : r);
    parsed = Array.isArray(parsed) ? parsed.map(fill) : fill(parsed);
    if (!Array.isArray(parsed) && !parsed.created_at) parsed.created_at = new Date().toISOString();
    body = JSON.stringify(parsed);
  }
  const keep = { ...h }; delete keep["authorization"];
  writeQ([...readQ(), { id: rid(), url: u.toString(), method, headers: keep, body, ts: Date.now() }]);
  const single = (h["accept"] || "").includes("vnd.pgrst.object");
  const rows = parsed == null ? [] : Array.isArray(parsed) ? parsed : [parsed];
  return json(single ? rows[0] ?? {} : rows, method === "POST" ? 201 : 200);
}

export async function flushFetchQueue(): Promise<number> {
  if (flushing || !navigator.onLine || !origFetch) return 0;
  flushing = true; let n = 0;
  try {
    for (const q of readQ()) {
      const token = currentToken();
      const headers = { ...q.headers, ...(token ? { authorization: `Bearer ${token}` } : {}) };
      let res: Response;
      try { res = await origFetch(q.url, { method: q.method, headers, body: q.body }); }
      catch { break; } // still offline
      if (res.status === 401) break; // wait for fresh session
      if (!res.ok && res.status !== 409) {
        const failed = JSON.parse(localStorage.getItem("sahlapos-fetch-failed") || "[]");
        failed.push({ ...q, status: res.status, error: await res.text().catch(() => "") });
        localStorage.setItem("sahlapos-fetch-failed", JSON.stringify(failed.slice(-50)));
      }
      writeQ(readQ().filter((x) => x.id !== q.id)); n++;
    }
  } finally { flushing = false; }
  return n;
}

export function installOfflineFetch() {
  if (typeof window === "undefined" || (window as any).__sahlaOfflineFetch) return;
  (window as any).__sahlaOfflineFetch = true;
  origFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const req = input instanceof Request ? input : undefined;
    let u: URL;
    try { u = new URL(req ? req.url : input.toString(), location.href); } catch { return origFetch(input, init); }
    if (!isData(u)) return origFetch(input, init);

    const method = (init?.method || req?.method || "GET").toUpperCase();
    const body = typeof init?.body === "string" ? init.body : null;
    const h = hdrs(init, req);
    const isRpc = u.pathname.includes("/rpc/");
    const isRead = method === "GET" || method === "HEAD" || isRpc;

    if (!isRead) {
      if (!navigator.onLine) return queueWrite(u, method, body, h);
      try { return await origFetch(input, init); }
      catch { return queueWrite(u, method, body, h); }
    }

    if (!navigator.onLine) return fromCache(u, method, body, h);
    try {
      const res = await origFetch(input, init);
      if (res.ok) {
        const copy = res.clone();
        caches.open(DATA_CACHE).then(async (c) => {
          const text = method === "HEAD" ? null : await copy.text();
          await c.put(cacheKey(u, method, body), new Response(text, { status: copy.status, headers: copy.headers }));
        }).catch(() => {});
      }
      return res;
    } catch {
      return fromCache(u, method, body, h);
    }
  };

  const go = () => { flushFetchQueue().then((n) => { if (n) window.dispatchEvent(new CustomEvent("sahlapos-synced", { detail: n })); }); };
  window.addEventListener("online", go);
  setInterval(go, 30_000);
  setTimeout(go, 3000);
}

installOfflineFetch();
