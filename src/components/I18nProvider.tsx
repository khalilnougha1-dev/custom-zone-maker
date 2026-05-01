import { useEffect, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import "@/i18n";
import { isRTL } from "@/i18n";

export function I18nProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();

  useEffect(() => {
    const lng = i18n.language || "ar";
    document.documentElement.lang = lng;
    document.documentElement.dir = isRTL(lng) ? "rtl" : "ltr";
  }, [i18n.language]);

  return <>{children}</>;
}
