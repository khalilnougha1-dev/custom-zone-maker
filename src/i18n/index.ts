import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { ar } from "./locales/ar";
import { fr } from "./locales/fr";
import { en } from "./locales/en";

if (!i18n.isInitialized) {
  i18n
    .use(LanguageDetector)
    .use(initReactI18next)
    .init({
      resources: {
        ar: { translation: ar },
        fr: { translation: fr },
        en: { translation: en },
      },
      fallbackLng: "ar",
      supportedLngs: ["ar", "fr", "en"],
      interpolation: { escapeValue: false },
      detection: {
        order: ["localStorage", "navigator"],
        caches: ["localStorage"],
      },
    });
}

export const isRTL = (lng: string) => lng === "ar";

export default i18n;
