import { createFileRoute } from "@tanstack/react-router";
import { Printer, Bluetooth, Search } from "lucide-react";
import { PosLayout } from "@/components/pos/PosLayout";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/app/printer")({ component: PrinterPage });

function PrinterPage() {
  const scan = () => toast.info("تأكد من تفعيل البلوتوث وأن الطابعة قريبة");

  return (
    <PosLayout title="الطابعة">
      <div className="space-y-4">
        <div className="rounded-2xl bg-card border border-border p-4 shadow-card">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted"><Printer className="h-6 w-6" /></div>
            <div className="flex-1 text-right">
              <div className="font-bold">XP-P323B-6C88</div>
              <div className="text-xs text-muted-foreground mt-1">DC:0D:30:D5:6C:88</div>
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <button onClick={scan} className="flex items-center gap-2 rounded-md border border-border bg-muted px-4 py-2 text-sm">
              <Search className="h-4 w-4" /> بحث
            </button>
          </div>
        </div>

        <div className="text-center text-sm text-muted-foreground py-10">
          الطابعات الحرارية 58/80 مم مدعومة عبر البلوتوث
        </div>

        <Button onClick={scan} className="w-full bg-gradient-primary text-primary-foreground gap-2">
          <Bluetooth className="h-5 w-5" /> تشغيل البلوتوث ...
        </Button>
      </div>
    </PosLayout>
  );
}
