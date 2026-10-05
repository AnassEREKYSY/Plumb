import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { breakdown, checkTrades, computeStats, costByRule, equitySeries } from "@/lib/calc";
import { getScope } from "@/lib/data";
import { fmtDate } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";
import { buildInsights, insightText } from "@/lib/insights";
import { JournalPdf } from "@/lib/pdf/journal-pdf";
import { inPeriod, parsePeriod } from "@/lib/period";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET /api/export/pdf?p=30&trades=1&notes=1&reviews=1 — the journal of the selected account as a PDF. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const period = parsePeriod(url.searchParams.get("p") ?? undefined, "all");
  const flag = (k: string) => url.searchParams.get(k) !== "0";

  const { t, locale } = await getI18n();
  const { ws, account, accounts, trades, startBalance, currency, tz } = await getScope();

  const all = checkTrades(trades, ws.rules, accounts);
  const checked = all.filter((c) => inPeriod(c.trade, period));
  const before = all.filter((c) => c.trade.status === "closed" && !inPeriod(c.trade, period)).reduce((s, c) => s + c.pnl, 0);
  const start = startBalance + before;
  const stats = computeStats(checked, start);

  const setupName = new Map(ws.setups.map((s) => [s.id, s.name]));
  const rows = (items: ReturnType<typeof breakdown>, label: (k: string) => string) =>
    items.sort((a, b) => b.count - a.count).map((b) => ({ label: label(String(b.key)), count: b.count, winRate: b.winRate, net: b.net, expectancyR: b.expectancyR }));

  // Reviews whose week overlaps the period.
  const cutoff = period === "all" ? -Infinity : Date.now() - Number(period) * 86400_000;
  const reviews = ws.reviews
    .filter((r) => new Date(`${r.week_start}T12:00:00Z`).getTime() + 7 * 86400_000 >= cutoff)
    .sort((a, b) => a.week_start.localeCompare(b.week_start));

  const now = new Date().toISOString();
  const element = createElement(JournalPdf, {
    t,
    locale,
    tz,
    currency,
    accountLabel: account ? account.name : t("common.allAccounts"),
    periodLabel: period === "all" ? t("pdf.periodAll") : t("pdf.periodDays", { n: period }),
    generatedAt: fmtDate(now, locale, { day: "numeric", month: "long", year: "numeric" }, tz),
    stats,
    equity: equitySeries(checked, start).map((p) => ({ equity: p.equity, clean: p.clean })),
    startBalance: start,
    costs: costByRule(checked),
    bySetup: rows(breakdown(checked, (c) => c.trade.setup_id ?? "none"), (k) => (k === "none" ? t("analytics.noSetup") : (setupName.get(k) ?? k))),
    byEmotion: rows(breakdown(checked, (c) => c.trade.emotion_before), (k) => t(`emotions.${k as "calm"}`)),
    insights: buildInsights(checked, ws.setups, tz).map((i) => insightText(i, t, locale)),
    trades: checked,
    setups: ws.setups,
    reviews,
    include: { trades: flag("trades"), notes: flag("notes"), reviews: flag("reviews") },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const buffer = await renderToBuffer(element as any);
  const slug = (account?.name ?? "journal").toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="plumb-${slug}-${now.slice(0, 10)}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
