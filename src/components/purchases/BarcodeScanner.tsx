import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScan: (barcode: string) => void;
}

export function BarcodeScanner({ open, onOpenChange, onScan }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90dvh] overflow-y-auto" dir="rtl">
        <DialogTitle className="text-right pr-6">مسح باركود المنتج</DialogTitle>
        <DialogDescription className="sr-only">قارئ باركود المنتجات والكرطون</DialogDescription>
        {open && <ScannerCamera onScan={onScan} />}
      </DialogContent>
    </Dialog>
  );
}

function ScannerCamera({ onScan }: Pick<Props, "onScan">) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(true);
  const [attempt, setAttempt] = useState(0);
  const [code, setCode] = useState("");

  useEffect(() => {
    let cancelled = false;
    let delivered = false;
    let stream: MediaStream | undefined;
    let controls: { stop: () => void } | undefined;
    const release = () => {
      controls?.stop();
      stream?.getTracks().forEach(track => track.stop());
    };
    setError("");
    setStarting(true);
    async function start() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("camera-unavailable");
        }
        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        if (cancelled) return;
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (cancelled || !videoRef.current) { release(); return; }
        const reader = new BrowserMultiFormatReader();
        controls = await reader.decodeFromStream(stream, videoRef.current, (result, _error, scannerControls) => {
          if (!result || cancelled || delivered) return;
          const barcode = result.getText().trim();
          if (!barcode) return;
          delivered = true;
          scannerControls.stop();
          stream?.getTracks().forEach(track => track.stop());
          onScanRef.current(barcode);
        });
        if (cancelled) { release(); return; }
        setStarting(false);
      } catch (cause) {
        release();
        if (cancelled) return;
        const name = cause instanceof Error ? cause.name : "";
        setError(name === "NotAllowedError" || name === "SecurityError"
          ? "لم يُسمح بالكاميرا. فعّل إذن الكاميرا للتطبيق أو المتصفح ثم أعد المحاولة."
          : name === "NotFoundError"
            ? "لم يتم العثور على كاميرا. يمكنك إدخال الباركود أدناه."
            : "تعذّر تشغيل الكاميرا. أغلق أي تطبيق يستخدمها ثم أعد المحاولة، أو أدخل الباركود أدناه.");
        setStarting(false);
      }
    }
    void start();
    return () => { cancelled = true; release(); };
  }, [attempt]);

  return (
    <>
      <div className="relative aspect-video overflow-hidden rounded-lg border border-border bg-muted">
        <video ref={videoRef} autoPlay muted playsInline aria-label="كاميرا الباركود" className="h-full w-full object-cover" />
        {starting && <div role="status" className="absolute inset-0 flex items-center justify-center gap-2 bg-background/80 text-foreground"><Loader2 className="h-5 w-5 animate-spin" /> جارٍ تشغيل الكاميرا</div>}
      </div>
      {error && <div role="alert" className="space-y-3"><p className="text-sm text-destructive">{error}</p><Button variant="outline" onClick={() => setAttempt(value => value + 1)}><Camera />إعادة المحاولة</Button></div>}
      <form className="flex gap-2" onSubmit={event => { event.preventDefault(); if (code.trim()) onScanRef.current(code.trim()); }}>
        <Input aria-label="رقم الباركود" placeholder="رقم الباركود" value={code} onChange={event => setCode(event.target.value)} inputMode="numeric" dir="ltr" />
        <Button type="submit" disabled={!code.trim()} aria-label="إضافة بالباركود"><Search />إضافة</Button>
      </form>
    </>
  );
}