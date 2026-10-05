import type { Locale } from "./i18n/config";

const tag = (l: Locale) => (l === "fr" ? "fr-FR" : "en-GB");

export function fmtMoney(v: number, currency: string, locale: Locale, opts: { sign?: boolean; compact?: boolean; decimals?: number } = {}) {
  const d = opts.decimals ?? (Math.abs(v) >= 1000 || opts.compact ? 0 : 2);
  const s = new Intl.NumberFormat(tag(locale), {
    style: "currency",
    currency,
    minimumFractionDigits: d,
    maximumFractionDigits: d,
    signDisplay: opts.sign ? "exceptZero" : "auto",
    notation: opts.compact && Math.abs(v) >= 10000 ? "compact" : "standard",
  }).format(v);
  return s.replace("-", "−");
}

export function fmtNum(v: number, locale: Locale, decimals = 2, sign = false) {
  return new Intl.NumberFormat(tag(locale), {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    signDisplay: sign ? "exceptZero" : "auto",
  })
    .format(v)
    .replace("-", "−");
}

export function fmtPrice(v: number | null | undefined, locale: Locale, decimals?: number) {
  if (v == null) return "—";
  const d = decimals ?? (Math.abs(v) < 10 ? 5 : Math.abs(v) < 1000 ? 2 : 1);
  return new Intl.NumberFormat(tag(locale), { minimumFractionDigits: d, maximumFractionDigits: d, useGrouping: true }).format(v);
}

export function fmtPct(v: number | null | undefined, locale: Locale, decimals = 0) {
  if (v == null || !isFinite(v)) return "—";
  return new Intl.NumberFormat(tag(locale), { style: "percent", minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(v);
}

export function fmtR(v: number | null | undefined, locale: Locale) {
  if (v == null || !isFinite(v)) return "—";
  return `${fmtNum(v, locale, 2, true)}R`;
}

export function fmtDate(iso: string, locale: Locale, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }, tz = "Europe/Paris") {
  const d = new Date(iso);
  // Weekday + date are composed by hand: Node and browsers disagree on the separator ("Mon, 5" vs "Mon 5"),
  // which breaks hydration.
  if (opts.weekday && (opts.day || opts.month)) {
    const { weekday, ...rest } = opts;
    const w = new Intl.DateTimeFormat(tag(locale), { weekday, timeZone: tz }).format(d);
    return `${w} ${new Intl.DateTimeFormat(tag(locale), { ...rest, timeZone: tz }).format(d)}`;
  }
  return new Intl.DateTimeFormat(tag(locale), { ...opts, timeZone: tz }).format(d);
}

export function fmtTime(iso: string, locale: Locale, tz = "Europe/Paris") {
  return new Intl.DateTimeFormat(tag(locale), { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: tz }).format(new Date(iso));
}

export const toneOf = (v: number) => (v > 0 ? "gain" : v < 0 ? "loss" : "flat");
