import { BreakdownTable, type BreakdownRow } from "@/components/app/breakdown-table";
import { PageHeader } from "@/components/app/page-header";
import { PeriodTabs } from "@/components/app/period-tabs";
import { Card, CardHeader, Label } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { breakdown, checkTrades, computeStats, confidence, localHour, weekday, type CheckedTrade } from "@/lib/calc";
import { getScope } from "@/lib/data";
import { fmtMoney, fmtNum, fmtPct, fmtR } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";
import { inPeriod, parsePeriod } from "@/lib/period";
import { ChartClient } from "./chart-client";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("analytics.title") };
}

export default async function AnalyticsPage(props: PageProps<"/analytics">) {
  const sp = await props.searchParams;
  const period = parsePeriod(sp.p, "all");
  const { t, locale } = await getI18n();
  const { ws, accounts, trades, currency, tz, startBalance } = await getScope();
  const checked = checkTrades(trades, ws.rules, accounts).filter((c) => inPeriod(c.trade, period));
  const closed = checked.filter((c) => c.trade.status === "closed");
  const s = computeStats(checked, startBalance);
  const conf = confidence(s.count);

  const toRows = (items: ReturnType<typeof breakdown>, label: (k: string) => React.ReactNode): BreakdownRow[] =>
    items.sort((a, b) => b.count - a.count).map((b) => ({ label: label(String(b.key)), count: b.count, winRate: b.winRate, net: b.net, expectancyR: b.expectancyR }));

  const setupName = new Map(ws.setups.map((x) => [x.id, x.name]));
  const bySetup = toRows(breakdown(checked, (c) => c.trade.setup_id ?? "none"), (k) => (k === "none" ? <span className="text-muted">{t("analytics.noSetup")}</span> : setupName.get(k) ?? k));
  const bySymbol = toRows(breakdown(checked, (c) => c.trade.symbol), (k) => k);
  const byDir = toRows(breakdown(checked, (c) => c.trade.direction), (k) => t(`common.${k as "long"}`));
  const byEmotion = toRows(breakdown(checked, (c) => c.trade.emotion_before), (k) => t(`emotions.${k as "calm"}`));
  const byRules = toRows(breakdown(checked, (c: CheckedTrade) => (c.violations.length ? "broken" : "ok")), (k) => (k === "ok" ? t("common.respected") : t("common.broken")));
  const wd = breakdown(checked, (c) => weekday(c.trade.opened_at, tz)).sort((a, b) => Number(a.key) - Number(b.key));
  const byWeekday = wd.map((b) => ({ label: t(`weekdays.d${b.key as 0}`), count: b.count, winRate: b.winRate, net: b.net, expectancyR: b.expectancyR }));

  const hours = breakdown(checked, (c) => localHour(c.trade.opened_at, tz));
  const hourBars = Array.from({ length: 24 }, (_, h) => {
    const b = hours.find((x) => x.key === h);
    return { label: `${h}h`, value: b?.net ?? 0, sub: b ? `${b.count} ${t("common.trades")} · ${fmtPct(b.winRate, locale)}` : undefined, muted: !b };
  }).filter((_, h) => h >= 6 && h <= 23);

  // R buckets: (-inf,-2), [-2,-1.5) … [2.5, +inf)
  const edges = [-2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2, 2.5];
  const rVals = closed.map((c) => c.r).filter((r): r is number => r != null);
  const rBars = [-Infinity, ...edges].map((lo, i, arr) => {
    const hi = arr[i + 1] ?? Infinity;
    const count = rVals.filter((r) => r >= lo && r < hi).length;
    const label = lo === -Infinity ? `<${edges[0]}` : `${lo > 0 ? "+" : ""}${lo}`;
    return { label, value: count, tone: (hi <= 0 ? "loss" : "gain") as "loss" | "gain", sub: `${count} ${t("common.trades")}` };
  });

  return (
    <>
      <PageHeader title={t("analytics.title")} intro={t("analytics.intro")} actions={<PeriodTabs value={period} t={t} base="/analytics" />} />

      <Card className="mb-4 grid grid-cols-2 gap-px overflow-hidden bg-line md:grid-cols-4">
        <Tile label={t("analytics.netPnl")}>
          <Money value={s.netPnl} currency={currency} />
        </Tile>
        <Tile label={t("analytics.winRate")} sub={`${s.wins} / ${s.losses}`}>
          {fmtPct(s.winRate, locale, 1)}
        </Tile>
        <Tile label={t("analytics.expectancy")} sub={s.expectancyR != null ? fmtR(s.expectancyR, locale) : undefined}>
          {s.expectancy != null ? <Money value={s.expectancy} currency={currency} /> : "—"}
        </Tile>
        <Tile label={t("analytics.profitFactor")}>{s.profitFactor == null ? "—" : isFinite(s.profitFactor) ? fmtNum(s.profitFactor, locale, 2) : "∞"}</Tile>
        <Tile label={t("analytics.avgWin")}>{s.avgWin != null ? <Money value={s.avgWin} currency={currency} sign={false} /> : "—"}</Tile>
        <Tile label={t("analytics.avgLoss")}>{s.avgLoss != null ? <Money value={-s.avgLoss} currency={currency} /> : "—"}</Tile>
        <Tile label={t("analytics.maxDrawdown")} sub={fmtPct(s.maxDrawdownPct / 100, locale, 1)}>
          <Money value={-s.maxDrawdown} currency={currency} />
        </Tile>
        <Tile label={t("analytics.fees")} sub={t("analytics.feesShare", { pct: fmtPct(s.grossWin ? s.fees / s.grossWin : null, locale, 1) })}>
          {fmtMoney(s.fees, currency, locale, { decimals: 0 })}
        </Tile>
      </Card>

      <p className="mb-6 flex items-center gap-2 text-[12.5px] text-muted">
        <span className={conf.level === "none" || conf.level === "low" ? "size-1.5 rounded-full bg-ochre" : "size-1.5 rounded-full bg-gain"} />
        {t(`confidence.${conf.level}`, { n: s.count, missing: conf.missing })} · {t("analytics.streaks")}: {t("analytics.streakValue", { w: s.bestStreak, l: s.worstStreak })}
      </p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title={t("analytics.byHour")} />
          <div className="px-5 pb-4">
            <ChartClient kind="money" bars={hourBars} currency={currency} />
          </div>
        </Card>
        <Card>
          <CardHeader title={t("analytics.rDistribution")} hint={t("analytics.rDistributionHint")} />
          <div className="px-5 pb-4">
            <ChartClient kind="count" bars={rBars} currency={currency} />
          </div>
        </Card>
        <Section title={t("analytics.byRules")}>
          <BreakdownTable rows={byRules} currency={currency} t={t} locale={locale} />
        </Section>
        <Section title={t("analytics.bySetup")}>
          <BreakdownTable rows={bySetup} currency={currency} t={t} locale={locale} />
        </Section>
        <Section title={t("analytics.byEmotion")}>
          <BreakdownTable rows={byEmotion} currency={currency} t={t} locale={locale} />
        </Section>
        <Section title={t("analytics.bySymbol")}>
          <BreakdownTable rows={bySymbol} currency={currency} t={t} locale={locale} />
        </Section>
        <Section title={t("analytics.byWeekday")}>
          <BreakdownTable rows={byWeekday} currency={currency} t={t} locale={locale} />
        </Section>
        <Section title={t("analytics.byDirection")}>
          <BreakdownTable rows={byDir} currency={currency} t={t} locale={locale} />
        </Section>
      </div>
    </>
  );
}

function Tile({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface px-4 py-4 sm:px-5">
      <Label>{label}</Label>
      <div className="num mt-1.5 font-display text-[1.55rem] leading-none text-ink">{children}</div>
      {sub && <div className="num mt-1.5 text-[12px] text-muted">{sub}</div>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader title={title} />
      {children}
    </Card>
  );
}

