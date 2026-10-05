import { ArrowUpRight, CircleAlert } from "lucide-react";
import Link from "next/link";
import { EquityChart } from "@/components/charts/equity-chart";
import { TickStrip } from "@/components/charts/tick-strip";
import { WeekHeatmap } from "@/components/charts/week-heatmap";
import { PageHeader } from "@/components/app/page-header";
import { PeriodTabs } from "@/components/app/period-tabs";
import { TradesTable } from "@/components/app/trades-table";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader, Label } from "@/components/ui/card";
import { Money, RValue } from "@/components/ui/money";
import {
  breakdown,
  checkTrades,
  computeStats,
  confidence,
  costByRule,
  dailyPnl,
  dayKey,
  equitySeries,
  plannedRR,
} from "@/lib/calc";
import { cn } from "@/lib/cn";
import { getScope } from "@/lib/data";
import { fmtDate, fmtMoney, fmtNum, fmtPct, fmtPrice } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";
import { buildInsights, insightText } from "@/lib/insights";
import { inPeriod, parsePeriod } from "@/lib/period";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("dashboard.title") };
}

export default async function DashboardPage(props: PageProps<"/dashboard">) {
  const sp = await props.searchParams;
  const period = parsePeriod(sp.p);
  const { t, locale } = await getI18n();
  const { ws, account, accounts, trades, startBalance, currency, tz } = await getScope();

  const allChecked = checkTrades(trades, ws.rules, accounts);
  const now = new Date();
  const today = dayKey(now.toISOString(), tz);

  // Starting point of the period = balance before its first trade
  const checked = allChecked.filter((c) => inPeriod(c.trade, period));
  const before = allChecked.filter((c) => c.trade.status === "closed" && !inPeriod(c.trade, period)).reduce((s, c) => s + c.pnl, 0);
  const periodStart = startBalance + before;

  const stats = computeStats(checked, periodStart);
  const series = equitySeries(checked, periodStart);
  const costs = costByRule(checked);
  const days = Object.fromEntries(dailyPnl(allChecked, tz));
  const closed = checked.filter((c) => c.trade.status === "closed");
  const last20 = closed.slice(-20);
  const insights = buildInsights(checked, ws.setups, tz);
  const emotions = breakdown(checked, (c) => c.trade.emotion_before)
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
  const recent = [...closed].reverse().slice(0, 8);
  const pending = ws.trades.filter((tr) => (tr.status === "planned" || tr.status === "open") && accounts.some((a) => a.id === tr.account_id));

  // Today vs. the trader's own limits
  const todayTrades = allChecked.filter((c) => dayKey(c.trade.opened_at, tz) === today);
  const todayPnl = todayTrades.reduce((s, c) => s + c.pnl, 0);
  const todayLosses = todayTrades.filter((c) => c.trade.status === "closed" && c.pnl < 0).length;
  const active = ws.rules.filter((r) => r.active);
  const maxTrades = active.find((r) => r.kind === "max_trades_per_day")?.params.value;
  const maxLosses = active.find((r) => r.kind === "max_losses_per_day")?.params.value;
  const reachedLosses = maxLosses != null && todayLosses >= maxLosses;
  const reachedTrades = maxTrades != null && todayTrades.length >= maxTrades;

  const gap = stats.cleanPnl - stats.netPnl;
  const conf = confidence(stats.count);
  const totalCost = costs.reduce((s, c) => s + c.cost, 0);
  const maxCost = Math.max(1, ...costs.map((c) => c.cost));

  return (
    <>
      <PageHeader
        eyebrow={
          <span className="inline-flex items-center gap-2">
            <span className="inline-block first-letter:uppercase">{fmtDate(now.toISOString(), locale, { weekday: "long", day: "numeric", month: "long" }, tz)}</span>
            <span className="text-line-strong">/</span>
            <span>{account ? account.name : t("common.allAccounts")}</span>
            {account && <Badge tone="outline">{t(`accountKind.${account.kind}`)}</Badge>}
          </span>
        }
        title={t("dashboard.title")}
        actions={<PeriodTabs value={period} t={t} base="/dashboard" />}
      />

      {/* Today, measured against the trader's own limits */}
      <Card className={cn("mb-4 overflow-hidden", (reachedLosses || reachedTrades) && "border-ochre/40")}>
        {(reachedLosses || reachedTrades) && (
          <div className="flex items-start gap-2.5 border-b border-ochre/30 bg-ochre-tint px-5 py-2.5 text-[13.5px] text-ink">
            <CircleAlert className="mt-0.5 size-4 shrink-0 text-ochre" strokeWidth={2} />
            <span>
              {reachedLosses
                ? t("rules.reminders.lossesReached", { max: maxLosses! })
                : t("rules.reminders.tradesReached", { max: maxTrades! })}
            </span>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-3 text-[13px]">
          <span className="font-medium text-ink">{t("dashboard.todayLine")}</span>
          <span className="flex items-center gap-2 text-ink-2">
            <Money value={todayPnl} currency={currency} className="font-medium" />
          </span>
          {maxTrades != null && (
            <Meter label={t("rules.reminders.tradesProgress", { n: todayTrades.length, max: maxTrades })} n={todayTrades.length} max={maxTrades} />
          )}
          {maxLosses != null && (
            <Meter label={t("rules.reminders.lossesProgress", { n: todayLosses, max: maxLosses })} n={todayLosses} max={maxLosses} />
          )}
          <span className="ml-auto text-muted">
            {pending.length > 0 && (
              <Link href="#pending" className="hover:text-ink">
                {pending.length} {t("dashboard.openTitle").toLowerCase()}
              </Link>
            )}
          </span>
        </div>
      </Card>

      {/* KPI ledger */}
      <Card className="mb-4 grid grid-cols-2 divide-line md:grid-cols-3 xl:grid-cols-5 xl:divide-x [&>*]:border-line max-xl:[&>*]:border-b">
        <Kpi label={t("dashboard.netResult")} sub={t("dashboard.tradesCount", { n: stats.count })}>
          <Money value={stats.netPnl} currency={currency} className="font-display" />
        </Kpi>
        <Kpi label={t("dashboard.winRate")} sub={`${stats.wins} ${t("common.won")} · ${stats.losses} ${t("common.lost")}`}>
          <span className="font-display text-ink">{fmtPct(stats.winRate, locale)}</span>
        </Kpi>
        <Kpi
          label={t("dashboard.expectancy")}
          sub={stats.expectancy != null ? `${fmtMoney(stats.expectancy, currency, locale, { sign: true })} ${t("common.perTrade")}` : "—"}
        >
          <RValue value={stats.expectancyR} className="font-display" />
        </Kpi>
        <Kpi
          label={t("dashboard.profitFactor")}
          sub={
            stats.avgWin != null && stats.avgLoss != null
              ? `${fmtMoney(stats.avgWin, currency, locale, { decimals: 0 })} / ${fmtMoney(-stats.avgLoss, currency, locale, { decimals: 0 })}`
              : "—"
          }
        >
          <span className="font-display text-ink">
            {stats.profitFactor == null ? "—" : isFinite(stats.profitFactor) ? fmtNum(stats.profitFactor, locale, 2) : "∞"}
          </span>
        </Kpi>
        <div className="col-span-2 flex flex-col gap-2 px-5 py-4 md:col-span-2 xl:col-span-1" title={t("dashboard.disciplineHint")}>
          <Label>{t("dashboard.discipline")}</Label>
          <div className="flex items-end justify-between gap-4">
            <div className="font-display num text-[28px] leading-none text-ink">
              {stats.disciplineScore ?? "—"}
              <span className="ml-0.5 text-[13px] font-normal tracking-normal text-muted">/100</span>
            </div>
            <TickStrip
              className="h-7 max-w-[150px] min-w-0 flex-1 overflow-hidden"
              items={last20.map((c) => ({ id: c.trade.id, r: c.r, pnl: c.pnl, broken: c.violations.length > 0 }))}
            />
          </div>
          <div className="text-[12px] text-muted">{t("dashboard.lastTrades", { n: last20.length })}</div>
        </div>
      </Card>

      {stats.count < 30 && stats.count > 0 && (
        <p className="mb-4 flex items-center gap-2 text-[12.5px] text-muted">
          <span className="size-1.5 rounded-full bg-ochre" />
          {t(`confidence.${conf.level}`, { n: stats.count, missing: conf.missing })}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <Card className="lg:col-span-8">
          <CardHeader
            title={t("dashboard.equityTitle")}
            hint={t("dashboard.equityHint")}
            action={
              series.length > 0 && (
                <div className="text-right">
                  <div className="text-[11.5px] text-muted">{t("dashboard.gap")}</div>
                  <Money value={gap} currency={currency} className="text-[15px] font-semibold" neutral />
                </div>
              )
            }
          />
          <div className="flex items-center gap-5 px-5 pb-2 text-[12px] text-ink-2">
            <Legend color="var(--plum)">{t("dashboard.equity")}</Legend>
            <Legend color="var(--gain)" dashed>
              {t("dashboard.clean")}
            </Legend>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-3.5 rounded-[2px] border border-mauve/40 bg-[repeating-linear-gradient(45deg,var(--mauve-soft)_0_2px,color-mix(in_oklab,var(--mauve)_35%,transparent)_2px_3px)]" />
              {t("dashboard.costTitle")}
            </span>
          </div>
          <div className="px-3 pb-3">
            <EquityChart points={series} start={periodStart} currency={currency} tz={tz} height={340} />
          </div>
        </Card>

        <Card className="flex flex-col lg:col-span-4">
          <CardHeader title={t("dashboard.costTitle")} hint={t("dashboard.costHint")} />
          <div className="px-5 pb-1">
            <Money value={-totalCost} currency={currency} className="font-display text-[30px] leading-none" />
          </div>
          <div className="flex-1 px-5 pt-4 pb-5">
            {costs.length === 0 ? (
              <p className="text-[13px] text-muted">{t("dashboard.costNone")}</p>
            ) : (
              <ul className="space-y-3.5">
                {costs.slice(0, 6).map((c) => (
                  <li key={c.kind}>
                    <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[13px]">
                      <span className="truncate text-ink">{t(`rules.kinds.${c.kind}.title`)}</span>
                      <span className="shrink-0">
                        <span className="num mr-2 text-[11.5px] text-muted">{c.count}×</span>
                        <span className="num font-medium text-loss">{fmtMoney(-c.cost, currency, locale, { decimals: 0 })}</span>
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                      <div className="h-full rounded-full bg-loss/80" style={{ width: `${(c.cost / maxCost) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="border-t border-line px-5 py-3">
            <Link href="/rules" className="inline-flex items-center gap-1 text-[12.5px] font-medium text-plum hover:underline">
              {t("nav.rules")} <ArrowUpRight className="size-3.5" />
            </Link>
          </div>
        </Card>

        <Card className="lg:col-span-7">
          <CardHeader title={t("dashboard.insightsTitle")} hint={t("dashboard.insightsHint")} />
          <div className="px-5 pb-5">
            {insights.length === 0 ? (
              <p className="text-[13px] text-muted">{t("dashboard.insights.none")}</p>
            ) : (
              <ol className="divide-y divide-line border-y border-line">
                {insights.slice(0, 4).map((ins, i) => {
                  const { text, question } = insightText(ins, t, locale);
                  return (
                    <li key={i} className="grid grid-cols-[28px_1fr] gap-x-2 py-3.5">
                      <span className="num pt-0.5 text-[12px] font-medium text-muted">{String(i + 1).padStart(2, "0")}</span>
                      <div>
                        <p className="text-[14.5px] leading-snug text-ink">{text}</p>
                        <p className="mt-1 flex flex-wrap items-center gap-x-3 text-[12.5px] text-muted">
                          <span>{question}</span>
                          <Link href={ins.href} className="inline-flex items-center gap-0.5 font-medium text-plum hover:underline">
                            {t("dashboard.insights.explore")} <ArrowUpRight className="size-3" />
                          </Link>
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </Card>

        <Card className="lg:col-span-5">
          <CardHeader title={t("dashboard.emotionTitle")} hint={t("dashboard.emotionHint")} />
          <div className="px-5 pb-4">
            {emotions.length === 0 ? (
              <p className="text-[13px] text-muted">{t("common.noData")}</p>
            ) : (
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="text-left text-[11.5px] text-muted">
                    <th className="pb-2 font-medium">{t("journal.emotion")}</th>
                    <th className="pb-2 text-right font-medium">{t("analytics.trades")}</th>
                    <th className="w-[38%] pb-2 pl-4 font-medium">{t("analytics.winRateShort")}</th>
                    <th className="pb-2 text-right font-medium">{t("analytics.expR")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line border-t border-line">
                  {emotions.map((e) => {
                    const c = confidence(e.count);
                    return (
                      <tr key={String(e.key)}>
                        <td className="py-2 text-ink">{t(`emotions.${e.key as "calm"}`)}</td>
                        <td className="num py-2 text-right text-muted">
                          {e.count}
                          {c.level === "none" && <span className="ml-1 text-ochre" title={t(`confidence.short_none`)}>·</span>}
                        </td>
                        <td className="py-2 pl-4">
                          <div className="flex items-center gap-2">
                            <div className="relative h-1.5 flex-1 rounded-full bg-surface-2">
                              <div
                                className={cn("absolute inset-y-0 left-0 rounded-full", (e.winRate ?? 0) >= 0.5 ? "bg-gain" : "bg-loss/80")}
                                style={{ width: `${(e.winRate ?? 0) * 100}%` }}
                              />
                              <div className="absolute inset-y-[-3px] left-1/2 w-px bg-line-strong" />
                            </div>
                            <span className="num w-9 text-right text-[12px] text-ink-2">{fmtPct(e.winRate, locale)}</span>
                          </div>
                        </td>
                        <td className="py-2 text-right">
                          <RValue value={e.expectancyR} className="text-[12.5px]" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </Card>

        <Card className="lg:col-span-7">
          <CardHeader title={t("dashboard.calendarTitle")} hint={t("dashboard.calendarHint")} />
          <div className="px-5 pb-5">
            <WeekHeatmap days={days} currency={currency} today={today} weeks={13} />
          </div>
        </Card>

        <Card id="pending" className="lg:col-span-5">
          <CardHeader
            title={t("dashboard.openTitle")}
            action={
              <ButtonLink href="/plan" variant="secondary" size="sm">
                {t("nav.newPlan")}
              </ButtonLink>
            }
          />
          <ul className="divide-y divide-line border-t border-line">
            {pending.length === 0 && <li className="px-5 py-4 text-[13px] text-muted">{t("common.noData")}</li>}
            {pending.slice(0, 5).map((p) => {
              const rr = plannedRR(p);
              return (
                <li key={p.id}>
                  <Link href={`/journal/${p.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-mauve-soft">
                    <Badge tone={p.status === "open" ? "gain" : "mauve"}>{t(`status.${p.status}`)}</Badge>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13.5px] font-medium text-ink">
                        {p.symbol}{" "}
                        <span className={cn("text-[12px] font-normal", p.direction === "long" ? "text-gain" : "text-loss")}>
                          {t(`common.${p.direction}`)}
                        </span>
                      </div>
                      <div className="num truncate text-[12px] text-muted">
                        {fmtPrice(p.entry_price ?? p.planned_entry, locale)} · SL {fmtPrice(p.initial_stop, locale)} · TP {fmtPrice(p.target, locale)}
                      </div>
                    </div>
                    <span className="num text-[12.5px] text-ink-2">{rr != null ? `1:${fmtNum(rr, locale, 1)}` : "—"}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card className="overflow-hidden lg:col-span-12">
          <CardHeader
            title={t("dashboard.recentTitle")}
            action={
              <Link href="/journal" className="inline-flex items-center gap-1 text-[12.5px] font-medium text-plum hover:underline">
                {t("common.seeAll")} <ArrowUpRight className="size-3.5" />
              </Link>
            }
          />
          {recent.length === 0 ? (
            <div className="border-t border-line px-5 py-10 text-center">
              <p className="mb-4 text-sm text-muted">{t("dashboard.noTrades")}</p>
              <ButtonLink href="/plan">{t("dashboard.startCta")}</ButtonLink>
            </div>
          ) : (
            <TradesTable rows={recent} setups={ws.setups} currency={currency} t={t} locale={locale} tz={tz} dense />
          )}
        </Card>
      </div>
    </>
  );
}

function Kpi({ label, sub, children }: { label: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2 px-5 py-4">
      <Label>{label}</Label>
      <div className="num text-[28px] leading-none">{children}</div>
      <div className="num truncate text-[12px] text-muted">{sub}</div>
    </div>
  );
}

function Meter({ label, n, max }: { label: string; n: number; max: number }) {
  return (
    <span className="flex items-center gap-2 text-ink-2">
      <span className="flex gap-[3px]">
        {Array.from({ length: max }).map((_, i) => (
          <span key={i} className={cn("h-3 w-1.5 rounded-[1.5px]", i < n ? (n >= max ? "bg-ochre" : "bg-plum") : "bg-surface-3")} />
        ))}
      </span>
      {label}
    </span>
  );
}

function Legend({ color, dashed, children }: { color: string; dashed?: boolean; children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <svg width="16" height="4">
        <line x1="0" x2="16" y1="2" y2="2" stroke={color} strokeWidth="2" strokeDasharray={dashed ? "4 3" : undefined} />
      </svg>
      {children}
    </span>
  );
}
