import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Printer,
  Bluetooth,
  Usb,
  Wifi,
  Search,
  Plus,
  Trash2,
  CheckCircle2,
  Monitor,
  Loader2,
  XCircle,
  Zap,
  FileText,
  Eye,
  ShieldCheck,
  BluetoothConnected,
  BluetoothSearching,
  RefreshCw,
} from "lucide-react";
import { buildReceiptHtmlPreview, SAMPLE_RECEIPT } from "@/lib/print-receipt";
import { PosLayout } from "@/components/pos/PosLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  ACTIVE_PRINTER_KEY,
  SAVED_PRINTERS_KEY,
  type PrinterConnection,
  getPaperWidthPx,
  getReceiptPaperWidth,
  setReceiptPaperWidth,
  type ReceiptPaperWidth,
} from "@/lib/printer-config";

export const Route = createFileRoute("/app/printer")({ component: PrinterPage });

type Connection = PrinterConnection;
type SavedPrinter = {
  id: string;
  name: string;
  connection: Connection;
  address?: string;
  paper?: "58mm" | "80mm" | "A4";
};

const STORAGE_KEY = SAVED_PRINTERS_KEY;
const ACTIVE_KEY = ACTIVE_PRINTER_KEY;

function loadPrinters(): SavedPrinter[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}
function savePrinters(list: SavedPrinter[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function PrinterPage() {
  const [printers, setPrinters] = useState<SavedPrinter[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [scanning, setScanning] = useState(false);
  const [btStatus, setBtStatus] = useState<{
    supported: boolean;
    native: boolean;
    connected: boolean;
    deviceName: string | null;
    deviceId: string | null;
  }>({
    supported: false,
    native: false,
    connected: false,
    deviceName: null,
    deviceId: null,
  });
  const [permState, setPermState] = useState<{ ok: boolean; message: string } | null>(null);
  const [permBusy, setPermBusy] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [found, setFound] = useState<{ id: string; name: string; rssi?: number }[]>([]);
  const [connecting, setConnecting] = useState<string | null>(null);
  const stopScanRef = useRef<null | (() => void)>(null);
  const [quickTesting, setQuickTesting] = useState(false);
  const [quickResult, setQuickResult] = useState<{
    ok: boolean;
    message: string;
    at: string;
  } | null>(null);
  const [receiptPaper, setReceiptPaperState] = useState<ReceiptPaperWidth>("80mm");
  const [sampleTesting, setSampleTesting] = useState(false);
  const [sampleResult, setSampleResult] = useState<{ ok: boolean; message: string } | null>(null);
  const previewIframeRef = useRef<HTMLIFrameElement>(null);

  // Add-printer form
  const [name, setName] = useState("");
  const [conn, setConn] = useState<Connection>("bluetooth");
  const [address, setAddress] = useState("");
  const [paper, setPaper] = useState<"58mm" | "80mm" | "A4">("80mm");

  useEffect(() => {
    setPrinters(loadPrinters());
    setActiveId(localStorage.getItem(ACTIVE_KEY) || "");
    setReceiptPaperState(getReceiptPaperWidth());
  }, []);

  // تحديث تلقائي لحالة اتصال البلوتوث
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const { getBluetoothStatus } = await import("@/lib/bt-printer");
        if (alive) setBtStatus(getBluetoothStatus());
      } catch {}
    };
    tick();
    const t = window.setInterval(tick, 1500);
    return () => {
      alive = false;
      window.clearInterval(t);
      stopScanRef.current?.();
    };
  }, []);

  const requestPermissions = async () => {
    setPermBusy(true);
    try {
      const { ensureBlePermissions } = await import("@/lib/native-bluetooth");
      const res = await ensureBlePermissions();
      setPermState(res);
      res.ok ? toast.success(res.message) : toast.error(res.message);
    } catch (e) {
      const message = (e as Error).message || "تعذّر منح الأذونات";
      setPermState({ ok: false, message });
      toast.error(message);
    } finally {
      setPermBusy(false);
    }
  };

  const savePairedPrinter = (id: string, pname: string) => {
    const p: SavedPrinter = {
      id: crypto.randomUUID(),
      name: pname || "طابعة بلوتوث",
      connection: "bluetooth",
      address: id,
      paper: "80mm",
    };
    const next = [...printers.filter((x) => x.connection !== "bluetooth"), p];
    setPrinters(next);
    savePrinters(next);
    setActive(p.id);
  };

  const startNativeScan = async () => {
    setFound([]);
    setScanOpen(true);
    setScanning(true);
    try {
      const { ensureBlePermissions, scanNativeDevices } = await import("@/lib/native-bluetooth");
      const perm = await ensureBlePermissions();
      setPermState(perm);
      if (!perm.ok) {
        setScanning(false);
        toast.error(perm.message);
        return;
      }
      stopScanRef.current?.();
      stopScanRef.current = await scanNativeDevices((d) => {
        setFound((prev) => (prev.some((x) => x.id === d.id) ? prev : [...prev, d]));
      }, 20_000);
      window.setTimeout(() => setScanning(false), 20_000);
    } catch (e) {
      setScanning(false);
      toast.error((e as Error).message || "تعذّر بدء البحث");
    }
  };

  const pickFoundDevice = async (d: { id: string; name: string }) => {
    setConnecting(d.id);
    try {
      stopScanRef.current?.();
      setScanning(false);
      const { rememberPickedDevice, connectRememberedPrinter, getBluetoothStatus } =
        await import("@/lib/bt-printer");
      rememberPickedDevice(d.id, d.name);
      savePairedPrinter(d.id, d.name);
      // Give Android time to finish stopping discovery before opening GATT.
      await new Promise((resolve) => window.setTimeout(resolve, 900));
      await connectRememberedPrinter();
      setBtStatus(getBluetoothStatus());
      setScanOpen(false);
      toast.success(`تم اقتران الطابعة: ${d.name}`);
    } catch (e) {
      toast.error((e as Error).message || "تعذّر الاتصال بالطابعة");
    } finally {
      setConnecting(null);
    }
  };

  const changeReceiptPaper = (v: ReceiptPaperWidth) => {
    setReceiptPaperState(v);
    setReceiptPaperWidth(v);
    toast.success(`تم تعيين عرض وصل البيع إلى ${v === "58mm" ? "58 مم" : "80 مم"}`);
  };

  const previewHtml = useMemo(
    () => buildReceiptHtmlPreview(SAMPLE_RECEIPT, receiptPaper),
    [receiptPaper],
  );

  // (Re)write iframe content whenever the html changes
  useEffect(() => {
    const iframe = previewIframeRef.current;
    if (!iframe) return;
    const doc = iframe.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write(previewHtml);
    doc.close();
  }, [previewHtml]);

  const printSampleNow = async () => {
    const active = printers.find((p) => p.id === activeId);
    if (!active) {
      const msg = "لا توجد طابعة افتراضية. اختر طابعة أولاً.";
      setSampleResult({ ok: false, message: msg });
      toast.error(msg);
      return;
    }
    setSampleTesting(true);
    setSampleResult(null);
    try {
      if (active.connection === "bluetooth") {
        const { printHtmlBluetooth } = await import("@/lib/bt-printer");
        const widthPx = receiptPaper === "58mm" ? 384 : 576;
        await printHtmlBluetooth(previewHtml, widthPx);
      } else if (active.connection === "system") {
        previewIframeRef.current?.contentWindow?.focus();
        previewIframeRef.current?.contentWindow?.print();
      } else {
        throw new Error(`نوع الاتصال "${active.connection}" غير مدعوم للطباعة المباشرة`);
      }
      const msg = `تم إرسال الوصل التجريبي إلى ${active.name}`;
      setSampleResult({ ok: true, message: msg });
      toast.success(msg);
    } catch (e) {
      const msg = (e as Error).message || "فشل غير معروف";
      setSampleResult({ ok: false, message: msg });
      toast.error(msg);
    } finally {
      setSampleTesting(false);
    }
  };

  const downloadSamplePdf = () => {
    // Open the preview HTML in a new window so the user can "Save as PDF"
    const w = window.open("", "_blank");
    if (!w) {
      toast.error("تم منع النوافذ المنبثقة. اسمح بها ثم أعد المحاولة.");
      return;
    }
    w.document.write(previewHtml);
    w.document.close();
    setTimeout(() => {
      w.focus();
      w.print();
    }, 250);
  };

  const addPrinter = () => {
    if (!name.trim()) return toast.error("أدخل اسم الطابعة");
    const p: SavedPrinter = {
      id: crypto.randomUUID(),
      name: name.trim(),
      connection: conn,
      address: address.trim() || undefined,
      paper,
    };
    const next = [...printers, p];
    setPrinters(next);
    savePrinters(next);
    if (!activeId) {
      setActiveId(p.id);
      localStorage.setItem(ACTIVE_KEY, p.id);
    }
    setName("");
    setAddress("");
    toast.success("تمت إضافة الطابعة");
  };

  const remove = async (id: string) => {
    const next = printers.filter((p) => p.id !== id);
    setPrinters(next);
    savePrinters(next);
    const removedPrinter = printers.find((p) => p.id === id);
    if (removedPrinter?.connection === "bluetooth") {
      const { clearRememberedPrinter } = await import("@/lib/bt-printer");
      clearRememberedPrinter();
    }
    if (activeId === id) {
      setActiveId("");
      localStorage.removeItem(ACTIVE_KEY);
    }
  };

  const setActive = async (id: string) => {
    setActiveId(id);
    localStorage.setItem(ACTIVE_KEY, id);
    const selected = printers.find((printer) => printer.id === id);
    if (selected?.connection === "bluetooth") {
      const { syncRememberedBluetoothPrinter } = await import("@/lib/bt-printer");
      syncRememberedBluetoothPrinter(selected.address, selected.name);
    }
    toast.success("تم اختيار الطابعة الافتراضية");
  };

  const scanBluetooth = async () => {
    if (btStatus.native) {
      await startNativeScan();
      return;
    }
    setScanning(true);
    try {
      const { pairPrinter, syncRememberedBluetoothPrinter } = await import("@/lib/bt-printer");
      const { id, name: pname } = await pairPrinter();
      syncRememberedBluetoothPrinter(id, pname);
      const p: SavedPrinter = {
        id: crypto.randomUUID(),
        name: pname,
        connection: "bluetooth",
        address: id,
        paper: "80mm",
      };
      const next = [...printers.filter((x) => x.connection !== "bluetooth"), p];
      setPrinters(next);
      savePrinters(next);
      setActive(p.id);
      toast.success(`تم اقتران الطابعة: ${pname}`);
    } catch (e) {
      const msg = (e as Error).message || "تعذر الاقتران";
      if (!msg.toLowerCase().includes("cancel")) toast.error(msg);
    } finally {
      setScanning(false);
    }
  };

  const scanUsb = async () => {
    setScanning(true);
    try {
      const nav = navigator as Navigator & {
        usb?: {
          requestDevice: (
            o: unknown,
          ) => Promise<{ productName?: string; manufacturerName?: string; serialNumber?: string }>;
        };
      };
      if (!nav.usb) {
        toast.error("USB غير مدعوم في هذا المتصفح (استخدم Chrome/Edge)");
        return;
      }
      const device = await nav.usb.requestDevice({ filters: [] });
      const p: SavedPrinter = {
        id: crypto.randomUUID(),
        name: device.productName || device.manufacturerName || "USB Printer",
        connection: "usb",
        address: device.serialNumber,
        paper: "80mm",
      };
      const next = [...printers, p];
      setPrinters(next);
      savePrinters(next);
      if (!activeId) setActive(p.id);
      toast.success("تمت إضافة الطابعة USB");
    } catch (e) {
      const msg = (e as Error).message || "تعذر الاتصال";
      if (!msg.includes("No device")) toast.error(msg);
    } finally {
      setScanning(false);
    }
  };

  const quickTest = async () => {
    const active = printers.find((p) => p.id === activeId);
    if (!active) {
      const msg = "لا توجد طابعة افتراضية. اختر طابعة أولاً.";
      setQuickResult({ ok: false, message: msg, at: new Date().toLocaleTimeString("ar") });
      toast.error(msg);
      return;
    }
    setQuickTesting(true);
    setQuickResult(null);
    try {
      const html = `<div style="font-family:Arial;font-size:18px;text-align:center;padding:6px;">
        <div style="font-weight:bold;font-size:22px;">✓ طباعة اختبارية</div>
        <div style="margin-top:6px;">${active.name}</div>
        <div style="margin-top:4px;font-size:14px;">${new Date().toLocaleString("ar")}</div>
        <div style="margin-top:8px;border-top:1px dashed #000;padding-top:6px;">إذا قرأت هذا فالطابعة تعمل بنجاح</div>
      </div>`;
      if (active.connection === "bluetooth") {
        const { printHtmlBluetooth } = await import("@/lib/bt-printer");
        await printHtmlBluetooth(html, Math.min(getPaperWidthPx(active.paper), 384));
      } else if (active.connection === "system") {
        const w = window.open("", "_blank", "width=400,height=300");
        if (!w) throw new Error("تم منع النوافذ المنبثقة");
        w.document.write(html);
        w.document.close();
        w.focus();
        w.print();
        w.close();
      } else {
        throw new Error(`نوع الاتصال "${active.connection}" غير مدعوم للطباعة المباشرة من المتصفح`);
      }
      const msg = `تم الإرسال إلى ${active.name} بنجاح`;
      setQuickResult({ ok: true, message: msg, at: new Date().toLocaleTimeString("ar") });
      toast.success(msg);
    } catch (e) {
      const msg = (e as Error).message || "فشل غير معروف";
      setQuickResult({ ok: false, message: msg, at: new Date().toLocaleTimeString("ar") });
      toast.error(msg);
    } finally {
      setQuickTesting(false);
    }
  };

  const testPrint = async (p: SavedPrinter) => {
    if (p.connection === "bluetooth") {
      try {
        const { printHtmlBluetooth } = await import("@/lib/bt-printer");
        const html = `<div style="font-family:Arial;font-size:20px;text-align:center;padding:8px;">
          <div style="font-weight:bold;font-size:24px;">صفحة اختبار</div>
          <div style="margin-top:8px;">${p.name}</div>
          <div style="margin-top:8px;">${new Date().toLocaleString("ar")}</div>
          <div style="margin-top:12px;">sahlapay ✓</div>
        </div>`;
        await printHtmlBluetooth(html, Math.min(getPaperWidthPx(p.paper), 384));
        toast.success("تمت الطباعة");
      } catch (e) {
        toast.error((e as Error).message);
      }
      return;
    }
    if (p.connection === "system") {
      window.print();
      return;
    }
    toast.success(`جاري إرسال صفحة اختبار إلى ${p.name}`);
  };

  const connIcon = (c: Connection) => {
    if (c === "bluetooth") return <Bluetooth className="h-5 w-5" />;
    if (c === "usb") return <Usb className="h-5 w-5" />;
    if (c === "network") return <Wifi className="h-5 w-5" />;
    return <Monitor className="h-5 w-5" />;
  };
  const connLabel = (c: Connection) =>
    (
      ({
        bluetooth: "بلوتوث",
        usb: "USB",
        network: "شبكة (IP)",
        system: "طابعة النظام",
      }) satisfies Record<Connection, string>
    )[c];

  return (
    <PosLayout title="الطابعة">
      <div className="space-y-4">
        {/* حالة اتصال البلوتوث */}
        <div className="rounded-2xl bg-card border border-border p-4 shadow-card space-y-3">
          <div className="flex items-center justify-between">
            <div className="font-bold text-right flex-1">حالة البلوتوث</div>
            {btStatus.connected ? (
              <BluetoothConnected className="h-5 w-5 text-primary" />
            ) : scanning ? (
              <BluetoothSearching className="h-5 w-5 text-primary animate-pulse" />
            ) : (
              <Bluetooth className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-border p-3">
            <span
              className={`h-3 w-3 rounded-full shrink-0 ${
                btStatus.connected
                  ? "bg-emerald-500"
                  : scanning
                    ? "bg-amber-500 animate-pulse"
                    : "bg-muted-foreground/40"
              }`}
            />
            <div className="flex-1 text-right">
              <div className="font-semibold text-sm">
                {btStatus.connected
                  ? "متصل"
                  : scanning
                    ? "جاري البحث عن الأجهزة..."
                    : btStatus.deviceName
                      ? "غير متصل (محفوظة)"
                      : "لا توجد طابعة مقترنة"}
              </div>
              <div className="text-[11px] text-muted-foreground truncate">
                {btStatus.deviceName
                  ? `الطابعة: ${btStatus.deviceName}`
                  : "اضغط «بحث عن طابعة بلوتوث» للاقتران"}
                {btStatus.deviceId ? ` • ${btStatus.deviceId}` : ""}
              </div>
            </div>
          </div>
          <Button
            onClick={async () => {
              try {
                const { connectRememberedPrinter } = await import("@/lib/bt-printer");
                const s = await connectRememberedPrinter();
                setBtStatus(s);
                toast.success("تم الاتصال بالطابعة");
              } catch (error) {
                const message = error instanceof Error ? error.message : "تعذّر الاتصال بالطابعة";
                toast.error(message);
              }
            }}
            variant="outline"
            className="w-full gap-2"
            disabled={!btStatus.deviceId}
          >
            <RefreshCw className="h-4 w-4" /> إعادة الاتصال
          </Button>
        </div>

        {/* أذونات أندرويد 12+ */}
        <div className="rounded-2xl bg-card border border-border p-4 shadow-card space-y-3">
          <div className="flex items-center justify-between">
            <div className="font-bold text-right flex-1">أذونات البلوتوث (Android 12+)</div>
            <ShieldCheck className="h-5 w-5 text-primary" />
          </div>
          <ol className="text-xs text-muted-foreground text-right space-y-1 list-decimal pr-4">
            <li>فعّل البلوتوث من إعدادات الهاتف.</li>
            <li>اضغط «منح أذونات البلوتوث» ثم اسمح بـ «الأجهزة القريبة».</li>
            <li>شغّل الطابعة الحرارية ثم ابدأ البحث.</li>
          </ol>
          <Button
            onClick={requestPermissions}
            disabled={permBusy}
            className="w-full bg-gradient-primary text-primary-foreground gap-2"
          >
            {permBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ShieldCheck className="h-4 w-4" />
            )}
            منح أذونات البلوتوث
          </Button>
          {permState && (
            <div
              className={`rounded-lg border p-2 text-right text-xs font-semibold ${permState.ok ? "border-primary/40 bg-primary/5 text-primary" : "border-destructive/40 bg-destructive/5 text-destructive"}`}
            >
              {permState.message}
            </div>
          )}
        </div>

        {/* نافذة البحث داخل التطبيق */}
        {scanOpen && (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-3"
            dir="rtl"
          >
            <div className="w-full max-w-md rounded-2xl bg-card border border-border p-4 space-y-3 max-h-[80vh] overflow-y-auto">
              <div className="flex items-center justify-between">
                <div className="font-bold">الأجهزة القريبة</div>
                {scanning ? (
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                ) : (
                  <BluetoothSearching className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div className="text-xs text-muted-foreground text-right">
                {scanning
                  ? "جاري البحث... تظهر الأجهزة تلقائيًا"
                  : `انتهى البحث — ${found.length} جهاز`}
              </div>
              {found.length === 0 && !scanning && (
                <div className="text-center text-sm text-muted-foreground py-4 leading-relaxed">
                  لم يتم العثور على أجهزة. شغّل الطابعة XP-P323B، ثم اقترنها أولًا من «إعدادات
                  الهاتف ← البلوتوث» (BT:A3F3) وأعد البحث — ستظهر هنا ضمن الأجهزة المقترنة.
                </div>
              )}
              <div className="space-y-2">
                {found.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => pickFoundDevice(d)}
                    disabled={!!connecting}
                    className="w-full flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-muted text-right disabled:opacity-60"
                  >
                    <Bluetooth className="h-5 w-5 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate">{d.name}</div>
                      <div className="text-[11px] text-muted-foreground truncate" dir="ltr">
                        {d.id}
                        {d.rssi ? ` • ${d.rssi}dBm` : ""}
                      </div>
                    </div>
                    {connecting === d.id && <Loader2 className="h-4 w-4 animate-spin" />}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={startNativeScan}
                  variant="outline"
                  className="gap-2"
                  disabled={scanning}
                >
                  <RefreshCw className="h-4 w-4" /> إعادة البحث
                </Button>
                <Button
                  onClick={() => {
                    stopScanRef.current?.();
                    setScanning(false);
                    setScanOpen(false);
                  }}
                  variant="outline"
                >
                  إغلاق
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Receipt paper width */}
        <div className="rounded-2xl bg-card border border-border p-4 shadow-card space-y-3">
          <div className="flex items-center justify-between">
            <div className="font-bold text-right flex-1">عرض ورق وصل البيع</div>
            <Printer className="h-5 w-5 text-primary" />
          </div>
          <p className="text-xs text-muted-foreground text-right">
            يتم تطبيقه تلقائيًا على الطباعة المباشرة وعلى ملف PDF.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => changeReceiptPaper("58mm")}
              className={`rounded-lg border p-3 text-sm font-bold transition ${
                receiptPaper === "58mm"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:bg-muted"
              }`}
            >
              58 مم
            </button>
            <button
              onClick={() => changeReceiptPaper("80mm")}
              className={`rounded-lg border p-3 text-sm font-bold transition ${
                receiptPaper === "80mm"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:bg-muted"
              }`}
            >
              80 مم
            </button>
          </div>

          <div className="flex items-center justify-between gap-3 pt-2 border-t border-border">
            <button
              onClick={() => {
                const next = !autoCut;
                setAutoCut(next);
                setAutoCutEnabled(next);
              }}
              className={`h-7 w-12 rounded-full transition ${autoCut ? "bg-primary" : "bg-muted"}`}
              aria-label="قص الوصل تلقائياً"
            >
              <span
                className={`block h-6 w-6 rounded-full bg-background shadow transition-transform ${
                  autoCut ? "translate-x-1" : "translate-x-5"
                }`}
              />
            </button>
            <div className="text-right flex-1">
              <div className="text-sm font-bold">قص الوصل تلقائياً</div>
              <div className="text-xs text-muted-foreground">
                يقوم الجهاز بقص الورق مباشرة بعد الطباعة (للطابعات المزوّدة بقاطع).
              </div>
            </div>
          </div>
        </div>


        {/* Sample receipt preview & test print */}
        <div className="rounded-2xl bg-card border border-border p-4 shadow-card space-y-3">
          <div className="flex items-center justify-between">
            <div className="font-bold text-right flex-1">معاينة وطباعة وصل تجريبي</div>
            <Eye className="h-5 w-5 text-primary" />
          </div>
          <p className="text-xs text-muted-foreground text-right">
            معاينة دقيقة بعرض {receiptPaper === "58mm" ? "58 مم" : "80 مم"} — تأكد من التنسيق قبل
            طباعة وصل حقيقي.
          </p>
          <div className="flex justify-center">
            <div
              className="bg-white rounded-md shadow-sm overflow-hidden border border-border"
              style={{ width: receiptPaper === "58mm" ? 220 : 300 }}
            >
              <iframe
                ref={previewIframeRef}
                title="معاينة الوصل"
                style={{
                  width: receiptPaper === "58mm" ? 220 : 300,
                  height: 380,
                  border: 0,
                  display: "block",
                  background: "#fff",
                }}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={printSampleNow}
              disabled={sampleTesting || !activeId}
              className="bg-gradient-primary text-primary-foreground gap-2"
            >
              {sampleTesting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Printer className="h-5 w-5" />
              )}
              طباعة الآن
            </Button>
            <Button onClick={downloadSamplePdf} variant="outline" className="gap-2">
              <FileText className="h-5 w-5" /> PDF / حفظ
            </Button>
          </div>
          {sampleResult && (
            <div
              className={`rounded-lg border p-3 text-right text-sm flex items-start gap-2 ${
                sampleResult.ok
                  ? "border-primary/40 bg-primary/5 text-primary"
                  : "border-destructive/40 bg-destructive/5 text-destructive"
              }`}
            >
              {sampleResult.ok ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="h-5 w-5 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 font-semibold">{sampleResult.message}</div>
            </div>
          )}
        </div>

        {/* Quick test print */}
        <div className="rounded-2xl bg-card border border-border p-4 shadow-card space-y-3">
          <div className="flex items-center justify-between">
            <div className="font-bold text-right flex-1">طباعة اختبارية سريعة</div>
            <Zap className="h-5 w-5 text-primary" />
          </div>
          <p className="text-xs text-muted-foreground text-right">
            يرسل صفحة صغيرة إلى الطابعة الافتراضية ويعرض النتيجة.
          </p>
          <Button
            onClick={quickTest}
            disabled={quickTesting || !activeId}
            className="w-full bg-gradient-primary text-primary-foreground gap-2"
          >
            {quickTesting ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Printer className="h-5 w-5" />
            )}
            {quickTesting ? "جاري الإرسال..." : "إرسال صفحة اختبار"}
          </Button>
          {quickResult && (
            <div
              className={`rounded-lg border p-3 text-right text-sm flex items-start gap-2 ${
                quickResult.ok
                  ? "border-primary/40 bg-primary/5 text-primary"
                  : "border-destructive/40 bg-destructive/5 text-destructive"
              }`}
            >
              {quickResult.ok ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="h-5 w-5 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <div className="font-semibold">
                  {quickResult.ok ? "نجحت الطباعة" : "فشلت الطباعة"}
                </div>
                <div className="text-xs opacity-80 mt-0.5">{quickResult.message}</div>
                <div className="text-[10px] opacity-60 mt-1">{quickResult.at}</div>
              </div>
            </div>
          )}
        </div>

        {/* Saved printers */}
        <div className="rounded-2xl bg-card border border-border p-4 shadow-card space-y-3">
          <div className="flex items-center justify-between">
            <div className="font-bold text-right flex-1">الطابعات المحفوظة</div>
            <Printer className="h-5 w-5 text-primary" />
          </div>
          {printers.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-6">
              لا توجد طابعات. أضف واحدة أدناه.
            </div>
          ) : (
            <div className="space-y-2">
              {printers.map((p) => (
                <div
                  key={p.id}
                  className={`flex items-center gap-3 rounded-lg border p-3 ${activeId === p.id ? "border-primary bg-primary/5" : "border-border"}`}
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    {connIcon(p.connection)}
                  </div>
                  <div className="flex-1 text-right">
                    <div className="font-semibold flex items-center justify-end gap-2">
                      {activeId === p.id && <CheckCircle2 className="h-4 w-4 text-primary" />}
                      <span>{p.name}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {connLabel(p.connection)} {p.paper ? `• ${p.paper}` : ""}{" "}
                      {p.address ? `• ${p.address}` : ""}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {activeId !== p.id && (
                      <button
                        onClick={() => setActive(p.id)}
                        className="text-xs px-2 py-1 rounded border border-border hover:bg-muted"
                      >
                        تعيين
                      </button>
                    )}
                    <button
                      onClick={() => testPrint(p)}
                      className="text-xs px-2 py-1 rounded border border-border hover:bg-muted"
                    >
                      اختبار
                    </button>
                    <button
                      onClick={() => remove(p.id)}
                      className="text-xs px-2 py-1 rounded border border-destructive/40 text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add printer */}
        <div className="rounded-2xl bg-card border border-border p-4 shadow-card">
          <div className="font-bold text-right mb-3">إضافة طابعة</div>
          <Tabs defaultValue="auto" className="w-full">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="auto">بحث تلقائي</TabsTrigger>
              <TabsTrigger value="manual">إدخال يدوي</TabsTrigger>
            </TabsList>

            <TabsContent value="auto" className="space-y-2 pt-3">
              <Button
                onClick={scanBluetooth}
                disabled={scanning}
                className="w-full bg-gradient-primary text-primary-foreground gap-2"
              >
                <Bluetooth className="h-5 w-5" /> بحث عن طابعة بلوتوث
              </Button>
              <Button
                onClick={scanUsb}
                disabled={scanning}
                variant="outline"
                className="w-full gap-2"
              >
                <Usb className="h-5 w-5" /> بحث عن طابعة USB
              </Button>
              <Button onClick={() => window.print()} variant="outline" className="w-full gap-2">
                <Monitor className="h-5 w-5" /> طباعة عبر النظام (أي طابعة)
              </Button>
              <p className="text-[11px] text-muted-foreground text-center pt-1">
                الكشف التلقائي يحتاج Chrome/Edge أو متصفح يدعم Web Bluetooth/USB.
              </p>
            </TabsContent>

            <TabsContent value="manual" className="space-y-3 pt-3">
              <div>
                <label className="text-sm text-muted-foreground block text-right mb-1">
                  اسم الطابعة
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="مثال: XP-T80B"
                  className="text-right"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sm text-muted-foreground block text-right mb-1">
                    نوع الاتصال
                  </label>
                  <Select value={conn} onValueChange={(v) => setConn(v as Connection)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bluetooth">بلوتوث</SelectItem>
                      <SelectItem value="usb">USB</SelectItem>
                      <SelectItem value="network">شبكة (IP)</SelectItem>
                      <SelectItem value="system">طابعة النظام</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground block text-right mb-1">
                    حجم الورق
                  </label>
                  <Select
                    value={paper}
                    onValueChange={(v) => setPaper(v as "58mm" | "80mm" | "A4")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="58mm">58 مم</SelectItem>
                      <SelectItem value="80mm">80 مم</SelectItem>
                      <SelectItem value="A4">A4</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {(conn === "network" || conn === "bluetooth" || conn === "usb") && (
                <div>
                  <label className="text-sm text-muted-foreground block text-right mb-1">
                    {conn === "network"
                      ? "عنوان IP:Port (مثال: 192.168.1.50:9100)"
                      : "العنوان / المعرّف (اختياري)"}
                  </label>
                  <Input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    dir="ltr"
                    className="text-left"
                  />
                </div>
              )}
              <Button
                onClick={addPrinter}
                className="w-full bg-gradient-primary text-primary-foreground gap-2"
              >
                <Plus className="h-5 w-5" /> إضافة الطابعة
              </Button>
            </TabsContent>
          </Tabs>
        </div>

        <div className="text-center text-xs text-muted-foreground">
          مدعومة: حرارية 58/80 مم (بلوتوث/USB/شبكة) — كذلك أي طابعة عبر طباعة النظام (A4، ليزر،
          نافثة...).
        </div>
      </div>
    </PosLayout>
  );
}
