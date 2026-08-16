import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/use-auth";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { LayoutDashboard, Sparkles, Download } from "lucide-react";
import { toast } from "sonner";

export function Header() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { canInstall, installed, isIOS, install } = usePwaInstall();

  const handleInstall = async () => {
    if (installed) {
      toast.success("التطبيق مثبت بالفعل");
      return;
    }
    if (canInstall) {
      const outcome = await install();
      if (outcome === "accepted") toast.success("تم تثبيت التطبيق بنجاح");
      return;
    }
    if (isIOS) {
      toast.message("للتثبيت على iPhone: اضغط زر المشاركة ثم \"إضافة إلى الشاشة الرئيسية\"");
      return;
    }
    toast.message("افتح القائمة في متصفحك واختر \"تثبيت التطبيق\"");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-14 items-center justify-between gap-2 px-3 sm:h-16 sm:px-4">
        <Link to="/" className="flex min-w-0 items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-primary shadow-glow sm:h-9 sm:w-9">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="truncate text-base font-bold tracking-tight sm:text-xl">{t("brand.name")}</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <Link to="/features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-smooth">
            {t("nav.features")}
          </Link>
          <Link to="/contact" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-smooth">
            {t("nav.contact")}
          </Link>
        </nav>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="hidden gap-2 sm:inline-flex"
            onClick={handleInstall}
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">تحميل التطبيق</span>
          </Button>
          {user ? (
            <Button asChild size="sm" className="gap-2">
              <Link to="/dashboard">
                <LayoutDashboard className="h-4 w-4" />
                {t("nav.dashboard")}
              </Link>
            </Button>
          ) : (
            <Button asChild size="sm" className="bg-gradient-primary hover:opacity-90 shadow-md">
              <Link to="/login">{t("nav.login")}</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
