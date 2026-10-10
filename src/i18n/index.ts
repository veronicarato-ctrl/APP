import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./en";

export const LOCALE = "en-GB";

i18n.use(initReactI18next).init({
  resources: { en: { translation: en } },
  lng: "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export const LANG_NAMES: Record<string, string> = { en: "English", fr: "French", es: "Spanish", pt: "Portuguese", zh: "Chinese" };

export default i18n;
