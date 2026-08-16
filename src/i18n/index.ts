import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { resources, languages } from "./resources";

if (!i18n.isInitialized) {
  void i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: "en",
      fallbackLng: "en",
      supportedLngs: languages.map((l) => l.code),
      interpolation: { escapeValue: false },
      react: { useSuspense: false },
    });
}

export { languages };
export default i18n;

export const STORAGE_KEY = "footcard-lang";

export function detectAndApplyLanguage() {
  if (typeof window === "undefined") return;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  const nav = window.navigator.language;
  const match =
    languages.find((l) => l.code === stored) ??
    languages.find((l) => l.code === nav) ??
    languages.find((l) => l.code === nav.split("-")[0]);
  if (match && match.code !== i18n.language) void i18n.changeLanguage(match.code);
}
