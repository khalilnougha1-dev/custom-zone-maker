import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Sparkles, ShoppingCart, Users, Package, BarChart3, LogOut, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard")({
  component: DashboardPage,
});

function DashboardPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [profile, setProfile] = useState<{ full_name: string | null; business_name: string | null } | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("full_name, business_name").eq("id", user.id).single()
      .then(({ data }) => setProfile(data));
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("👋");
    navigate({ to: "/" });
  };

  if (loading || !user) {
    return <div className="flex min-h-screen items-center justify-center">...</div>;
  }

  const cards = [
    { icon: Wallet, title: "الصندوق", value: "0.00", desc: "اليوم" },
    { icon: ShoppingCart, title: "المبيعات", value: "0", desc: "عملية" },
    { icon: Package, title: "المنتجات", value: "0", desc: "منتج" },
    { icon: Users, title: "الزبائن", value: "0", desc: "زبون" },
  ];

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold">{t("brand.name")}</span>
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">{t("nav.logout")}</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">مرحباً، {profile?.full_name || user.email}</h1>
          <p className="mt-1 text-muted-foreground">
            {profile?.business_name ? `${profile.business_name} · ` : ""}لوحة التحكم الرئيسية
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {cards.map((c) => (
            <div key={c.title} className="rounded-2xl border border-border/60 bg-card p-6 shadow-card">
              <div className="flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground">
                  <c.icon className="h-5 w-5" />
                </div>
                <span className="text-xs text-muted-foreground">{c.desc}</span>
              </div>
              <div className="mt-4 text-3xl font-bold">{c.value}</div>
              <div className="mt-1 text-sm text-muted-foreground">{c.title}</div>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-8 text-center">
          <BarChart3 className="mx-auto h-10 w-10 text-primary" />
          <h2 className="mt-4 text-xl font-bold">المرحلة القادمة</h2>
          <p className="mt-2 text-muted-foreground">
            تطبيق POS الكامل (الصندوق، المبيعات، الزبائن، المنتجات، المخزون) ولوحة المسؤول قيد البناء.
          </p>
        </div>
      </main>
    </div>
  );
}
