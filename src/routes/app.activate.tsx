import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Copy, Clock, Calendar, CheckCircle2, HardDrive, Upload, Cloud } from "lucide-react";
import { PosLayout } from "@/components/pos/PosLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  exportBackup,
  downloadBackup,
  importBackupFromFile,
  uploadToCloud,
  downloadFromCloud,
  getCloudBackupInfo,
  restoreBackup,
  type ProgressCb,
} from "@/lib/backup";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Loader2, CheckCircle2 as CheckIcon } from "lucide-react";

export const Route = createFileRoute("/app/activate")({ component: ActivatePage });

function ActivatePage() {
  const { user } = useAuth();
  const [now, setNow] = useState<{ time: string; date: string }>({ time: "", date: "" });
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ active: boolean; expires_at?: string | null; permanent?: boolean }>({ active: false });
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

  const loadStatus = async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from("profiles")
      .select("subscription_expires_at, subscription_status, is_active")
      .eq("id", user.id)
      .maybeSingle();
    if (data) {
      const exp = data.subscription_expires_at ? new Date(data.subscription_expires_at) : null;
      const isPerm = data.subscription_status === "permanent";
      const isActive = !!data.is_active && (isPerm || (exp ? exp > new Date() : false));
      setStatus({ active: isActive, expires_at: data.subscription_expires_at, permanent: isPerm });
    }
  };

  useEffect(() => { loadStatus(); }, [user?.id]);

  const copy = () => {
    navigator.clipboard.writeText(deviceId);
    toast.success("تم النسخ");
  };
  const requestKey = () => {
    const msg = `مرحبا، أريد تفعيل تطبيق SAHLAPOS\nالرقم التعريفي: ${deviceId}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const confirm = async () => {
    const trimmed = key.trim().toUpperCase();
    if (!trimmed) return toast.error("أدخل مفتاح التفعيل");
    setLoading(true);
    const { data, error } = await supabase.rpc("redeem_activation_code", { _code: trimmed });
    setLoading(false);
    if (error) return toast.error(error.message);
    const result = data as { success: boolean; error?: string; expires_at?: string; is_permanent?: boolean };
    if (!result?.success) {
      const errors: Record<string, string> = {
        not_authenticated: "يجب تسجيل الدخول",
        code_not_found: "مفتاح التفعيل غير صحيح",
        code_already_used: "هذا المفتاح مستعمل من قبل",
        device_mismatch: "هذا المفتاح مخصص لجهاز آخر",
      };
      return toast.error(errors[result?.error || ""] || "فشل التفعيل");
    }
    if (result.is_permanent) {
      toast.success("تم التفعيل الدائم بنجاح ✓");
    } else {
      const exp = result.expires_at ? new Date(result.expires_at).toLocaleDateString("ar-DZ") : "";
      toast.success(`تم التفعيل بنجاح ✓ صالح إلى ${exp}`);
    }
    setKey("");
    setStatus({ active: true, expires_at: result.expires_at, permanent: result.is_permanent });
  };

  type Busy = null | "drive-up" | "drive-down" | "file-in" | "file-out" | "drive-info";
  const [busy, setBusy] = useState<Busy>(null);
  const [progress, setProgress] = useState<{ open: boolean; title: string; label: string; current: number; total: number; done: boolean; error?: string }>({
    open: false, title: "", label: "", current: 0, total: 1, done: false,
  });
  const [driveInfo, setDriveInfo] = useState<{ open: boolean; loading: boolean; modifiedTime?: string; size?: string; error?: string }>({
    open: false, loading: false,
  });

  const isBusy = !!busy;
  const onProgress: ProgressCb = (s) => setProgress((p) => ({ ...p, ...s }));

  const fmtSize = (b?: string) => {
    if (!b) return "";
    const n = Number(b); if (!n) return "";
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / 1024 / 1024).toFixed(2)} MB`;
  };

  const startProgress = (title: string, total = 1) =>
    setProgress({ open: true, title, label: "بدء العملية...", current: 0, total, done: false, error: undefined });
  const finishProgress = (err?: string) =>
    setProgress((p) => ({ ...p, done: !err, error: err, label: err ? "فشلت العملية" : "اكتملت العملية بنجاح", current: err ? p.current : p.total }));

  const handleExportFile = async () => {
    if (!user?.id || isBusy) return;
    setBusy("file-out");
    startProgress("تصدير نسخة احتياطية");
    try {
      onProgress({ label: "جمع البيانات", current: 0, total: 2 });
      const file = await exportBackup(user.id);
      onProgress({ label: "تنزيل الملف", current: 1, total: 2 });
      const saved = await downloadBackup(file);
      finishProgress();
      toast.success(saved.startsWith("file") || saved.includes("/") ? `تم حفظ النسخة: ${saved.split("/").pop()}` : "تم تنزيل النسخة الاحتياطية");
    } catch (e: any) {
      finishProgress(e.message || "فشل التصدير");
      toast.error(e.message || "فشل التصدير");
    } finally {
      setBusy(null);
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportFile = () => {
    if (!user?.id || isBusy) return;
    fileInputRef.current?.click();
  };

  const onFileChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !user?.id) return;
    setBusy("file-in");
    startProgress("استيراد ملف واسترداد البيانات", 18);
    try {
      await importBackupFromFile(file, user.id, onProgress);
      finishProgress();
      toast.success("تم استرداد البيانات بنجاح");
    } catch (err: any) {
      finishProgress(err.message || "فشل الاسترداد");
      toast.error(err.message || "فشل الاسترداد");
    } finally {
      setBusy(null);
    }
  };

  const handleDriveUpload = async () => {
    if (!user?.id || isBusy) return;
    setBusy("drive-up");
    startProgress("رفع النسخة إلى السحابة", 3);
    try {
      onProgress({ label: "تجهيز البيانات", current: 0, total: 3 });
      const file = await exportBackup(user.id);
      onProgress({ label: "جاري الرفع إلى السحابة", current: 1, total: 3 });
      await uploadToCloud(file);
      onProgress({ label: "اكتمل الرفع", current: 3, total: 3 });
      finishProgress();
      toast.success("تم رفع النسخة إلى السحابة");
    } catch (e: any) {
      finishProgress(e.message || "فشل الرفع");
      toast.error(e.message || "فشل الرفع");
    } finally {
      setBusy(null);
    }
  };

  const openDriveRestoreDialog = async () => {
    if (!user?.id || isBusy) return;
    setDriveInfo({ open: true, loading: true });
    setBusy("drive-info");
    try {
      const info = await getCloudBackupInfo();
      if (!info) {
        setDriveInfo({ open: true, loading: false, error: "لا توجد نسخة احتياطية سحابية" });
      } else {
        setDriveInfo({ open: true, loading: false, modifiedTime: info.modifiedTime, size: info.size });
      }
    } catch (e: any) {
      setDriveInfo({ open: true, loading: false, error: e.message || "تعذر جلب معلومات النسخة" });
    } finally {
      setBusy(null);
    }
  };

  const handleDriveRestore = async () => {
    if (!user?.id || isBusy) return;
    setDriveInfo((d) => ({ ...d, open: false }));
    setBusy("drive-down");
    startProgress("استرداد البيانات من السحابة", 18);
    try {
      onProgress({ label: "تحميل النسخة من السحابة", current: 0, total: 18 });
      const file = await downloadFromCloud();
      await restoreBackup(file, user.id, onProgress);
      finishProgress();
      toast.success("تم استرداد البيانات من السحابة");
    } catch (e: any) {
      finishProgress(e.message || "فشل التحميل");
      toast.error(e.message || "فشل التحميل");
    } finally {
      setBusy(null);
    }
  };

  return (
    <PosLayout title="تفعيل التطبيق">
      <div className="space-y-4 pt-2">
        <div className="flex items-center gap-4 text-sm font-mono">
          <div className="flex items-center gap-2"><Calendar className="h-4 w-4" /> {now.date}</div>
          <div className="flex items-center gap-2"><Clock className="h-4 w-4" /> {now.time}</div>
        </div>

        {status.active && (
          <>
            <div className="rounded-md border border-green-500/40 bg-green-500/10 px-4 py-3 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div className="flex-1 text-right">
                <div className="font-semibold text-green-700 dark:text-green-400">الحساب مفعّل</div>
                <div className="text-xs text-muted-foreground">
                  {status.permanent
                    ? "تفعيل دائم"
                    : status.expires_at
                    ? `صالح إلى ${new Date(status.expires_at).toLocaleDateString("ar-DZ")}`
                    : ""}
                </div>
              </div>
            </div>

            <div className="rounded-md border border-accent/60 bg-card p-4 space-y-3">
              <div className="flex items-center gap-2 text-right">
                <HardDrive className="h-5 w-5 text-primary" />
                <div className="font-semibold">تخزين الملفات</div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleDriveUpload}
                  disabled={isBusy}
                  className="flex items-center justify-center gap-2 rounded-md border border-accent/60 bg-background px-3 py-3 text-sm hover:bg-accent/30 transition disabled:opacity-50"
                >
                  <Cloud className="h-4 w-4" />
                  <span>{busy === "drive-up" ? "جاري الرفع..." : "رفع إلى السحابة"}</span>
                </button>
                <button
                  onClick={openDriveRestoreDialog}
                  disabled={isBusy}
                  className="flex items-center justify-center gap-2 rounded-md border border-accent/60 bg-background px-3 py-3 text-sm hover:bg-accent/30 transition disabled:opacity-50"
                >
                  <Cloud className="h-4 w-4" />
                  <span>{busy === "drive-info" ? "جاري الفحص..." : busy === "drive-down" ? "جاري التحميل..." : "تحميل من السحابة"}</span>
                </button>
                <button
                  onClick={handleExportFile}
                  disabled={isBusy}
                  className="flex items-center justify-center gap-2 rounded-md border border-accent/60 bg-background px-3 py-3 text-sm hover:bg-accent/30 transition disabled:opacity-50"
                >
                  <HardDrive className="h-4 w-4" />
                  <span>{busy === "file-out" ? "جاري التصدير..." : "تصدير ملف"}</span>
                </button>
                <button
                  onClick={handleImportFile}
                  disabled={isBusy}
                  className="flex items-center justify-center gap-2 rounded-md border border-accent/60 bg-background px-3 py-3 text-sm hover:bg-accent/30 transition disabled:opacity-50"
                >
                  <Upload className="h-4 w-4" />
                  <span>{busy === "file-in" ? "جاري الاسترداد..." : "استيراد ملف"}</span>
                </button>
              </div>
            </div>
          </>
        )}

        {!status.active && (
          <>
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
              <Button onClick={requestKey} disabled={loading} className="bg-gradient-primary text-primary-foreground font-semibold">أطلب مفتاح التفعيل</Button>
              <Button onClick={confirm} disabled={loading} className="bg-gradient-primary text-primary-foreground font-semibold">{loading ? "جاري التحقق..." : "تأكيد"}</Button>
            </div>
          </>
        )}

      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={onFileChosen}
      />

      {/* Cloud backup info dialog */}
      <Dialog open={driveInfo.open} onOpenChange={(o) => !isBusy && setDriveInfo((d) => ({ ...d, open: o }))}>
        <DialogContent dir="rtl" className="text-right">
          <DialogHeader>
            <DialogTitle>النسخة الاحتياطية السحابية</DialogTitle>
            <DialogDescription>
              راجع تفاصيل النسخة قبل تنفيذ الاسترداد. سيتم استبدال جميع بياناتك الحالية.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            {driveInfo.loading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                جاري الاتصال بالسحابة...
              </div>
            )}
            {driveInfo.error && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                {driveInfo.error}
              </div>
            )}
            {!driveInfo.loading && !driveInfo.error && driveInfo.modifiedTime && (
              <div className="rounded-md border border-accent/60 bg-card p-3 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">آخر تعديل</span><span className="font-mono">{new Date(driveInfo.modifiedTime).toLocaleString("ar-DZ")}</span></div>
                {driveInfo.size && (
                  <div className="flex justify-between"><span className="text-muted-foreground">الحجم</span><span className="font-mono">{fmtSize(driveInfo.size)}</span></div>
                )}
                <div className="flex justify-between"><span className="text-muted-foreground">اسم الملف</span><span className="font-mono">sahlapos-backup.json</span></div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDriveInfo((d) => ({ ...d, open: false }))} disabled={isBusy}>إلغاء</Button>
            <Button
              onClick={handleDriveRestore}
              disabled={isBusy || driveInfo.loading || !!driveInfo.error || !driveInfo.modifiedTime}
              className="bg-gradient-primary text-primary-foreground"
            >
              تنفيذ الاسترداد
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Progress dialog (blocks all other operations) */}
      <Dialog open={progress.open} onOpenChange={() => { /* blocked */ }}>
        <DialogContent
          dir="rtl"
          className="text-right"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {progress.done ? <CheckIcon className="h-5 w-5 text-green-600" /> : progress.error ? null : <Loader2 className="h-5 w-5 animate-spin" />}
              {progress.title}
            </DialogTitle>
            <DialogDescription>
              {progress.error ? progress.error : progress.label}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Progress value={progress.total ? (progress.current / progress.total) * 100 : 0} />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{progress.current} / {progress.total}</span>
              <span>{Math.round((progress.current / Math.max(progress.total, 1)) * 100)}%</span>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setProgress((p) => ({ ...p, open: false }))}
              disabled={!progress.done && !progress.error}
              className="bg-gradient-primary text-primary-foreground"
            >
              {progress.done || progress.error ? "إغلاق" : "جاري التنفيذ..."}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PosLayout>
  );
}
