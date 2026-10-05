import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Money, RValue } from "@/components/ui/money";
import type { CheckedTrade } from "@/lib/calc";
import { cn } from "@/lib/cn";
import { fmtDate, fmtTime } from "@/lib/format";
import type { Locale } from "@/lib/i18n/config";
import type { TFn } from "@/lib/i18n/translate";
import type { Setup } from "@/lib/types";
import { Check } from "lucide-react";

export function TradesTable({
  rows,
  setups,
  currency,
  t,
  locale,
  tz,
  dense,
}: {
  rows: CheckedTrade[];
  setups: Setup[];
  currency: string;
  t: TFn;
  locale: Locale;
  tz: string;
  dense?: boolean;
}) {
  const setupName = new Map(setups.map((s) => [s.id, s]));
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] text-[13px] [&_td]:whitespace-nowrap">
        <thead>
          <tr className="border-y border-line bg-surface-2/60 text-left text-[11.5px] font-medium text-muted">
            <th className="py-2 pr-3 pl-5 font-medium">{t("journal.date")}</th>
            <th className="px-3 font-medium">{t("journal.symbol")}</th>
            <th className="px-3 font-medium">{t("journal.side")}</th>
            <th className="px-3 font-medium">{t("journal.setup")}</th>
            <th className="px-3 text-right font-medium">{t("journal.result")}</th>
            <th className="px-3 text-right font-medium">{t("journal.r")}</th>
            <th className="px-3 font-medium">{t("journal.rules")}</th>
            <th className="pr-5 pl-3 font-medium">{t("journal.emotion")}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => {
            const s = c.trade.setup_id ? setupName.get(c.trade.setup_id) : null;
            const broken = new Set(c.violations.map((v) => v.kind)).size;
            return (
              <tr key={c.trade.id} className="group relative border-b border-line last:border-b-0 hover:bg-mauve-soft">
                <td className={cn("pr-3 pl-5 whitespace-nowrap", dense ? "py-2" : "py-2.5")}>
                  <Link href={`/journal/${c.trade.id}`} className="absolute inset-0" aria-label={`${c.trade.symbol}`} />
                  <span className="text-ink">{fmtDate(c.trade.opened_at, locale, { day: "numeric", month: "short" }, tz)}</span>
                  <span className="num ml-2 text-muted">{fmtTime(c.trade.opened_at, locale, tz)}</span>
                </td>
                <td className="px-3 font-medium text-ink">{c.trade.symbol}</td>
                <td className="px-3">
                  <span className={cn("text-[12px] font-medium", c.trade.direction === "long" ? "text-gain" : "text-loss")}>
                    {c.trade.direction === "long" ? "▲ " : "▼ "}
                    {t(`common.${c.trade.direction}`)}
                  </span>
                </td>
                <td className="max-w-[180px] truncate px-3 text-ink-2">
                  {s ? (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="size-1.5 rounded-full" style={{ background: s.color ?? "var(--mauve)" }} />
                      {s.name}
                    </span>
                  ) : (
                    <span className="text-muted">—</span>
                  )}
                </td>
                <td className="px-3 text-right font-medium">
                  {c.trade.status === "closed" ? <Money value={c.pnl} currency={currency} /> : <Badge tone="mauve">{t(`status.${c.trade.status}`)}</Badge>}
                </td>
                <td className="px-3 text-right">
                  <RValue value={c.r} />
                </td>
                <td className="px-3">
                  {c.checksRun === 0 ? (
                    <span className="text-muted">—</span>
                  ) : broken ? (
                    <Badge tone="ochre">{t("journal.brokenCount", { n: broken })}</Badge>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[12px] text-gain">
                      <Check className="size-3.5" strokeWidth={2.2} />
                      {t("common.respected")}
                    </span>
                  )}
                </td>
                <td className="pr-5 pl-3 text-ink-2">{c.trade.emotion_before ? t(`emotions.${c.trade.emotion_before}`) : <span className="text-muted">—</span>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
