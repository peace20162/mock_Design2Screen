import { useAppStore } from "../store/appStore";
import { translate, type Lang, type TranslationKey } from "../i18n/translations";

export function useLang(): Lang {
  return useAppStore((s) => s.lang);
}

export function useT() {
  const lang = useAppStore((s) => s.lang);
  return (key: TranslationKey, vars?: Record<string, string>) => translate(lang, key, vars);
}