import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { ar } from "./locales/ar";
import { fr } from "./locales/fr";
import { en } from "./locales/en";

if (!i18n.isInitialized) {
  i18n
    .use(initReactI18next)
    .init({
      resources: {
        ar: { translation: ar },
        fr: { translation: fr },
        en: { translation: en },
      },
      lng: "ar",
      fallbackLng: "ar",
      supportedLngs: ["ar", "fr", "en"],
      interpolation: { escapeValue: false },
    });
}

export const isRTL = (lng: string) => lng === "ar";

export default i18n;
