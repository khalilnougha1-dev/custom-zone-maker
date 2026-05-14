import { useState } from "react";
import { Download, Smartphone, Monitor, Apple, CheckCircle2, Share2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { toast } from "sonner";

export function InstallAppSection() {
  const { canInstall, installed, isIOS, install } = usePwaInstall();
  const [iosOpen, setIosOpen] = useState(false);

  const handleInstall = async () => {
    if (installed) {
      toast.success("التطبيق مثبّت بالفعل ✓");
      return;
    }
    if (isIOS) {
      setIosOpen(true);
      return;
    }
    if (canInstall) {
      const outcome = await install();
      if (outcome === "accepted") toast.success("تم تثبيت التطبيق بنجاح");
    } else {
      toast.info("افتح الموقع في Chrome/Edge لتثبيت التطبيق، أو من قائمة المتصفح: تثبيت التطبيق");
    }
  };

  return (
    <section className="py-20 md:py-28">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-5xl overflow-hidden rounded-3xl border border-border/60 bg-linear-to-bl from-primary/10 via-card to-card shadow-elegant">
          <div className="grid md:grid-cols-2 gap-8 p-8 md:p-12">
            {/* Right: Text + CTA */}
            <div className="space-y-5 text-right">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
                <Download className="h-4 w-4" />
                <span>تطبيق متاح للتثبيت</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold leading-tight">
                حمّل <span className="text-gradient">SAHLAPOS</span>
                <br />
                واعمل حتى بدون إنترنت
              </h2>
              <p className="text-muted-foreground text-lg">
                ثبّت التطبيق على هاتفك أو حاسوبك بضغطة واحدة. تجربة كاملة كأي تطبيق أصلي،
                سرعة فائقة، أيقونة على الشاشة الرئيسية، ودعم العمل دون اتصال.
              </p>

              <ul className="space-y-2 text-sm">
                {[
                  "تشغيل بكامل الشاشة بدون شريط متصفح",
                  "أيقونة على سطح المكتب والشاشة الرئيسية",
                  "أداء فائق وتخزين محلي ذكي",
                  "متاح على Android • iOS • Windows • macOS",
                ].map((t) => (
                  <li key={t} className="flex items-center gap-2 justify-end">
                    <span>{t}</span>
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                  </li>
                ))}
              </ul>

              <div className="flex flex-wrap gap-3 pt-2">
                <Button
                  onClick={handleInstall}
                  size="lg"
                  className="bg-gradient-primary text-primary-foreground shadow-glow gap-2 h-12 px-8 text-base"
                >
                  <Download className="h-5 w-5" />
                  {installed ? "التطبيق مثبّت" : "حمّل التطبيق الآن"}
                </Button>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Smartphone className="h-4 w-4" /> Android</span>
                  <span className="flex items-center gap-1"><Apple className="h-4 w-4" /> iOS</span>
                  <span className="flex items-center gap-1"><Monitor className="h-4 w-4" /> Desktop</span>
                </div>
              </div>
            </div>

            {/* Left: Phone mockup */}
            <div className="relative flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-primary opacity-20 blur-3xl rounded-full" />
              <div className="relative w-56 h-[420px] rounded-[2.5rem] border-[10px] border-foreground/90 bg-background shadow-2xl overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 bg-foreground/90 rounded-b-2xl z-10" />
                <div className="h-full w-full bg-gradient-mesh flex flex-col items-center justify-center p-4 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-primary text-primary-foreground flex items-center justify-center text-2xl font-bold shadow-glow mb-3">
                    S
                  </div>
                  <div className="font-bold text-lg">SAHLAPOS</div>
                  <div className="text-xs text-muted-foreground mt-1">نظام نقاط البيع</div>
                  <div className="mt-6 w-full space-y-2">
                    <div className="h-2 bg-muted rounded-full" />
                    <div className="h-2 bg-muted rounded-full w-4/5 mx-auto" />
                    <div className="h-2 bg-muted rounded-full w-3/5 mx-auto" />
                  </div>
                  <div className="mt-6 px-4 py-2 rounded-lg bg-gradient-primary text-primary-foreground text-xs font-semibold w-full">
                    افتح التطبيق
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={iosOpen} onOpenChange={setIosOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-right">تثبيت التطبيق على iPhone / iPad</DialogTitle>
          </DialogHeader>
          <ol className="space-y-3 text-sm text-right">
            <li className="flex items-center gap-2 justify-end">
              <span>افتح الموقع في Safari</span>
              <Apple className="h-4 w-4 text-primary" />
            </li>
            <li className="flex items-center gap-2 justify-end">
              <span>اضغط زر المشاركة</span>
              <Share2 className="h-4 w-4 text-primary" />
            </li>
            <li className="flex items-center gap-2 justify-end">
              <span>اختر "إضافة إلى الشاشة الرئيسية"</span>
              <Plus className="h-4 w-4 text-primary" />
            </li>
            <li className="flex items-center gap-2 justify-end">
              <span>اضغط "إضافة" — وسيظهر التطبيق على شاشتك</span>
              <CheckCircle2 className="h-4 w-4 text-primary" />
            </li>
          </ol>
        </DialogContent>
      </Dialog>
    </section>
  );
}
