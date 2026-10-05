"use client";
import { createContext, useContext, useMemo } from "react";
import type { Locale } from "./config";
import type { Dictionary } from "./dictionaries/en";
import { makeT, type TFn } from "./translate";

const Ctx = createContext<{ locale: Locale; t: TFn; dict: Dictionary } | null>(null);

export function I18nProvider({ locale, dict, children }: { locale: Locale; dict: Dictionary; children: React.ReactNode }) {
  const value = useMemo(() => ({ locale, dict, t: makeT(dict) }), [locale, dict]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useI18n outside I18nProvider");
  return v;
}
