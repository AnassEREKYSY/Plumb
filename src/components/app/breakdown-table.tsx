import { Money, RValue } from "@/components/ui/money";
import { confidence } from "@/lib/calc";
import { cn } from "@/lib/cn";
import { fmtPct } from "@/lib/format";
import type { Locale } from "@/lib/i18n/config";
import type { TFn } from "@/lib/i18n/translate";

export interface BreakdownRow {
  label: React.ReactNode;
  count: number;
  winRate: number | null;
  net: number;
  expectancyR: number | null;
}

export function BreakdownTable({ rows, currency, t, locale }: { rows: BreakdownRow[]; currency: string; t: TFn; locale: Locale }) {
  const maxAbs = Math.max(1, ...rows.map((r) => Math.abs(r.net)));
  return (
    <table className="w-full text-[13px]">
      <thead>
        <tr className="border-y border-line bg-surface-2/60 text-left text-[11.5px] text-muted">
          <th className="py-2 pl-5 font-medium">{t("analytics.bucket")}</th>
          <th className="px-2 text-right font-medium">{t("analytics.trades")}</th>
          <th className="px-2 text-right font-medium">{t("analytics.winRateShort")}</th>
          <th className="w-[30%] px-2 font-medium">{t("analytics.net")}</th>
          <th className="pr-5 pl-2 text-right font-medium">{t("analytics.expR")}</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-line">
        {rows.map((r, i) => {
          const c = confidence(r.count);
          return (
            <tr key={i}>
              <td className="max-w-[180px] truncate py-2.5 pl-5 text-ink">{r.label}</td>
              <td className="num px-2 text-right text-ink-2">
                <span title={t(`confidence.short_${c.level}`)} className="inline-flex items-center gap-1.5">
                  <span className={cn("size-1.5 rounded-full", c.level === "none" ? "bg-ochre" : c.level === "low" ? "bg-ochre/50" : "bg-gain/70")} />
                  {r.count}
                </span>
              </td>
              <td className="num px-2 text-right text-ink-2">{fmtPct(r.winRate, locale)}</td>
              <td className="px-2">
                <div className="flex items-center gap-2">
                  <div className="relative h-1.5 flex-1">
                    <div className="absolute inset-y-0 left-1/2 w-px bg-line-strong" />
                    <div
                      className={cn("absolute inset-y-0 rounded-full", r.net >= 0 ? "left-1/2 bg-gain" : "right-1/2 bg-loss/80")}
                      style={{ width: `${(Math.abs(r.net) / maxAbs) * 50}%` }}
                    />
                  </div>
                  <Money value={r.net} currency={currency} compact className="w-[72px] text-right text-[12px]" />
                </div>
              </td>
              <td className="pr-5 pl-2 text-right">
                <RValue value={r.expectancyR} className="text-[12.5px]" />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
