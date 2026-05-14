import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Printer, Bluetooth, Usb, Wifi, Search, Plus, Trash2, CheckCircle2, Monitor, Loader2, XCircle, Zap } from "lucide-react";
import { PosLayout } from "@/components/pos/PosLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "sonner";
import {
  ACTIVE_PRINTER_KEY,
  SAVED_PRINTERS_KEY,
  type PrinterConnection,
  getPaperWidthPx,
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
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
}
function savePrinters(list: SavedPrinter[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

function PrinterPage() {
  const [printers, setPrinters] = useState<SavedPrinter[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [scanning, setScanning] = useState(false);
  const [quickTesting, setQuickTesting] = useState(false);
  const [quickResult, setQuickResult] = useState<{ ok: boolean; message: string; at: string } | null>(null);

  // Add-printer form
  const [name, setName] = useState("");
  const [conn, setConn] = useState<Connection>("bluetooth");
  const [address, setAddress] = useState("");
  const [paper, setPaper] = useState<"58mm" | "80mm" | "A4">("80mm");

  useEffect(() => {
    setPrinters(loadPrinters());
    setActiveId(localStorage.getItem(ACTIVE_KEY) || "");
  }, []);

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
    setPrinters(next); savePrinters(next);
    if (!activeId) { setActiveId(p.id); localStorage.setItem(ACTIVE_KEY, p.id); }
    setName(""); setAddress("");
    toast.success("تمت إضافة الطابعة");
  };

  const remove = async (id: string) => {
    const next = printers.filter(p => p.id !== id);
    setPrinters(next); savePrinters(next);
    const removedPrinter = printers.find((p) => p.id === id);
    if (removedPrinter?.connection === "bluetooth") {
      const { clearRememberedPrinter } = await import("@/lib/bt-printer");
      clearRememberedPrinter();
    }
    if (activeId === id) { setActiveId(""); localStorage.removeItem(ACTIVE_KEY); }
  };

  const setActive = async (id: string) => {
    setActiveId(id); localStorage.setItem(ACTIVE_KEY, id);
    const selected = printers.find((printer) => printer.id === id);
    if (selected?.connection === "bluetooth") {
      const { syncRememberedBluetoothPrinter } = await import("@/lib/bt-printer");
      syncRememberedBluetoothPrinter(selected.address, selected.name);
    }
    toast.success("تم اختيار الطابعة الافتراضية");
  };

  const scanBluetooth = async () => {
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
      const next = [...printers.filter(x => x.connection !== "bluetooth"), p];
      setPrinters(next); savePrinters(next);
      setActive(p.id);
      toast.success(`تم اقتران الطابعة: ${pname}`);
    } catch (e) {
      const msg = (e as Error).message || "تعذر الاقتران";
      if (!msg.toLowerCase().includes("cancel")) toast.error(msg);
    } finally { setScanning(false); }
  };

  const scanUsb = async () => {
    setScanning(true);
    try {
      const nav = navigator as Navigator & { usb?: { requestDevice: (o: unknown) => Promise<{ productName?: string; manufacturerName?: string; serialNumber?: string }> } };
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
      setPrinters(next); savePrinters(next);
      if (!activeId) setActive(p.id);
      toast.success("تمت إضافة الطابعة USB");
    } catch (e) {
      const msg = (e as Error).message || "تعذر الاتصال";
      if (!msg.includes("No device")) toast.error(msg);
    } finally { setScanning(false); }
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
        await printHtmlBluetooth(html, getPaperWidthPx(p.paper));
        toast.success("تمت الطباعة");
      } catch (e) {
        toast.error((e as Error).message);
      }
      return;
    }
    if (p.connection === "system") { window.print(); return; }
    toast.success(`جاري إرسال صفحة اختبار إلى ${p.name}`);
  };

  const connIcon = (c: Connection) => {
    if (c === "bluetooth") return <Bluetooth className="h-5 w-5" />;
    if (c === "usb") return <Usb className="h-5 w-5" />;
    if (c === "network") return <Wifi className="h-5 w-5" />;
    return <Monitor className="h-5 w-5" />;
  };
  const connLabel = (c: Connection) => ({
    bluetooth: "بلوتوث",
    usb: "USB",
    network: "شبكة (IP)",
    system: "طابعة النظام",
  } satisfies Record<Connection, string>)[c];

  return (
    <PosLayout title="الطابعة">
      <div className="space-y-4">
        {/* Saved printers */}
        <div className="rounded-2xl bg-card border border-border p-4 shadow-card space-y-3">
          <div className="flex items-center justify-between">
            <div className="font-bold text-right flex-1">الطابعات المحفوظة</div>
            <Printer className="h-5 w-5 text-primary" />
          </div>
          {printers.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-6">لا توجد طابعات. أضف واحدة أدناه.</div>
          ) : (
            <div className="space-y-2">
              {printers.map(p => (
                <div key={p.id} className={`flex items-center gap-3 rounded-lg border p-3 ${activeId === p.id ? "border-primary bg-primary/5" : "border-border"}`}>
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">{connIcon(p.connection)}</div>
                  <div className="flex-1 text-right">
                    <div className="font-semibold flex items-center justify-end gap-2">
                      {activeId === p.id && <CheckCircle2 className="h-4 w-4 text-primary" />}
                      <span>{p.name}</span>
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {connLabel(p.connection)} {p.paper ? `• ${p.paper}` : ""} {p.address ? `• ${p.address}` : ""}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {activeId !== p.id && (
                      <button onClick={() => setActive(p.id)} className="text-xs px-2 py-1 rounded border border-border hover:bg-muted">تعيين</button>
                    )}
                    <button onClick={() => testPrint(p)} className="text-xs px-2 py-1 rounded border border-border hover:bg-muted">اختبار</button>
                    <button onClick={() => remove(p.id)} className="text-xs px-2 py-1 rounded border border-destructive/40 text-destructive hover:bg-destructive/10">
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
              <Button onClick={scanBluetooth} disabled={scanning} className="w-full bg-gradient-primary text-primary-foreground gap-2">
                <Bluetooth className="h-5 w-5" /> بحث عن طابعة بلوتوث
              </Button>
              <Button onClick={scanUsb} disabled={scanning} variant="outline" className="w-full gap-2">
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
                <label className="text-sm text-muted-foreground block text-right mb-1">اسم الطابعة</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: XP-T80B" className="text-right" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-sm text-muted-foreground block text-right mb-1">نوع الاتصال</label>
                  <Select value={conn} onValueChange={(v) => setConn(v as Connection)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bluetooth">بلوتوث</SelectItem>
                      <SelectItem value="usb">USB</SelectItem>
                      <SelectItem value="network">شبكة (IP)</SelectItem>
                      <SelectItem value="system">طابعة النظام</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm text-muted-foreground block text-right mb-1">حجم الورق</label>
                  <Select value={paper} onValueChange={(v) => setPaper(v as "58mm" | "80mm" | "A4")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
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
                    {conn === "network" ? "عنوان IP:Port (مثال: 192.168.1.50:9100)" : "العنوان / المعرّف (اختياري)"}
                  </label>
                  <Input value={address} onChange={(e) => setAddress(e.target.value)} dir="ltr" className="text-left" />
                </div>
              )}
              <Button onClick={addPrinter} className="w-full bg-gradient-primary text-primary-foreground gap-2">
                <Plus className="h-5 w-5" /> إضافة الطابعة
              </Button>
            </TabsContent>
          </Tabs>
        </div>

        <div className="text-center text-xs text-muted-foreground">
          مدعومة: حرارية 58/80 مم (بلوتوث/USB/شبكة) — كذلك أي طابعة عبر طباعة النظام (A4، ليزر، نافثة...).
        </div>
      </div>
    </PosLayout>
  );
}
