import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useAuth } from "@/hooks/use-auth";
import { LayoutDashboard, Sparkles } from "lucide-react";

export function Header() {
  const { t } = useTranslation();
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold tracking-tight">{t("brand.name")}</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <Link to="/features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-smooth">
            {t("nav.features")}
          </Link>
          <Link to="/pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-smooth">
            {t("nav.pricing")}
          </Link>
          <Link to="/contact" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-smooth">
            {t("nav.contact")}
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          {user ? (
            <Button asChild size="sm" className="gap-2">
              <Link to="/dashboard">
                <LayoutDashboard className="h-4 w-4" />
                {t("nav.dashboard")}
              </Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link to="/login">{t("nav.login")}</Link>
              </Button>
              <Button asChild size="sm" className="bg-gradient-primary hover:opacity-90 shadow-md">
                <Link to="/signup">{t("nav.signup")}</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
