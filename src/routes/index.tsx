import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ArrowRight, ShoppingCart, Package, Users, BarChart3, Globe2, Zap, Check, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/marketing/Header";
import { Footer } from "@/components/marketing/Footer";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";
  const Arrow = isRtl ? () => <ArrowRight className="h-4 w-4 rotate-180" /> : () => <ArrowRight className="h-4 w-4" />;

  const features = [
    { icon: Zap, key: "cashier" },
    { icon: ShoppingCart, key: "sales" },
    { icon: Package, key: "inventory" },
    { icon: Users, key: "customers" },
    { icon: BarChart3, key: "reports" },
    { icon: Globe2, key: "multi" },
  ] as const;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-mesh">
        <div className="container mx-auto px-4 py-20 md:py-32">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
              {t("hero.badge")}
            </div>
            <h1 className="text-5xl font-bold leading-tight tracking-tight md:text-7xl">
              {t("hero.title")}
              <br />
              <span className="text-gradient">{t("hero.titleHighlight")}</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
              {t("hero.subtitle")}
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Button asChild size="lg" className="bg-gradient-primary hover:opacity-90 shadow-glow gap-2 h-12 px-8 text-base">
                <Link to="/signup">
                  {t("hero.cta")}
                  <Arrow />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="gap-2 h-12 px-8 text-base">
                <Play className="h-4 w-4" />
                {t("hero.ctaSecondary")}
              </Button>
            </div>
            <p className="mt-6 text-sm text-muted-foreground">{t("hero.trial")}</p>
          </div>

          {/* Floating preview cards */}
          <div className="relative mx-auto mt-16 max-w-5xl">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {[
                { v: "10K+", k: "users" },
                { v: "500K+", k: "transactions" },
                { v: "25+", k: "countries" },
                { v: "99.9%", k: "uptime" },
              ].map((s) => (
                <div key={s.k} className="rounded-2xl border border-border/60 bg-card/80 p-6 text-center shadow-card backdrop-blur">
                  <div className="text-3xl font-bold text-gradient md:text-4xl">{s.v}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{t(`stats.${s.k}`)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-4xl font-bold md:text-5xl">{t("features.title")}</h2>
            <p className="mt-4 text-lg text-muted-foreground">{t("features.subtitle")}</p>
          </div>
          <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, key }) => (
              <div key={key} className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card p-8 shadow-card transition-smooth hover:shadow-elegant hover:-translate-y-1">
                <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold">{t(`features.${key}.title`)}</h3>
                <p className="mt-2 text-muted-foreground">{t(`features.${key}.desc`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="bg-gradient-subtle py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-4xl font-bold md:text-5xl">{t("pricing.title")}</h2>
            <p className="mt-4 text-lg text-muted-foreground">{t("pricing.subtitle")}</p>
          </div>
          <div className="mx-auto mt-12 grid max-w-5xl gap-6 md:grid-cols-3">
            {(["starter", "pro", "enterprise"] as const).map((plan) => {
              const isPopular = plan === "pro";
              return (
                <div
                  key={plan}
                  className={`relative rounded-2xl border bg-card p-8 shadow-card transition-smooth ${
                    isPopular ? "border-primary shadow-glow scale-105" : "border-border/60"
                  }`}
                >
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
                      plan === "starter" ? "100 منتج" : t("pricing.features.unlimited") + " " + t("pricing.features.products"),
                      (plan === "starter" ? "1" : plan === "pro" ? "5" : t("pricing.features.unlimited")) + " " + t("pricing.features.users"),
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
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl rounded-3xl bg-gradient-hero p-12 text-center shadow-glow md:p-16">
            <h2 className="text-3xl font-bold text-primary-foreground md:text-5xl">{t("cta.title")}</h2>
            <p className="mt-4 text-lg text-primary-foreground/80">{t("cta.subtitle")}</p>
            <Button asChild size="lg" variant="secondary" className="mt-8 h-12 px-8 text-base">
              <Link to="/signup">{t("cta.button")}</Link>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
