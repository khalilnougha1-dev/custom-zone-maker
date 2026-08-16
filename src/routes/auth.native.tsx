import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { lovable } from "@/integrations/lovable/index";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth/native")({
  component: NativeAuthBridge,
  head: () => ({
    meta: [
      { title: "تسجيل الدخول - SAHLAPOS" },
      { name: "description", content: "صفحة إتمام تسجيل الدخول عبر Google للعودة إلى تطبيق SAHLAPOS." },
      { property: "og:title", content: "تسجيل الدخول - SAHLAPOS" },
      { property: "og:description", content: "صفحة إتمام تسجيل الدخول عبر Google للعودة إلى تطبيق SAHLAPOS." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function NativeAuthBridge() {
  const [status, setStatus] = useState("جارٍ تجهيز تسجيل الدخول…");
  const [deepLink, setDeepLink] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let authSubscription: { unsubscribe: () => void } | null = null;

    const backToApp = (access_token: string, refresh_token: string) => {
      const link = `sahlapos://auth?access_token=${encodeURIComponent(
        access_token,
      )}&refresh_token=${encodeURIComponent(refresh_token)}`;
      setDeepLink(link);
      setStatus("تم تسجيل الدخول، جارٍ العودة إلى التطبيق…");
      window.location.href = link;
    };

    const run = async () => {
      const params = new URLSearchParams(window.location.search);
      const provider = (params.get("provider") as "google" | "apple") || "google";
      const providerName = provider === "apple" ? "Apple" : "Google";

      const waitForSession = () =>
        new Promise<boolean>((resolve) => {
          const timeout = window.setTimeout(() => resolve(false), 10_000);
          const { data } = supabase.auth.onAuthStateChange((_event, session) => {
            authSubscription = data.subscription;
            if (!session?.access_token || !session.refresh_token) return;
            window.clearTimeout(timeout);
            backToApp(session.access_token, session.refresh_token);
            resolve(true);
          });
          authSubscription = data.subscription;
        });

      // إن كانت هناك جلسة أصلاً (بعد العودة من Google) نعود مباشرة للتطبيق
      const { data } = await supabase.auth.getSession();
      if (data.session?.access_token && data.session?.refresh_token) {
        backToApp(data.session.access_token, data.session.refresh_token);
        return;
      }

      setStatus(`جارٍ فتح تسجيل الدخول عبر ${providerName}…`);
      const redirect_uri = `${window.location.origin}/auth/native?provider=${provider}&native=1`;
      const sessionWaiter = waitForSession();
      const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri });

      if (cancelled) return;
      if ((result as any).error) {
        setStatus((result as any).error?.message || "تعذّر تسجيل الدخول، حاول مرة أخرى.");
        return;
      }
      if ((result as any).redirected) return;

      const { data: after } = await supabase.auth.getSession();
      if (after.session?.access_token && after.session?.refresh_token) {
        backToApp(after.session.access_token, after.session.refresh_token);
      } else if (!(await sessionWaiter) && !cancelled) {
        setStatus("لم يتم استلام الجلسة. أعد المحاولة من التطبيق.");
      }
    };

    void run();
    return () => {
      cancelled = true;
      authSubscription?.unsubscribe();
    };
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center">
      <h1 className="text-lg font-semibold text-foreground">تسجيل الدخول إلى SAHLAPOS</h1>
      <p className="text-sm text-muted-foreground">{status}</p>
      {deepLink && (
        <a
          href={deepLink}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          العودة إلى التطبيق
        </a>
      )}
    </main>
  );
}
