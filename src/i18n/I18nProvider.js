"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import zhCN from "./zh-CN";

export const DEFAULT_LOCALE = "en";
export const LANGUAGE_STORAGE_KEY = "evm-console-language";
export const LANGUAGES = [
  { value: "en", label: "English", shortLabel: "EN", htmlLang: "en" },
  { value: "zh", label: "Simplified Chinese", shortLabel: "中文", htmlLang: "zh-CN" },
];

const dictionaries = { en: {}, zh: zhCN };
const I18nContext = createContext(null);

function interpolate(template, values) {
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : match
  );
}

export function I18nProvider({ children }) {
  const [locale, setLocaleState] = useState(DEFAULT_LOCALE);

  useEffect(() => {
    try {
      const storedLocale = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
      if (LANGUAGES.some((language) => language.value === storedLocale)) {
        setLocaleState(storedLocale); // eslint-disable-line react-hooks/set-state-in-effect
      }
    } catch {
      // Storage can be unavailable in privacy-restricted browser contexts.
    }
  }, []);

  useEffect(() => {
    const language = LANGUAGES.find((item) => item.value === locale);
    document.documentElement.lang = language?.htmlLang || "en";
  }, [locale]);

  const setLocale = useCallback((nextLocale) => {
    if (!LANGUAGES.some((language) => language.value === nextLocale)) return;
    setLocaleState(nextLocale);
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, nextLocale);
    } catch {
      // Keep the in-memory choice even when persistence is unavailable.
    }
  }, []);

  const t = useCallback(
    (message, values) => interpolate(dictionaries[locale]?.[message] || message, values),
    [locale]
  );

  const formatNumber = useCallback(
    (value, options) => Number(value || 0).toLocaleString(locale === "zh" ? "zh-CN" : "en-US", options),
    [locale]
  );

  const value = useMemo(
    () => ({ locale, setLocale, t, formatNumber, languages: LANGUAGES }),
    [formatNumber, locale, setLocale, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used within I18nProvider");
  return context;
}
