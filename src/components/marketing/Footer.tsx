import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";

export function Footer() {
  const { t } = useTranslation();
  return (
    <footer className="border-t border-border/40 bg-gradient-subtle">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <Link to="/" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold">{t("brand.name")}</span>
            </Link>
            <p className="mt-3 text-sm text-muted-foreground">{t("brand.tagline")}</p>
          </div>
          <div>
            <h4 className="mb-3 font-semibold">{t("footer.product")}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/features" className="hover:text-foreground">{t("nav.features")}</Link></li>
              <li><Link to="/pricing" className="hover:text-foreground">{t("nav.pricing")}</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 font-semibold">{t("footer.company")}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/contact" className="hover:text-foreground">{t("nav.contact")}</Link></li>
              <li><a href="#" className="hover:text-foreground">{t("footer.about")}</a></li>
            </ul>
          </div>
          <div>
            <h4 className="mb-3 font-semibold">{t("footer.legal")}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground">{t("footer.privacy")}</a></li>
              <li><a href="#" className="hover:text-foreground">{t("footer.terms")}</a></li>
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t border-border/40 pt-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} {t("brand.name")}. {t("footer.rights")}
        </div>
      </div>
    </footer>
  );
}
