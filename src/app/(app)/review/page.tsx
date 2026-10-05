import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/app/page-header";
import { ReviewForm } from "@/components/app/review-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, Label } from "@/components/ui/card";
import { Money, RValue } from "@/components/ui/money";
import { checkTrades, computeStats, costByRule, dayKey, type CheckedTrade } from "@/lib/calc";
import { getScope } from "@/lib/data";
import { fmtDate, fmtMoney, fmtPct } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("review.title") };
}

const addDays = (ymd: string, d: number) => new Date(new Date(`${ymd}T12:00:00Z`).getTime() + d * 86400_000).toISOString().slice(0, 10);

export default async function ReviewPage(props: PageProps<"/review">) {
  const sp = await props.searchParams;
  const { t, locale } = await getI18n();
  const { ws, accounts, trades, currency, tz } = await getScope();

  const today = dayKey(new Date().toISOString(), tz);
  const dow = (new Date(`${today}T12:00:00Z`).getUTCDay() + 6) % 7;
  const thisMonday = addDays(today, -dow);
  const checked = checkTrades(trades, ws.rules, accounts);
  // Default: this week, or last week when nothing has been closed yet this week (e.g. on Monday).
  const closedThisWeek = checked.some((c) => c.trade.status === "closed" && dayKey(c.trade.closed_at ?? c.trade.opened_at, tz) >= thisMonday);
  const w = typeof sp.w === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.w) ? sp.w : closedThisWeek ? thisMonday : addDays(thisMonday, -7);
  const weekEnd = addDays(w, 6);

  const week = checked.filter((c) => {
    if (c.trade.status !== "closed") return false;
    const k = dayKey(c.trade.closed_at ?? c.trade.opened_at, tz);
    return k >= w && k <= weekEnd;
  });
  const s = computeStats(week);
  const best = week.reduce<CheckedTrade | null>((b, c) => (!b || c.pnl > b.pnl ? c : b), null);
  const worst = week.reduce<CheckedTrade | null>((b, c) => (!b || c.pnl < b.pnl ? c : b), null);
  const broken = costByRule(week);
  const emotions = new Map<string, number>();
  week.forEach((c) => c.trade.emotion_before && emotions.set(c.trade.emotion_before, (emotions.get(c.trade.emotion_before) ?? 0) + 1));
  const review = ws.reviews.find((r) => r.week_start === w) ?? null;

  return (
    <>
      <PageHeader
        title={t("review.title")}
        intro={t("review.intro")}
        actions={
          <div className="flex items-center gap-1 rounded-md border border-line-strong bg-surface p-0.5">
            <Link href={`/review?w=${addDays(w, -7)}`} className="grid size-8 place-items-center rounded-[5px] text-muted hover:bg-surface-2 hover:text-ink" aria-label={t("review.prev")}>
              <ChevronLeft className="size-4" />
            </Link>
            <span className="min-w-44 px-2 text-center text-[13px] font-medium text-ink">
              {t("review.week", { date: fmtDate(`${w}T12:00:00Z`, locale, { day: "numeric", month: "long" }, "UTC") })}
            </span>
            <Link
              href={`/review?w=${addDays(w, 7)}`}
              aria-disabled={w >= thisMonday}
              className={`grid size-8 place-items-center rounded-[5px] text-muted hover:bg-surface-2 hover:text-ink ${w >= thisMonday ? "pointer-events-none opacity-30" : ""}`}
              aria-label={t("review.next")}
            >
              <ChevronRight className="size-4" />
            </Link>
          </div>
        }
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-5">
          <Card>
            <CardHeader title={t("review.summary")} />
            {week.length === 0 ? (
              <p className="px-5 pb-5 text-[13px] text-muted">{t("review.noTrades")}</p>
            ) : (
              <>
                <div className="grid grid-cols-2 border-t border-line">
                  <Cell label={t("dashboard.netResult")}>
                    <Money value={s.netPnl} currency={currency} />
                  </Cell>
                  <Cell label={t("dashboard.expectancy")}>
                    <RValue value={s.expectancyR} />
                  </Cell>
                  <Cell label={t("dashboard.winRate")}>{fmtPct(s.winRate, locale)}</Cell>
                  <Cell label={t("dashboard.discipline")}>
                    {s.disciplineScore ?? "—"}
                    <span className="font-sans text-[12px] text-muted">/100</span>
                  </Cell>
                </div>
                <div className="divide-y divide-line border-t border-line text-[13px]">
                  {best && (
                    <Link href={`/journal/${best.trade.id}`} className="flex items-center justify-between px-5 py-2.5 hover:bg-mauve-soft">
                      <span className="text-ink-2">
                        {t("review.best")} · <span className="font-medium text-ink">{best.trade.symbol}</span>
                      </span>
                      <Money value={best.pnl} currency={currency} className="font-medium" />
                    </Link>
                  )}
                  {worst && worst !== best && (
                    <Link href={`/journal/${worst.trade.id}`} className="flex items-center justify-between px-5 py-2.5 hover:bg-mauve-soft">
                      <span className="text-ink-2">
                        {t("review.worst")} · <span className="font-medium text-ink">{worst.trade.symbol}</span>
                      </span>
                      <Money value={worst.pnl} currency={currency} className="font-medium" />
                    </Link>
                  )}
                </div>
              </>
            )}
          </Card>
          <Card>
            <CardHeader title={t("review.broken")} />
            <div className="px-5 pb-5">
              {broken.length === 0 ? (
                <p className="text-[13px] text-muted">{t("review.brokenNone")}</p>
              ) : (
                <ul className="space-y-2 text-[13px]">
                  {broken.map((b) => (
                    <li key={b.kind} className="flex items-center justify-between gap-3">
                      <span className="text-ink">
                        {t(`rules.kinds.${b.kind}.title`)} <span className="text-muted">· {b.count}×</span>
                      </span>
                      <span className="num font-medium text-loss">{fmtMoney(-b.cost, currency, locale, { decimals: 0 })}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Card>
          <Card>
            <CardHeader title={t("review.emotions")} />
            <div className="flex flex-wrap gap-1.5 px-5 pb-5">
              {emotions.size === 0 ? (
                <span className="text-[13px] text-muted">—</span>
              ) : (
                [...emotions.entries()]
                  .sort((a, b) => b[1] - a[1])
                  .map(([e, n]) => (
                    <Badge key={e} tone="mauve">
                      {t(`emotions.${e as "calm"}`)} <span className="num opacity-70">{n}</span>
                    </Badge>
                  ))
              )}
            </div>
          </Card>
        </div>
        <Card className="lg:col-span-7">
          <CardHeader title={t("review.questions")} />
          <div className="px-5 pb-6">
            <ReviewForm key={w} weekStart={w} review={review} />
          </div>
        </Card>
      </div>
    </>
  );
}

function Cell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-line px-5 py-3.5 odd:border-r [&:nth-child(n+3)]:border-b-0">
      <Label>{label}</Label>
      <div className="num mt-1 font-display text-[1.5rem] leading-none text-ink">{children}</div>
    </div>
  );
}
