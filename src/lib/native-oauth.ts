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
  const origin =
    typeof window !== "undefined" && window.location.origin.startsWith("http")
      ? window.location.origin
      : WEB_ORIGIN;
  const url = `${origin}/auth/native?provider=${provider}&native=1`;
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
    const query = rawUrl.split("?")[1] ?? rawUrl.split("#")[1] ?? "";
    const params = new URLSearchParams(query);
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    try {
      const { Browser } = await import("@capacitor/browser");
      await Browser.close().catch(() => {});
    } catch {
      /* ignore */
    }
    if (!access_token || !refresh_token) return;
    const { error } = await supabase.auth.setSession({ access_token, refresh_token });
    if (!error) {
      const { enrollBiometric } = await import("@/lib/biometric-auth");
      await enrollBiometric().catch(() => false);
      onSignedIn?.();
      window.location.replace("/app");
    }
  };

  App.addListener("appUrlOpen", (event: { url: string }) => {
    void handleUrl(event.url);
  });

  try {
    const launch = await App.getLaunchUrl();
    if (launch?.url) void handleUrl(launch.url);
  } catch {
    /* ignore */
  }
}
