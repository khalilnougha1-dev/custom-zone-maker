import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { BrandLogo } from "@/components/BrandLogo";
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
import { isAppLocked, unlockApp } from "@/lib/biometric-auth";

export const Route = createFileRoute("/login")({
  component: LoginPage,
  head: () => ({
    meta: [
      { title: "تسجيل الدخول | SAHLAPOS" },
      { name: "description", content: "تسجيل الدخول الآمن إلى تطبيق SAHLAPOS بالبريد أو Google أو بصمة التطبيق." },
      { property: "og:title", content: "تسجيل الدخول | SAHLAPOS" },
      { property: "og:description", content: "تسجيل الدخول الآمن إلى تطبيق SAHLAPOS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const schema = z.object({
  email: z.string().trim().email({ message: "Invalid email" }).max(255),
  password: z.string().min(6, { message: "Min 6 characters" }).max(72),
});

function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("oauth") === "failed") {
      toast.error("تعذّر إكمال تسجيل الدخول. أعد المحاولة.");
    }
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && !isAppLocked()) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ email, password });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    unlockApp();
    toast.success(t("auth.success"));
    navigate({ to: "/dashboard" });
  };

  return (
    <div className="flex min-h-screen bg-gradient-mesh">
      <div className="flex w-full flex-col">
        <header className="flex items-center justify-between p-4">
          <Link to="/" className="flex items-center gap-2">
            <BrandLogo className="h-9 w-9" />
            <span className="font-bold">{t("brand.name")}</span>
          </Link>
          <LanguageSwitcher />
        </header>

        <div className="flex flex-1 items-center justify-center px-4 py-8">
          <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card p-8 shadow-elegant">
            <div className="text-center">
              <h1 className="text-2xl font-bold">{t("auth.loginTitle")}</h1>
              <p className="mt-2 text-sm text-muted-foreground">{t("auth.loginSubtitle")}</p>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <div>
                <Label htmlFor="email">{t("auth.email")}</Label>
                <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1.5" />
              </div>
              <div>
                <Label htmlFor="password">{t("auth.password")}</Label>
                <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1.5" />
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-gradient-primary h-11">
                {loading ? t("auth.loading") : t("auth.login")}
              </Button>
            </form>

            <SocialAuthButtons />
            <BiometricAuthButton />

            <p className="mt-6 text-center text-sm text-muted-foreground">
              {t("auth.noAccount")}{" "}
              <Link to="/signup" className="font-semibold text-primary hover:underline">
                {t("auth.createAccount")}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
