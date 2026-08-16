import { supabase } from "@/integrations/supabase/client";

export const NATIVE_SCHEME = "sahlapos";
export const WEB_ORIGIN = "https://custom-zone-maker.lovable.app";

export function isNativeApp() {
  if (typeof window === "undefined") return false;
  return !!(window as any).Capacitor?.isNativePlatform?.();
}

/** يفتح تدفق OAuth في متصفح النظام (Custom Tab) ثم يعود للتطبيق عبر رابط عميق */
export async function startNativeOAuth(provider: "google" | "apple") {
  const { Browser } = await import("@capacitor/browser");
  const url = `${WEB_ORIGIN}/auth/native?provider=${provider}&native=1&phase=start`;
  await Browser.open({ url, presentationStyle: "popover" });
}

let installed = false;

/** يستقبل الرابط العميق العائد من المتصفح ويُنشئ الجلسة داخل التطبيق */
export async function installNativeOAuthListener(onSignedIn?: () => void) {
  if (installed || !isNativeApp()) return;
  installed = true;

  const { App } = await import("@capacitor/app");

  const handleUrl = async (rawUrl: string) => {
    if (!rawUrl || !rawUrl.startsWith(`${NATIVE_SCHEME}://`)) return;
    const parsed = new URL(rawUrl);
    const queryParams = parsed.searchParams;
    const hashParams = new URLSearchParams(parsed.hash.replace(/^#/, ""));
    const params = queryParams.size > 0 ? queryParams : hashParams;
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    try {
      const { Browser } = await import("@capacitor/browser");
      await Browser.close().catch(() => {});
    } catch {
      /* ignore */
    }
    if (!access_token || !refresh_token) {
      window.location.replace("/login?oauth=failed");
      return;
    }
    const { error } = await supabase.auth.setSession({ access_token, refresh_token });
    if (error) {
      window.location.replace("/login?oauth=failed");
      return;
    }
    onSignedIn?.();
    window.location.replace("/app");
  };

  await App.addListener("appUrlOpen", (event: { url: string }) => {
    void handleUrl(event.url);
  });

  try {
    const launch = await App.getLaunchUrl();
    if (launch?.url) void handleUrl(launch.url);
  } catch {
    /* ignore */
  }
}
