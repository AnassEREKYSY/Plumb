import "server-only";
import { cookies, headers } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "./config";
import { en } from "./dictionaries/en";
import { fr } from "./dictionaries/fr";
import { makeT } from "./translate";

export const dictionaries = { en, fr };

export async function getLocale(): Promise<Locale> {
  const c = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(c)) return c;
  const accept = (await headers()).get("accept-language") ?? "";
  return accept.toLowerCase().startsWith("fr") ? "fr" : DEFAULT_LOCALE;
}

export async function getI18n() {
  const locale = await getLocale();
  const dict = dictionaries[locale];
  return { locale, dict, t: makeT(dict) };
}
