"use client";
import { Bars, type Bar } from "@/components/charts/bars";
import { fmtMoney } from "@/lib/format";
import { useI18n } from "@/lib/i18n/client";

export function ChartClient({ kind, bars, currency }: { kind: "money" | "count"; bars: Bar[]; currency: string }) {
  const { locale } = useI18n();
  return <Bars bars={bars} height={200} format={(v) => (kind === "money" ? fmtMoney(v, currency, locale, { sign: true, decimals: 0 }) : String(v))} />;
}
