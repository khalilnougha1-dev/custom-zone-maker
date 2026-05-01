import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Mail, Phone, MapPin, MessageCircle, Send } from "lucide-react";
import { Header } from "@/components/marketing/Header";
import { Footer } from "@/components/marketing/Footer";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "اتصل بنا — SAHLAPOS" },
      { name: "description", content: "تواصل مع فريق SAHLAPOS عبر البريد، الهاتف، واتساب أو تليغرام." },
      { property: "og:title", content: "اتصل بنا — SAHLAPOS" },
      { property: "og:description", content: "تواصل مع فريق SAHLAPOS." },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <section className="bg-gradient-mesh py-20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold md:text-6xl">{t("nav.contact")}</h1>
          <p className="mt-4 text-lg text-muted-foreground">نحن هنا للإجابة على استفساراتك</p>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto grid max-w-5xl gap-6 px-4 md:grid-cols-3">
          {[
            { icon: Mail, title: "البريد الإلكتروني", value: "contact@sahlapay.dz", href: "mailto:contact@sahlapay.dz" },
            { icon: Phone, title: "الهاتف", value: "+213 540 420 706", href: "tel:+213540420706" },
            { icon: MapPin, title: "العنوان", value: "Algeria - Setif", href: null },
          ].map((c) => (
            <a
              key={c.title}
              href={c.href || "#"}
              className="rounded-2xl border border-border/60 bg-card p-8 text-center shadow-card transition hover:shadow-elegant"
            >
              <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground">
                <c.icon className="h-6 w-6" />
              </div>
              <h3 className="font-semibold">{c.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground" dir="ltr">{c.value}</p>
            </a>
          ))}
        </div>
      </section>

      <section className="pb-20">
        <div className="container mx-auto max-w-3xl px-4 text-center">
          <h2 className="text-3xl font-bold">تواصل معنا مباشرة</h2>
          <p className="mt-2 text-muted-foreground">احصل على رد سريع عبر تطبيقاتك المفضلة</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              asChild
              size="lg"
              className="h-14 min-w-[220px] gap-3 bg-[#25D366] text-white hover:bg-[#1ebe57]"
            >
              <a href="https://wa.me/message/Y2I2TNJLNPOTE1" target="_blank" rel="noopener noreferrer">
                <MessageCircle className="h-6 w-6" />
                واتساب
              </a>
            </Button>
            <Button
              asChild
              size="lg"
              className="h-14 min-w-[220px] gap-3 bg-[#229ED9] text-white hover:bg-[#1c87b9]"
            >
              <a href="https://t.me/Sahlapay_service_client" target="_blank" rel="noopener noreferrer">
                <Send className="h-6 w-6" />
                تليغرام
              </a>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
