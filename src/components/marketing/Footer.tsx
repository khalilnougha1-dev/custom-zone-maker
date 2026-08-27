import { Link } from "@tanstack/react-router";
import { BrandLogo } from "@/components/BrandLogo";
import { useTranslation } from "react-i18next";
import { Sparkles, MessageCircle, Send } from "lucide-react";

export function Footer() {
  const { t } = useTranslation();
  return (
    <>
    <div className="fixed bottom-6 left-6 z-50 flex flex-col gap-3">
      <a
        href="https://wa.me/message/Y2I2TNJLNPOTE1"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="WhatsApp"
        className="flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-elegant transition hover:scale-110"
      >
        <MessageCircle className="h-7 w-7" />
      </a>
      <a
        href="https://t.me/Sahlapay_service_client"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Telegram"
        className="flex h-14 w-14 items-center justify-center rounded-full bg-[#229ED9] text-white shadow-elegant transition hover:scale-110"
      >
        <Send className="h-7 w-7" />
      </a>
    </div>
    <footer className="border-t border-border/40 bg-gradient-subtle">
      <div className="container mx-auto px-4 py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <Link to="/" className="flex items-center gap-2">
              <BrandLogo className="h-8 w-8" />
              <span className="text-lg font-bold">{t("brand.name")}</span>
            </Link>
            <p className="mt-3 text-sm text-muted-foreground">{t("brand.tagline")}</p>
          </div>
          <div>
            <h4 className="mb-3 font-semibold">{t("footer.product")}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link to="/features" className="hover:text-foreground">{t("nav.features")}</Link></li>
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
    </>
  );
}
