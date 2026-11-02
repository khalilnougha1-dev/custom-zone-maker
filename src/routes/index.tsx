import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  ArrowRight, Play, ShieldCheck, Cloud, Smartphone, Printer, Receipt, TrendingUp,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/marketing/Header";
import { Footer } from "@/components/marketing/Footer";
import { InstallAppSection } from "@/components/marketing/InstallAppSection";
import { BrandLogo } from "@/components/BrandLogo";
import { ICONS_3D } from "@/lib/icons3d";
import hero3d from "@/assets/hero-3d.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SahlaPos — نظام نقاط البيع وإدارة المخزون في الجزائر" },
      { name: "description", content: "SahlaPos منصة احترافية لنقاط البيع، المخزون، الزبائن والتقارير مع طباعة بلوتوث والعمل دون إنترنت." },
      { property: "og:title", content: "SahlaPos — نظام نقاط البيع الاحترافي" },
      { property: "og:description", content: "أدر مبيعاتك ومخزونك وزبائنك من أي جهاز، حتى بدون إنترنت." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "ar";
  const Arrow = isRtl ? () => <ArrowRight className="h-4 w-4 rotate-180" /> : () => <ArrowRight className="h-4 w-4" />;

  const features = [
    { key: "cashier", img: ICONS_3D["/app/pos"] },
    { key: "sales", img: ICONS_3D["/app/sales"] },
    { key: "inventory", img: ICONS_3D["/app/inventory"] },
    { key: "customers", img: ICONS_3D["/app/customers"] },
    { key: "reports", img: ICONS_3D["/app/reports"] },
    { key: "multi", img: ICONS_3D["/app/settings"] },
  ] as const;

  const advantages = [
    { icon: ShieldCheck, title: "أمان متقدم", desc: "بياناتك محمية بتشفير على مستوى البنوك ونسخ احتياطية يومية." },
    { icon: Cloud, title: "سحابي 100%", desc: "اعمل من أي مكان وعلى أي جهاز دون الحاجة لتثبيت برامج." },
    { icon: Smartphone, title: "متوافق مع الجوال", desc: "واجهة محسّنة للهواتف واللوحات لإدارة نشاطك أثناء التنقل." },
    { icon: Printer, title: "طباعة احترافية", desc: "دعم طابعات الإيصالات 58mm و80mm وطباعة A4 بثلاث لغات." },
    { icon: Receipt, title: "فواتير ذكية", desc: "أنشئ فواتير المبيعات والمشتريات بثوانٍ مع حساب الديون تلقائياً." },
    { icon: TrendingUp, title: "تقارير لحظية", desc: "تابع أرباحك ومخزونك ووضعيتك المالية في أي وقت." },
  ];

  const steps = [
    { n: "01", title: "أنشئ حسابك", desc: "سجّل في أقل من دقيقة وابدأ فوراً." },
    { n: "02", title: "أضف منتجاتك", desc: "استورد قائمتك أو أضفها يدوياً مع الباركود." },
    { n: "03", title: "ابدأ البيع", desc: "افتح نقطة البيع وأدر نشاطك باحترافية." },
  ];

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden bg-aurora">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="animate-blob absolute -top-20 right-0 h-96 w-96 rounded-full bg-primary/25 blur-3xl" />
          <div className="animate-blob absolute bottom-0 -left-20 h-96 w-96 rounded-full bg-accent/25 blur-3xl [animation-delay:-6s]" />
        </div>
        <div className="container relative mx-auto px-4 py-12 sm:py-20 md:py-24">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div className="text-center lg:text-start">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-card/70 px-3 py-1.5 text-sm font-medium text-primary shadow-card backdrop-blur">
                <BrandLogo className="h-6 w-6" />
                <Sparkles className="h-4 w-4" />
                {t("hero.badge")}
              </div>
              <h1 className="text-3xl font-extrabold leading-tight tracking-tight break-words sm:text-5xl md:text-6xl">
                {t("hero.title")}
                <br />
                <span className="text-gradient">{t("hero.titleHighlight")}</span>
              </h1>
              <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground sm:mt-6 sm:text-lg lg:mx-0">
                {t("hero.subtitle")}
              </p>
              <div className="mt-8 flex w-full flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center lg:justify-start">
                <Button asChild size="lg" className="w-full bg-gradient-primary hover:opacity-90 shadow-glow gap-2 h-12 px-6 text-base sm:w-auto sm:px-8">
                  <Link to="/login">
                    دخول لوحة التحكم
                    <Arrow />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="w-full gap-2 h-12 px-6 text-base sm:w-auto sm:px-8 bg-card/60 backdrop-blur">
                  <Play className="h-4 w-4" />
                  {t("hero.ctaSecondary")}
                </Button>
              </div>
            </div>
            <div className="relative mx-auto w-full max-w-md lg:max-w-lg">
              <div className="absolute inset-8 rounded-full bg-gradient-primary opacity-30 blur-3xl" />
              <img
                src={hero3d}
                alt="نقطة بيع SahlaPos ثلاثية الأبعاد"
                width={820}
                height={820}
                className="relative w-full animate-float drop-shadow-2xl"
              />
            </div>
          </div>

          {/* Stats */}
          <div className="relative mx-auto mt-10 max-w-5xl sm:mt-16">
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {[
                { v: "10K+", k: "users" },
                { v: "500K+", k: "transactions" },
                { v: "25+", k: "countries" },
                { v: "99.9%", k: "uptime" },
              ].map((s) => (
                <div key={s.k} className="tile-3d rounded-2xl p-4 text-center sm:p-6">
                  <div className="text-2xl font-bold text-gradient sm:text-3xl md:text-4xl">{s.v}</div>
                  <div className="mt-1 text-xs text-muted-foreground sm:text-sm">{t(`stats.${s.k}`)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-12 sm:py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold sm:text-4xl md:text-5xl">{t("features.title")}</h2>
            <p className="mt-3 text-base text-muted-foreground sm:mt-4 sm:text-lg">{t("features.subtitle")}</p>
          </div>
          <div className="mt-8 grid gap-4 sm:mt-16 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map(({ key, img }) => (
              <div key={key} className="group tile-3d relative overflow-hidden rounded-3xl p-5 sm:p-8">
                <img src={img} alt="" width={80} height={80} loading="lazy" className="icon-3d mb-4 h-20 w-20 object-contain" />
                <h3 className="text-xl font-semibold">{t(`features.${key}.title`)}</h3>
                <p className="mt-2 text-muted-foreground">{t(`features.${key}.desc`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why us */}
      <section className="bg-gradient-subtle py-12 sm:py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold sm:text-4xl md:text-5xl">لماذا SAHLAPOS؟</h2>
            <p className="mt-3 text-base text-muted-foreground sm:mt-4 sm:text-lg">منصة احترافية مصممة لتجار الجزائر والمنطقة العربية</p>
          </div>
          <div className="mt-8 grid gap-4 sm:mt-16 sm:gap-6 md:grid-cols-2 lg:grid-cols-3">
            {advantages.map((a) => (
              <div key={a.title} className="tile-3d rounded-2xl p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <a.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{a.title}</h3>
                    <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{a.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-12 sm:py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold sm:text-4xl md:text-5xl">ابدأ في 3 خطوات</h2>
            <p className="mt-3 text-base text-muted-foreground sm:mt-4 sm:text-lg">واجهة بسيطة، نتائج احترافية</p>
          </div>
          <div className="mt-8 grid gap-4 sm:mt-16 sm:gap-6 md:grid-cols-3">
            {steps.map((s) => (
              <div key={s.n} className="tile-3d relative rounded-2xl p-5 sm:p-8">
                <div className="text-4xl font-bold text-gradient sm:text-5xl">{s.n}</div>
                <h3 className="mt-4 text-xl font-semibold">{s.title}</h3>
                <p className="mt-2 text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Install PWA */}
      <InstallAppSection />

      {/* CTA */}
      <section className="py-12 sm:py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl rounded-3xl bg-gradient-hero p-6 text-center shadow-glow sm:p-12 md:p-16">
            <h2 className="text-2xl font-bold text-primary-foreground sm:text-3xl md:text-5xl">{t("cta.title")}</h2>
            <p className="mt-3 text-base text-primary-foreground/80 sm:mt-4 sm:text-lg">{t("cta.subtitle")}</p>
            <div className="mt-6 flex flex-col items-stretch justify-center gap-3 sm:mt-8 sm:flex-row sm:items-center">
              <Button asChild size="lg" variant="secondary" className="h-12 w-full px-6 text-base sm:w-auto sm:px-8">
                <Link to="/login">دخول لوحة التحكم</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 w-full px-6 text-base sm:w-auto sm:px-8 bg-transparent text-primary-foreground border-primary-foreground/40 hover:bg-primary-foreground/10">
                <Link to="/contact">اتصل بنا</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
