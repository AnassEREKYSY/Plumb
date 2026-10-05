import Link from "next/link";
import { PageHeader } from "@/components/app/page-header";
import { PeriodTabs } from "@/components/app/period-tabs";
import { RulesEditor } from "@/components/app/rules-editor";
import { Card, CardHeader } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { checkTrades } from "@/lib/calc";
import { getScope } from "@/lib/data";
import { fmtDate } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";
import { inPeriod, parsePeriod } from "@/lib/period";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("rules.title") };
}

export default async function RulesPage(props: PageProps<"/rules">) {
  const sp = await props.searchParams;
  const period = parsePeriod(sp.p, "30");
  const { t, locale } = await getI18n();
  const { ws, accounts, trades, currency, tz } = await getScope();
  const checked = checkTrades(trades, ws.rules, accounts).filter((c) => inPeriod(c.trade, period));

  const stats: Record<string, { count: number; cost: number }> = {};
  const history: { tradeId: string; symbol: string; at: string; kind: string; detail: string; pnl: number }[] = [];
  for (const c of checked) {
    for (const v of c.violations) {
      const s = (stats[v.ruleId] ??= { count: 0, cost: 0 });
      s.count++;
      if (c.trade.status === "closed" && c.pnl < 0) s.cost += -c.pnl;
      history.push({ tradeId: c.trade.id, symbol: c.trade.symbol, at: c.trade.opened_at, kind: v.kind, detail: v.detail, pnl: c.pnl });
    }
  }
  history.reverse();

  return (
    <>
      <PageHeader title={t("rules.title")} intro={t("rules.intro")} actions={<PeriodTabs value={period} t={t} base="/rules" />} />
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <RulesEditor rules={ws.rules} stats={stats} currency={currency} />
        <Card className="self-start">
          <CardHeader title={t("rules.history")} hint={t("rules.historyHint")} />
          {history.length === 0 ? (
            <p className="px-5 pb-5 text-[13px] text-muted">{t("rules.noViolations")}</p>
          ) : (
            <ul className="divide-y divide-line border-t border-line">
              {history.slice(0, 14).map((h, i) => (
                <li key={i}>
                  <Link href={`/journal/${h.tradeId}`} className="flex items-center gap-3 px-5 py-2.5 hover:bg-mauve-soft">
                    <span className="num w-12 shrink-0 text-[11.5px] text-muted">{fmtDate(h.at, locale, { day: "numeric", month: "short" }, tz)}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] text-ink">{t(`rules.kinds.${h.kind as "require_stop"}.title`)}</span>
                      <span className="num block text-[11.5px] text-muted">
                        {h.symbol}
                        {h.detail !== "—" ? ` · ${h.detail}` : ""}
                      </span>
                    </span>
                    <Money value={h.pnl} currency={currency} className="text-[12.5px] font-medium" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
