import { useEffect, useState } from "react";
import logoAsset from "@/assets/sahlapos-logo.png.asset.json";

/**
 * شاشة البداية: تظهر شعار SAHLAPOS عند فتح التطبيق ثم تختفي تدريجياً.
 * تعمل فقط داخل التطبيق (Capacitor) أو عند التثبيت كتطبيق (standalone).
 */
export function AppSplash() {
  const [visible, setVisible] = useState(false);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isNative = Boolean((window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.());
    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (!isNative && !isStandalone) return;

    setVisible(true);
    // إخفاء شاشة البداية الأصلية في التطبيق
    void import("@capacitor/splash-screen")
      .then((m) => m.SplashScreen.hide())
      .catch(() => {});

    const fadeTimer = window.setTimeout(() => setFading(true), 1400);
    const hideTimer = window.setTimeout(() => setVisible(false), 1900);
    return () => {
      window.clearTimeout(fadeTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-white transition-opacity duration-500 ${
        fading ? "opacity-0" : "opacity-100"
      }`}
      aria-hidden="true"
    >
      <img
        src={logoAsset.url}
        alt="SAHLAPOS"
        className="w-56 max-w-[65vw] animate-in fade-in zoom-in-95 duration-700"
      />
    </div>
  );
}
