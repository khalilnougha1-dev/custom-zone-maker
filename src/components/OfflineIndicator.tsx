import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export function OfflineIndicator() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      dir="rtl"
      className="fixed inset-x-0 bottom-0 z-[60] flex items-center justify-center gap-2 bg-amber-500/95 px-3 py-2 text-xs font-semibold text-amber-950 shadow-lg"
    >
      <WifiOff className="h-4 w-4 shrink-0" />
      <span className="truncate">وضع بدون إنترنت — التطبيق يعمل، والمزامنة تتم عند عودة الاتصال</span>
    </div>
  );
}
