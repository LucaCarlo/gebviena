"use client";

import { createContext, useContext, type ReactNode } from "react";
import { getDefaultString } from "@/lib/ui-strings";

interface I18nCtx {
  lang: string;
  defaultLang: string;
  overrides: Record<string, string>;
}

const Ctx = createContext<I18nCtx>({ lang: "it", defaultLang: "it", overrides: {} });

export function I18nProvider({ lang, defaultLang, overrides, children }: I18nCtx & { children: ReactNode }) {
  return <Ctx.Provider value={{ lang, defaultLang, overrides }}>{children}</Ctx.Provider>;
}

export function useT() {
  const { overrides } = useContext(Ctx);
  return (key: string): string => overrides[key] ?? getDefaultString(key);
}

export function useLang() {
  return useContext(Ctx).lang;
}
