import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import te from "./locales/te.json";

// Load saved language or default to English
const savedLang = localStorage.getItem("servex_lang") || "en";

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    te: { translation: te },
  },
  lng: savedLang,
  fallbackLng: "en",
  interpolation: {
    escapeValue: false,
  },
});

// Persist language changes
i18n.on("languageChanged", (lng) => {
  localStorage.setItem("servex_lang", lng);
});

export default i18n;
