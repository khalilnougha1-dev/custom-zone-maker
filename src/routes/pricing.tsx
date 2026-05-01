import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/marketing/Header";
import { Footer } from "@/components/marketing/Footer";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "الأسعار — khalilPoS" },
      { name: "description", content: "خطط أسعار مرنة تناسب جميع الأنشطة التجارية." },
    ],
  }),
  component: PricingPage,
});

function PricingPage() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="bg-gradient-mesh py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold md:text-6xl">{t("pricing.title")}</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">{t("pricing.subtitle")}</p>
        </div>
      </section>
      <section className="py-20">
        <div className="container mx-auto grid max-w-5xl gap-6 px-4 md:grid-cols-3">
          {(["starter", "pro", "enterprise"] as const).map((plan) => {
            const isPopular = plan === "pro";
            return (
              <div key={plan} className={`relative rounded-2xl border bg-card p-8 shadow-card ${isPopular ? "border-primary shadow-glow scale-105" : "border-border/60"}`}>
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-primary px-3 py-1 text-xs font-bold text-primary-foreground">
                    {t("pricing.pro.popular")}
                  </div>
                )}
                <h3 className="text-xl font-bold">{t(`pricing.${plan}.name`)}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{t(`pricing.${plan}.desc`)}</p>
                <div className="mt-6">
                  <span className="text-5xl font-bold">{plan === "starter" ? "0" : plan === "pro" ? "29" : "99"}</span>
                  <span className="text-muted-foreground"> $/{t("pricing.monthly")}</span>
                </div>
                <ul className="mt-6 space-y-3 text-sm">
                  {[
                    plan === "starter" ? "100 منتج" : `${t("pricing.features.unlimited")} ${t("pricing.features.products")}`,
                    `${plan === "starter" ? "1" : plan === "pro" ? "5" : t("pricing.features.unlimited")} ${t("pricing.features.users")}`,
                    t("pricing.features.support"),
                    ...(plan !== "starter" ? [t("pricing.features.reports")] : []),
                    ...(plan === "enterprise" ? [t("pricing.features.api"), t("pricing.features.priority")] : []),
                  ].map((f, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-success" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button asChild className={`mt-8 w-full ${isPopular ? "bg-gradient-primary" : ""}`} variant={isPopular ? "default" : "outline"}>
                  <Link to="/signup">{plan === "enterprise" ? t("pricing.contact") : t("pricing.cta")}</Link>
                </Button>
              </div>
            );
          })}
        </div>
      </section>
      <Footer />
    </div>
  );
}
