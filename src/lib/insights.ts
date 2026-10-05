import { breakdown, computeStats, localHour, type CheckedTrade } from "./calc";
import type { Emotion, Setup } from "./types";

/**
 * Descriptive "mirror" insights computed from the trader's own history.
 * They describe past behaviour; they never recommend a trade.
 */
export type Insight =
  | { kind: "lateLosses"; pct: number; hour: number; n: number; href: string }
  | { kind: "holdLosers"; x: number; n: number; href: string }
  | { kind: "afterLoss"; x: number; n: number; href: string }
  | { kind: "emotion"; emotion: Emotion; winRate: number; n: number; href: string }
  | { kind: "bestSetup"; setup: string; r: number; n: number; href: string };

export function buildInsights(checked: CheckedTrade[], setups: Setup[], tz: string): Insight[] {
  const closed = checked.filter((c) => c.trade.status === "closed");
  if (closed.length < 12) return [];
  const out: Insight[] = [];
  const losses = closed.filter((c) => c.pnl < 0);

  // 1. Losses late in the day
  for (const hour of [21, 22, 20]) {
    const late = losses.filter((c) => localHour(c.trade.opened_at, tz) >= hour);
    const lateAll = closed.filter((c) => localHour(c.trade.opened_at, tz) >= hour);
    const shareOfTrades = lateAll.length / closed.length;
    const shareOfLosses = late.length / Math.max(1, losses.length);
    if (late.length >= 4 && shareOfLosses > shareOfTrades * 1.5) {
      out.push({ kind: "lateLosses", pct: shareOfLosses, hour, n: late.length, href: `/journal?after=${hour}` });
      break;
    }
  }

  // 2. Holding losers longer than winners
  const dur = (c: CheckedTrade) =>
    c.trade.closed_at ? (new Date(c.trade.closed_at).getTime() - new Date(c.trade.opened_at).getTime()) / 60000 : null;
  const avg = (a: number[]) => a.reduce((s, v) => s + v, 0) / Math.max(1, a.length);
  const wDur = closed.filter((c) => c.pnl > 0).map(dur).filter((v): v is number => v != null);
  const lDur = losses.map(dur).filter((v): v is number => v != null);
  if (wDur.length >= 5 && lDur.length >= 5) {
    const x = avg(lDur) / Math.max(1, avg(wDur));
    if (x >= 1.4) out.push({ kind: "holdLosers", x, n: lDur.length + wDur.length, href: "/journal?result=losers" });
  }

  // 3. Size after a loss
  const riskPcts: number[] = [];
  const afterLoss: number[] = [];
  closed.forEach((c, i) => {
    if (c.riskPct == null) return;
    if (i > 0 && closed[i - 1].pnl < 0 && closed[i - 1].trade.account_id === c.trade.account_id) afterLoss.push(c.riskPct);
    else riskPcts.push(c.riskPct);
  });
  if (afterLoss.length >= 5 && riskPcts.length >= 5) {
    const x = avg(afterLoss) / avg(riskPcts);
    if (x >= 1.15) out.push({ kind: "afterLoss", x, n: afterLoss.length, href: "/journal?rules=broken" });
  }

  // 4. Weakest emotion (enough samples)
  const byEmotion = breakdown(closed, (c) => c.trade.emotion_before)
    .filter((b) => b.count >= 6 && b.winRate != null)
    .sort((a, b) => (a.winRate ?? 0) - (b.winRate ?? 0));
  const overall = computeStats(closed).winRate ?? 0;
  if (byEmotion[0] && (byEmotion[0].winRate ?? 1) < overall - 0.1) {
    out.push({
      kind: "emotion",
      emotion: byEmotion[0].key as Emotion,
      winRate: byEmotion[0].winRate ?? 0,
      n: byEmotion[0].count,
      href: `/journal?emotion=${byEmotion[0].key}`,
    });
  }

  // 5. Strongest setup with a meaningful sample
  const bySetup = breakdown(closed, (c) => c.trade.setup_id)
    .filter((b) => b.count >= 15 && b.expectancyR != null && b.expectancyR > 0)
    .sort((a, b) => (b.expectancyR ?? 0) - (a.expectancyR ?? 0));
  if (bySetup[0]) {
    const s = setups.find((x) => x.id === bySetup[0].key);
    if (s) out.push({ kind: "bestSetup", setup: s.name, r: bySetup[0].expectancyR ?? 0, n: bySetup[0].count, href: `/journal?setup=${s.id}` });
  }

  return out;
}
