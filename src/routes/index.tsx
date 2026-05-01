import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  ArrowRight, ShoppingCart, Package, Users, BarChart3, Globe2, Zap,
  Play, ShieldCheck, Cloud, Smartphone, Printer, Receipt, TrendingUp,
  Sparkles, CheckCircle2, Star,
} from "lucide-react";
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
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-mesh">
        <div className="container mx-auto px-4 py-20 md:py-32">
          <div className="mx-auto max-w-4xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
              <Sparkles className="h-4 w-4" />
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
                <Link to="/login">
                  دخول لوحة التحكم
                  <Arrow />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="gap-2 h-12 px-8 text-base">
                <Play className="h-4 w-4" />
                {t("hero.ctaSecondary")}
              </Button>
            </div>
          </div>

          {/* Stats */}
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

      {/* Why us */}
      <section className="bg-gradient-subtle py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-4xl font-bold md:text-5xl">لماذا SAHLAPOS؟</h2>
            <p className="mt-4 text-lg text-muted-foreground">منصة احترافية مصممة لتجار الجزائر والمنطقة العربية</p>
          </div>
          <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {advantages.map((a) => (
              <div key={a.title} className="rounded-2xl border border-border/60 bg-card p-6 shadow-card">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <a.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{a.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{a.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-4xl font-bold md:text-5xl">ابدأ في 3 خطوات</h2>
            <p className="mt-4 text-lg text-muted-foreground">واجهة بسيطة، نتائج احترافية</p>
          </div>
          <div className="mt-16 grid gap-6 md:grid-cols-3">
            {steps.map((s) => (
              <div key={s.n} className="relative rounded-2xl border border-border/60 bg-card p-8 shadow-card">
                <div className="text-5xl font-bold text-gradient">{s.n}</div>
                <h3 className="mt-4 text-xl font-semibold">{s.title}</h3>
                <p className="mt-2 text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-gradient-subtle py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-4xl font-bold md:text-5xl">يثقون بنا</h2>
            <p className="mt-4 text-lg text-muted-foreground">آراء تجار يستخدمون SAHLAPOS يومياً</p>
          </div>
          <div className="mt-16 grid gap-6 md:grid-cols-3">
            {[
              { name: "أحمد بن علي", role: "صاحب متجر مواد غذائية", quote: "غيّر طريقة عملي تماماً. أصبحت أتابع كل شيء من هاتفي." },
              { name: "ليلى مرابط", role: "مديرة بوتيك", quote: "سهل وسريع، والدعم الفني ممتاز. أنصح به بشدة." },
              { name: "كريم بوزيد", role: "صيدلي", quote: "التقارير دقيقة والمخزون منظم. وفّر علي ساعات يومياً." },
            ].map((tst) => (
              <div key={tst.name} className="rounded-2xl border border-border/60 bg-card p-6 shadow-card">
                <div className="flex gap-1 text-warning">
                  {[...Array(5)].map((_, i) => <Star key={i} className="h-4 w-4 fill-current" />)}
                </div>
                <p className="mt-4 text-foreground">"{tst.quote}"</p>
                <div className="mt-4 border-t border-border/60 pt-4">
                  <div className="font-semibold">{tst.name}</div>
                  <div className="text-sm text-muted-foreground">{tst.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl rounded-3xl bg-gradient-hero p-12 text-center shadow-glow md:p-16">
            <h2 className="text-3xl font-bold text-primary-foreground md:text-5xl">{t("cta.title")}</h2>
            <p className="mt-4 text-lg text-primary-foreground/80">{t("cta.subtitle")}</p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button asChild size="lg" variant="secondary" className="h-12 px-8 text-base">
                <Link to="/login">دخول لوحة التحكم</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="h-12 px-8 text-base bg-transparent text-primary-foreground border-primary-foreground/40 hover:bg-primary-foreground/10">
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
