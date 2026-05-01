import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Mail, Phone, MapPin } from "lucide-react";
import { Header } from "@/components/marketing/Header";
import { Footer } from "@/components/marketing/Footer";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "اتصل بنا — SAHLAPOS" },
      { name: "description", content: "تواصل مع فريق SAHLAPOS." },
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
        </div>
      </section>
      <section className="py-20">
        <div className="container mx-auto grid max-w-4xl gap-6 px-4 md:grid-cols-3">
          {[
            { icon: Mail, title: "Email", value: "contact@sahlapos.com" },
            { icon: Phone, title: "Phone", value: "+213 555 000 000" },
            { icon: MapPin, title: "Address", value: "Algiers, Algeria" },
          ].map((c) => (
            <div key={c.title} className="rounded-2xl border border-border/60 bg-card p-8 text-center shadow-card">
              <div className="mx-auto mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground">
                <c.icon className="h-6 w-6" />
              </div>
              <h3 className="font-semibold">{c.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{c.value}</p>
            </div>
          ))}
        </div>
      </section>
      <Footer />
    </div>
  );
}
