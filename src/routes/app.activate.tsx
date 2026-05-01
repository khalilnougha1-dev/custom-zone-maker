import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Copy, Clock, Calendar } from "lucide-react";
import { PosLayout } from "@/components/pos/PosLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/app/activate")({ component: ActivatePage });

function ActivatePage() {
  const { user } = useAuth();
  const [now, setNow] = useState<{ time: string; date: string }>({ time: "", date: "" });
  const [key, setKey] = useState("");
  const deviceId = user?.id?.replace(/-/g, "").slice(0, 16) || "";

  useEffect(() => {
    const tick = () => {
      const d = new Date();
      setNow({
        time: d.toLocaleTimeString("ar-DZ", { hour12: false }),
        date: d.toLocaleDateString("ar-DZ"),
      });
    };
    tick();
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
  }, []);

  const copy = () => {
    navigator.clipboard.writeText(deviceId);
    toast.success("تم النسخ");
  };
  const requestKey = () => toast.info("سيتم التواصل معك من فريق الدعم");
  const confirm = () => {
    if (!key.trim()) return toast.error("أدخل مفتاح التفعيل");
    toast.success("جاري التحقق من المفتاح...");
  };

  return (
    <PosLayout title="تفعيل التطبيق">
      <div className="space-y-4 pt-2">
        <div className="flex items-center gap-4 text-sm font-mono">
          <div className="flex items-center gap-2"><Calendar className="h-4 w-4" /> {now.date}</div>
          <div className="flex items-center gap-2"><Clock className="h-4 w-4" /> {now.time}</div>
        </div>

        <div className="space-y-3">
          <div>
            <div className="text-sm text-muted-foreground mb-1 text-right">الرقم التعريفي</div>
            <div className="flex items-center gap-2 rounded-md border border-accent/60 bg-card px-3 py-2">
              <button onClick={copy} className="text-muted-foreground hover:text-foreground"><Copy className="h-4 w-4" /></button>
              <input readOnly value={deviceId} className="flex-1 bg-transparent text-right font-mono text-sm outline-none" />
            </div>
          </div>
          <div>
            <div className="text-sm text-muted-foreground mb-1 text-right">مفتاح التفعيل</div>
            <Input value={key} onChange={(e) => setKey(e.target.value)} className="bg-card border-accent/60 text-right" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <Button onClick={requestKey} className="bg-gradient-primary text-primary-foreground font-semibold">أطلب مفتاح التفعيل</Button>
          <Button onClick={confirm} className="bg-gradient-primary text-primary-foreground font-semibold">تأكيد</Button>
        </div>
      </div>
    </PosLayout>
  );
}
