import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, XCircle, Trash2 } from "lucide-react";
import { clearSyncLog, readSyncLog, type SyncEntry } from "@/lib/sync-log";

export const Route = createFileRoute("/app/sync-log")({
  head: () => ({
    meta: [
      { title: "سجل المزامنة — SahlaPos" },
      { name: "description", content: "عمليات المزامنة السابقة ووقتها وعدد العمليات المرسلة والفاشلة." },
      { property: "og:title", content: "سجل المزامنة — SahlaPos" },
      { property: "og:description", content: "سجل مزامنة العمليات المحفوظة دون إنترنت." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SyncLogPage,
});

function SyncLogPage() {
  const [log, setLog] = useState<SyncEntry[]>([]);
  useEffect(() => {
    const load = () => setLog(readSyncLog());
    load();
    window.addEventListener("sahlapos-synclog", load);
    return () => window.removeEventListener("sahlapos-synclog", load);
  }, []);

  return (
    <div dir="rtl" className="mx-auto max-w-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <Link to="/app" className="flex items-center gap-1 text-sm text-muted-foreground"><ArrowRight className="h-4 w-4" /> رجوع</Link>
        <h1 className="text-lg font-bold">سجل المزامنة</h1>
        {log.length ? (
          <button onClick={() => confirm("مسح السجل؟") && clearSyncLog()} className="text-destructive" aria-label="مسح السجل"><Trash2 className="h-5 w-5" /></button>
        ) : <span className="w-5" />}
      </div>
      {!log.length && <p className="py-10 text-center text-muted-foreground">لا توجد عمليات مزامنة بعد</p>}
      {log.map((e) => (
        <div key={e.id} className="rounded-xl border bg-card p-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold">{new Date(e.at).toLocaleString("ar-DZ")}</span>
            <div className="flex gap-3">
              <span className="flex items-center gap-1 text-primary"><CheckCircle2 className="h-4 w-4" />{e.sent} أُرسلت</span>
              {e.failed.length > 0 && <span className="flex items-center gap-1 text-destructive"><XCircle className="h-4 w-4" />{e.failed.length} تعذّر</span>}
            </div>
          </div>
          {e.failed.length > 0 && (
            <ul className="space-y-1 rounded-lg bg-destructive/10 p-2 text-xs">
              {e.failed.map((f, i) => (
                <li key={i}><b>{f.label}:</b> <span className="text-muted-foreground break-all">{f.error}</span></li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
