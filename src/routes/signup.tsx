import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { SocialAuthButtons } from "@/components/auth/SocialAuthButtons";
import { BiometricAuthButton } from "@/components/auth/BiometricAuthButton";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
  head: () => ({
    meta: [
      { title: "إنشاء حساب | SAHLAPOS" },
      { name: "description", content: "إنشاء حساب جديد في تطبيق SAHLAPOS لإدارة المبيعات والمخزون." },
      { property: "og:title", content: "إنشاء حساب | SAHLAPOS" },
      { property: "og:description", content: "إنشاء حساب جديد في تطبيق SAHLAPOS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const schema = z.object({
  fullName: z.string().trim().min(2, { message: "Name too short" }).max(100),
  businessName: z.string().trim().max(100).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  email: z.string().trim().email({ message: "Invalid email" }).max(255),
  password: z
    .string()
    .min(8, { message: "Password must be at least 8 characters" })
    .max(72)
    .regex(/[A-Za-z]/, { message: "Must contain a letter" })
    .regex(/[0-9]/, { message: "Must contain a number" }),
});

function SignupPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: "", businessName: "", phone: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { full_name: form.fullName, business_name: form.businessName, phone: form.phone },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (!data.session) {
      toast.success("تم إنشاء الحساب. افتح بريدك وأكّد الحساب ثم سجّل الدخول");
      navigate({ to: "/login" });
      return;
    }
    toast.success(t("auth.success"));
    navigate({ to: "/dashboard" });
  };

  const update = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div className="flex min-h-screen bg-gradient-mesh">
      <div className="flex w-full flex-col">
        <header className="flex items-center justify-between p-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold">{t("brand.name")}</span>
          </Link>
          <LanguageSwitcher />
        </header>

        <div className="flex flex-1 items-center justify-center px-4 py-8">
          <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card p-8 shadow-elegant">
            <div className="text-center">
              <h1 className="text-2xl font-bold">{t("auth.signupTitle")}</h1>
              <p className="mt-2 text-sm text-muted-foreground">{t("auth.signupSubtitle")}</p>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <div>
                <Label htmlFor="fullName">{t("auth.fullName")}</Label>
                <Input id="fullName" required value={form.fullName} onChange={update("fullName")} className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="businessName">{t("auth.businessName")}</Label>
                <Input id="businessName" value={form.businessName} onChange={update("businessName")} className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="phone">{t("auth.phone")}</Label>
                <Input id="phone" type="tel" value={form.phone} onChange={update("phone")} className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="email">{t("auth.email")}</Label>
                <Input id="email" type="email" required value={form.email} onChange={update("email")} className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="password">{t("auth.password")}</Label>
                <Input id="password" type="password" required minLength={8} value={form.password} onChange={update("password")} className="mt-1.5" />
                <p className="mt-1 text-xs text-muted-foreground">8+ caractères, lettres & chiffres</p>
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-gradient-primary h-11">
                {loading ? t("auth.loading") : t("auth.signup")}
              </Button>
            </form>

            <SocialAuthButtons />
            <BiometricAuthButton />

            <p className="mt-6 text-center text-sm text-muted-foreground">
              {t("auth.hasAccount")}{" "}
              <Link to="/login" className="font-semibold text-primary hover:underline">
                {t("auth.signIn")}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
