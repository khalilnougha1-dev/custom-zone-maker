import { useEffect, useState } from "react";
import { CloudOff, RefreshCw, CloudUpload } from "lucide-react";
import { toast } from "sonner";
import { isOnline, isSyncing, onQueueChange, pendingCount, startAutoSync, syncNow } from "@/lib/offline-store";

export function OfflineStatus() {
  const [, force] = useState(0);
  useEffect(() => {
    startAutoSync((r) => {
      if (r.done) toast.success(`تمت مزامنة ${r.done} عملية محفوظة`);
      if (r.failed) toast.error(`تعذرت مزامنة ${r.failed} عملية`);
    });
    const off = onQueueChange(() => force((n) => n + 1));
    const t = setInterval(() => force((n) => n + 1), 5000);
    return () => { off(); clearInterval(t); };
  }, []);

  const online = isOnline();
  const pending = pendingCount();
  if (online && pending === 0) return null;

  return (
    <button
      onClick={() => online && syncNow()}
      className="flex items-center gap-1 rounded-full bg-white/15 px-2 py-1 text-xs font-semibold"
      aria-label="حالة المزامنة"
    >
      {!online ? <CloudOff className="h-4 w-4" /> : isSyncing() ? <RefreshCw className="h-4 w-4 animate-spin" /> : <CloudUpload className="h-4 w-4" />}
      <span>{!online ? "بدون إنترنت" : "مزامنة"}{pending ? ` (${pending})` : ""}</span>
    </button>
  );
}
