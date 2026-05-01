import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import "@/i18n";
import i18n, { isRTL } from "@/i18n";

export function I18nProvider({ children }: { children: ReactNode }) {
  const { i18n: i18nInstance } = useTranslation();
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // After hydration, switch to user's preferred language
    const stored = typeof window !== "undefined" ? localStorage.getItem("i18nextLng") : null;
    const target = stored && ["ar", "fr", "en"].includes(stored) ? stored : "ar";
    if (i18n.language !== target) {
      i18n.changeLanguage(target);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const lng = i18nInstance.language || "ar";
    document.documentElement.lang = lng;
    document.documentElement.dir = isRTL(lng) ? "rtl" : "ltr";
  }, [i18nInstance.language, hydrated]);

  return <>{children}</>;
}
