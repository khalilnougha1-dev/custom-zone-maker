import { useEffect, useState } from "react";
import { CloudOff, RefreshCw, CloudUpload } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { History } from "lucide-react";
import { isOnline, isSyncing, onQueueChange, pendingCount, startAutoSync, syncNow } from "@/lib/offline-store";
import { FETCH_QUEUE_EVENT, fetchQueueCount, flushFetchQueue } from "@/lib/offline-fetch";

let toastBound = false;

export function OfflineStatus() {
  const [, force] = useState(0);
  useEffect(() => {
    startAutoSync((r) => {
      if (r.done) toast.success(`تمت مزامنة ${r.done} عملية محفوظة`);
      if (r.failed) toast.error(`تعذرت مزامنة ${r.failed} عملية`);
    });
    if (!toastBound) {
      toastBound = true;
      window.addEventListener("sahlapos-synced", (e: any) => toast.success(`تمت مزامنة ${e.detail} تعديل محفوظ`));
    }
    const rerender = () => force((n) => n + 1);
    const off = onQueueChange(rerender);
    window.addEventListener(FETCH_QUEUE_EVENT, rerender);
    window.addEventListener("online", rerender);
    window.addEventListener("offline", rerender);
    const t = setInterval(rerender, 5000);
    return () => {
      off(); clearInterval(t);
      window.removeEventListener(FETCH_QUEUE_EVENT, rerender);
      window.removeEventListener("online", rerender);
      window.removeEventListener("offline", rerender);
    };
  }, []);

  const online = isOnline();
  const pending = pendingCount() + fetchQueueCount();
  if (online && pending === 0) return (
    <Link to="/app/sync-log" aria-label="سجل المزامنة" className="flex items-center rounded-full bg-white/15 p-1.5"><History className="h-4 w-4" /></Link>
  );

  return (
    <div className="flex items-center gap-1">
    <button
      onClick={() => { if (online) { syncNow(); flushFetchQueue(); } }}
      className="flex items-center gap-1 rounded-full bg-white/15 px-2 py-1 text-xs font-semibold"
      aria-label="حالة المزامنة"
    >
      {!online ? <CloudOff className="h-4 w-4" /> : isSyncing() ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CloudUpload className="h-4 w-4" />}
      <span>{!online ? "بدون إنترنت" : "مزامنة"}{pending ? ` (${pending})` : ""}</span>
    </button>
    <Link to="/app/sync-log" aria-label="سجل المزامنة" className="flex items-center rounded-full bg-white/15 p-1.5"><History className="h-4 w-4" /></Link>
    </div>
  );
}
