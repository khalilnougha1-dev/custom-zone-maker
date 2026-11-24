import { Link } from "@tanstack/react-router";
import { BrandLogo } from "@/components/BrandLogo";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/use-auth";
import { LayoutDashboard, LogIn, Download } from "lucide-react";
import apkAsset from "@/assets/sahlapos-apk.asset.json";

export function Header() {
  const { t } = useTranslation();
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full px-2 pt-2 sm:px-4 sm:pt-3">
      <div className="container mx-auto flex h-14 items-center justify-between gap-2 rounded-2xl border border-border/50 bg-card/75 px-3 shadow-card backdrop-blur-xl sm:h-16 sm:px-5">
        <Link to="/" className="group flex min-w-0 items-center gap-2.5">
          <span className="relative flex">
            <span aria-hidden className="absolute inset-0 rounded-xl bg-gradient-primary opacity-40 blur-md transition-opacity group-hover:opacity-70" />
            <BrandLogo className="relative h-9 w-9 sm:h-10 sm:w-10" />
          </span>
          <span className="flex min-w-0 flex-col leading-none">
            <span className="truncate text-base font-extrabold tracking-tight text-gradient sm:text-xl">{t("brand.name")}</span>
            <span className="hidden text-[10px] font-medium text-muted-foreground sm:block">نقاط البيع والمخزون</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 rounded-full border border-border/50 bg-background/60 p-1 md:flex">
          <Link
            to="/features"
            className="rounded-full px-4 py-1.5 text-sm font-medium text-muted-foreground transition-smooth hover:bg-primary/10 hover:text-primary"
            activeProps={{ className: "bg-primary/10 text-primary" }}
          >
            {t("nav.features")}
          </Link>
          <Link
            to="/contact"
            className="rounded-full px-4 py-1.5 text-sm font-medium text-muted-foreground transition-smooth hover:bg-primary/10 hover:text-primary"
            activeProps={{ className: "bg-primary/10 text-primary" }}
          >
            {t("nav.contact")}
          </Link>
        </nav>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
          <Button
            asChild
            size="sm"
            variant="outline"
            className="hidden h-9 gap-2 rounded-full border-primary/30 bg-background/60 sm:inline-flex"
          >
            <a href={apkAsset.url} download="SAHLAPOS.apk">
              <Download className="h-4 w-4 text-primary" />
              <span className="hidden sm:inline">تحميل التطبيق</span>
            </a>
          </Button>
          {user ? (
            <Button asChild size="sm" className="h-9 gap-2 rounded-full bg-gradient-primary shadow-glow hover:opacity-90">
              <Link to="/dashboard">
                <LayoutDashboard className="h-4 w-4" />
                {t("nav.dashboard")}
              </Link>
            </Button>
          ) : (
            <Button asChild size="sm" className="h-9 gap-2 rounded-full bg-gradient-primary px-4 shadow-glow hover:opacity-90">
              <Link to="/login">
                <LogIn className="h-4 w-4" />
                {t("nav.login")}
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
