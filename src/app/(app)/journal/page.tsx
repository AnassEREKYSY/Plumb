import Link from "next/link";
import { Suspense } from "react";
import { JournalFilters } from "@/components/app/journal-filters";
import { MonthCalendar } from "@/components/app/month-calendar";
import { PageHeader } from "@/components/app/page-header";
import { PeriodTabs } from "@/components/app/period-tabs";
import { TradesTable } from "@/components/app/trades-table";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Money } from "@/components/ui/money";
import { checkTrades, computeStats, dailyPnl, dayKey, localHour } from "@/lib/calc";
import { cn } from "@/lib/cn";
import { getScope } from "@/lib/data";
import { fmtPct } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";
import { inPeriod, parsePeriod } from "@/lib/period";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("journal.title") };
}

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export default async function JournalPage(props: PageProps<"/journal">) {
  const sp = await props.searchParams;
  const { t, locale } = await getI18n();
  const { ws, accounts, trades, currency, tz } = await getScope();
  const period = parsePeriod(sp.p, "all");
  const view = one(sp.view) === "calendar" ? "calendar" : "list";
  const q = one(sp.q).toUpperCase();
  const result = one(sp.result);
  const rules = one(sp.rules);
  const setup = one(sp.setup);
  const emotion = one(sp.emotion);
  const after = one(sp.after);
  const limit = Math.min(1000, Math.max(50, Number(one(sp.limit)) || 50));

  const checked = checkTrades(trades, ws.rules, accounts);
  const rows = checked
    .filter((c) => inPeriod(c.trade, period))
    .filter((c) => !q || c.trade.symbol.includes(q))
    .filter((c) => !result || (result === "winners" ? c.pnl > 0 : c.pnl < 0))
    .filter((c) => !rules || (rules === "ok" ? c.violations.length === 0 : c.violations.length > 0))
    .filter((c) => !setup || c.trade.setup_id === setup)
    .filter((c) => !emotion || c.trade.emotion_before === emotion)
    .filter((c) => !after || localHour(c.trade.opened_at, tz) >= Number(after))
    .reverse();

  const closedRows = rows.filter((c) => c.trade.status === "closed");
  const s = computeStats(closedRows);
  const pending = ws.trades.filter((tr) => tr.status === "planned" && accounts.some((a) => a.id === tr.account_id));
  const today = dayKey(new Date().toISOString(), tz);
  const month = /^\d{4}-\d{2}$/.test(one(sp.month)) ? one(sp.month) : today.slice(0, 7);
  const query: Record<string, string> = Object.fromEntries(Object.entries(sp).map(([k, v]) => [k, one(v)]).filter(([, v]) => v));

  return (
    <>
      <PageHeader
        title={t("journal.title")}
        intro={t("journal.intro")}
        actions={
          <>
            <nav className="inline-flex rounded-md border border-line-strong bg-surface-2 p-0.5">
              {(["list", "calendar"] as const).map((v) => (
                <Link
                  key={v}
                  href={{ query: { ...query, view: v } }}
                  scroll={false}
                  className={cn(
                    "grid h-7 place-items-center rounded-[5px] px-3 text-[12.5px] font-medium",
                    view === v ? "bg-surface text-ink shadow-[0_1px_2px_rgba(0,0,0,0.08)] ring-1 ring-line" : "text-muted hover:text-ink",
                  )}
                >
                  {t(`journal.${v}`)}
                </Link>
              ))}
            </nav>
            {view === "list" && <PeriodTabs value={period} t={t} base="/journal" extra={Object.fromEntries(Object.entries(query).filter(([k]) => k !== "p"))} />}
          </>
        }
      />

      {pending.length > 0 && view === "list" && (
        <Card className="mb-4 overflow-hidden">
          <div className="border-b border-line px-5 py-2.5 text-[12.5px] font-medium text-muted">{t("status.planned")}</div>
          <TradesTable rows={pending.map((trade) => ({ trade, pnl: 0, r: null, riskPct: null, violations: [], checksRun: 0, balanceBefore: 0 }))} setups={ws.setups} currency={currency} t={t} locale={locale} tz={tz} dense />
        </Card>
      )}

      {view === "calendar" ? (
        <Card className="overflow-hidden">
          <MonthCalendar month={month} days={dailyPnl(checked, tz)} currency={currency} t={t} locale={locale} today={today} query={query} />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="flex flex-col gap-3 px-5 py-3.5 lg:flex-row lg:items-center lg:justify-between">
            <Suspense>
              <JournalFilters setups={ws.setups} />
            </Suspense>
            <div className="flex items-center gap-4 text-[12.5px] text-muted">
              <span>{t("journal.count", { n: rows.length })}</span>
              <span>{fmtPct(s.winRate, locale)}</span>
              <Money value={s.netPnl} currency={currency} className="font-semibold" />
            </div>
          </div>
          {rows.length === 0 ? (
            <div className="border-t border-line px-5 py-14 text-center">
              <p className="mb-4 text-sm text-muted">{t("journal.empty")}</p>
              <ButtonLink href="/plan" variant="secondary">
                {t("nav.newPlan")}
              </ButtonLink>
            </div>
          ) : (
            <>
              <TradesTable rows={rows.slice(0, limit)} setups={ws.setups} currency={currency} t={t} locale={locale} tz={tz} />
              {rows.length > limit && (
                <div className="border-t border-line px-5 py-3 text-center">
                  <Link href={{ query: { ...query, limit: String(limit + 50) } }} scroll={false} className="text-[13px] font-medium text-plum hover:underline">
                    {t("journal.showMore", { n: rows.length - limit })}
                  </Link>
                </div>
              )}
            </>
          )}
        </Card>
      )}
    </>
  );
}
