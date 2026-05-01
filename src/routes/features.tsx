import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ShoppingCart, Package, Users, BarChart3, Globe2, Zap } from "lucide-react";
import { Header } from "@/components/marketing/Header";
import { Footer } from "@/components/marketing/Footer";

export const Route = createFileRoute("/features")({
  head: () => ({
    meta: [
      { title: "الميزات — KuaiPOS" },
      { name: "description", content: "اكتشف جميع ميزات منصة KuaiPOS لإدارة نشاطك التجاري." },
    ],
  }),
  component: FeaturesPage,
});

function FeaturesPage() {
  const { t } = useTranslation();
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
      <section className="bg-gradient-mesh py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold md:text-6xl">{t("features.title")}</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">{t("features.subtitle")}</p>
        </div>
      </section>
      <section className="py-20">
        <div className="container mx-auto grid gap-6 px-4 md:grid-cols-2 lg:grid-cols-3">
          {features.map(({ icon: Icon, key }) => (
            <div key={key} className="rounded-2xl border border-border/60 bg-card p-8 shadow-card">
              <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-semibold">{t(`features.${key}.title`)}</h3>
              <p className="mt-2 text-muted-foreground">{t(`features.${key}.desc`)}</p>
            </div>
          ))}
        </div>
      </section>
      <Footer />
    </div>
  );
}
