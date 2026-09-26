// SAHLAPOS service worker — offline-first app shell
const VERSION = "sahlapos-v11";
const SHELL = `${VERSION}-shell`;
const ASSETS = `${VERSION}-assets`;
const PRECACHE = [
  "/", "/login", "/manifest.webmanifest",
  "/app", "/app/pos", "/app/customer-payments", "/app/cash", "/app/sales", "/app/purchases",
  "/app/purchases/new", "/app/products", "/app/customers", "/app/suppliers", "/app/inventory",
  "/app/stock-adjust", "/app/stock-movements", "/app/expenses", "/app/finance", "/app/profits",
  "/app/reports", "/app/settings", "/app/printer", "/app/account", "/app/trucks", "/app/trucks-inventory",
  "/app/driver",
];

// Cache every page plus the scripts/styles each page references, so any screen opens offline.
async function precacheAll() {
  const shell = await caches.open(SHELL);
  const assets = await caches.open(ASSETS);
  const assetUrls = new Set();
  await Promise.allSettled(
    PRECACHE.map(async (u) => {
      const res = await fetch(u, { credentials: "same-origin" });
      if (!res.ok) return;
      await shell.put(u, res.clone());
      if (!(res.headers.get("content-type") || "").includes("text/html")) return;
      const html = await res.text();
      for (const m of html.matchAll(/(?:src|href)="(\/[^"]+\.(?:js|css|woff2?|png|svg|webp|ico))"/g)) assetUrls.add(m[1]);
    }),
  );
  await Promise.allSettled([...assetUrls].map(async (a) => {
    if (await assets.match(a)) return;
    const r = await fetch(a);
    if (r.ok) await assets.put(a, r);
  }));
}

self.addEventListener("install", (e) => {
  e.waitUntil(precacheAll().catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))),
      ),
  );
  self.clients.claim();
});

self.addEventListener("message", (e) => {
  if (e.data === "SKIP_WAITING") self.skipWaiting();
});

function isAsset(url) {
  return /\.(js|css|woff2?|ttf|png|jpg|jpeg|svg|webp|ico)$/i.test(url.pathname);
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  let url;
  try {
    url = new URL(req.url);
  } catch {
    return;
  }

  // Never intercept backend / API traffic — those need the network.
  if (
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/~oauth") ||
    url.pathname.startsWith("/api") ||
    url.pathname.startsWith("/_serverFn") ||
    url.hostname.includes("supabase")
  ) {
    return;
  }

  // App shell navigations: network first, fall back to cache so the app opens offline.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches
            .open(SHELL)
            .then((c) => c.put(req, copy))
            .catch(() => {});
          return res;
        })
        .catch(async () => {
          const cache = await caches.open(SHELL);
          return (
            (await cache.match(req)) ||
            (await cache.match("/app")) ||
            (await cache.match("/")) ||
            new Response("Offline", { status: 503, headers: { "Content-Type": "text/plain" } })
          );
        }),
    );
    return;
  }

  // Versioned build assets are immutable: cache first keeps the app fast and offline-ready.
  if (isAsset(url)) {
    e.respondWith(
      caches.open(ASSETS).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        try {
          const res = await fetch(req);
          if (res && res.status === 200) cache.put(req, res.clone());
          return res;
        } catch {
          return hit || Response.error();
        }
      }),
    );
    return;
  }

  // Everything else: network with cache fallback.
  e.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches
          .open(ASSETS)
          .then((c) => c.put(req, copy))
          .catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then((m) => m || Response.error())),
  );
});
