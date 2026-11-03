import "server-only";
import { tool } from "ai";
import { z } from "zod";
import { breakdown, checkTrades, computeStats, costByRule, dayKey, localHour, weekday, type CheckedTrade } from "@/lib/calc";
import type { Account, Rule, Setup, Trade } from "@/lib/types";

/**
 * Tools the assistant can call. Every number is computed here, in code, with the same
 * functions as the rest of Plumb. The model only reads the results and puts them into words.
 */

export interface AssistantScope {
  accounts: Account[];
  trades: Trade[];
  rules: Rule[];
  setups: Setup[];
  tz: string;
  currency: string;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const round = (v: number | null | undefined, d = 2) => (v == null || !Number.isFinite(v) ? null : Math.round(v * 10 ** d) / 10 ** d);
const pct = (v: number | null | undefined) => (v == null ? null : Math.round(v * 1000) / 10);

const dateField = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .describe("Date as YYYY-MM-DD, in the trader's timezone");

const range = {
  from: dateField.optional().describe("First day included (YYYY-MM-DD). Omit for no lower bound."),
  to: dateField.optional().describe("Last day included (YYYY-MM-DD). Omit for no upper bound."),
};

export function buildAssistantTools(scope: AssistantScope) {
  const { tz, currency } = scope;
  // Rules are checked on the whole history so daily counters stay correct, then filtered by date.
  const checked = checkTrades(scope.trades, scope.rules, scope.accounts);
  const setupName = new Map(scope.setups.map((s) => [s.id, s.name]));

  const inRange = (c: CheckedTrade, from?: string, to?: string) => {
    const d = dayKey(c.trade.closed_at ?? c.trade.opened_at, tz);
    return (!from || d >= from) && (!to || d <= to);
  };
  const select = (from?: string, to?: string) => checked.filter((c) => inRange(c, from, to));

  return {
    get_stats: tool({
      description:
        "Overall results for a period: number of closed trades, win rate, net P&L, average R, profit factor, drawdown, " +
        "discipline score (share of trades that respected every rule), cost of broken rules, and which rules were broken most.",
      inputSchema: z.object(range),
      execute: async ({ from, to }) => {
        const items = select(from, to);
        const s = computeStats(items);
        return {
          period: { from: from ?? "start", to: to ?? "today" },
          currency,
          closedTrades: s.count,
          openTrades: items.filter((c) => c.trade.status === "open").length,
          wins: s.wins,
          losses: s.losses,
          winRatePct: pct(s.winRate),
          netPnl: round(s.netPnl),
          averageR: round(s.expectancyR),
          profitFactor: round(s.profitFactor),
          averageWin: round(s.avgWin),
          averageLoss: round(s.avgLoss),
          maxDrawdown: round(s.maxDrawdown),
          longestWinStreak: s.bestStreak,
          longestLossStreak: s.worstStreak,
          fees: round(s.fees),
          disciplineScorePct: s.disciplineScore,
          tradesRespectingAllRules: s.respected,
          costOfBrokenRules: round(s.costOfMistakes),
          pnlOfRuleRespectingTradesOnly: round(s.cleanPnl),
          brokenRules: costByRule(items).map((r) => ({ rule: r.kind, tradesBreakingIt: r.count, moneyLostOnThoseTrades: round(r.cost) })),
        };
      },
    }),

    get_breakdown: tool({
      description:
        "Results of closed trades grouped by one dimension: hour of day, weekday, setup, symbol, emotion before the trade, " +
        "direction, market, or whether the rules were respected. Use it to compare groups (e.g. mornings vs afternoons).",
      inputSchema: z.object({
        ...range,
        by: z.enum(["hour", "weekday", "setup", "symbol", "emotion_before", "direction", "market", "rules_respected"]),
      }),
      execute: async ({ from, to, by }) => {
        const items = select(from, to);
        const keyOf = (c: CheckedTrade): string | null => {
          const t = c.trade;
          switch (by) {
            case "hour":
              return `${String(localHour(t.opened_at, tz)).padStart(2, "0")}h`;
            case "weekday":
              return WEEKDAYS[weekday(t.opened_at, tz)];
            case "setup":
              return t.setup_id ? (setupName.get(t.setup_id) ?? "unknown setup") : "no setup";
            case "symbol":
              return t.symbol;
            case "emotion_before":
              return t.emotion_before ?? "not recorded";
            case "direction":
              return t.direction;
            case "market":
              return t.market;
            case "rules_respected":
              return c.violations.length === 0 ? "all rules respected" : "at least one rule broken";
          }
        };
        const rows = breakdown(items, keyOf)
          .map((r) => ({
            group: r.key,
            trades: r.count,
            winRatePct: pct(r.winRate),
            netPnl: round(r.net),
            averageR: round(r.expectancyR),
          }))
          .sort((a, b) => (by === "hour" || by === "weekday" ? 0 : b.trades - a.trades));
        if (by === "weekday") rows.sort((a, b) => WEEKDAYS.indexOf(a.group) - WEEKDAYS.indexOf(b.group));
        if (by === "hour") rows.sort((a, b) => a.group.localeCompare(b.group));
        return { by, currency, groups: rows };
      },
    }),

    list_trades: tool({
      description:
        "List individual trades (most recent first) with date, symbol, direction, result, R, broken rules, emotions and notes. " +
        "Use it to find examples behind a pattern or answer questions about specific trades.",
      inputSchema: z.object({
        ...range,
        symbol: z.string().max(24).optional(),
        outcome: z.enum(["any", "win", "loss"]).default("any"),
        onlyBrokenRules: z.boolean().default(false).describe("Only trades where at least one rule was broken"),
        limit: z.number().int().min(1).max(30).default(15),
      }),
      execute: async ({ from, to, symbol, outcome, onlyBrokenRules, limit }) => {
        const items = select(from, to)
          .filter((c) => !symbol || c.trade.symbol.toLowerCase() === symbol.toLowerCase())
          .filter((c) => outcome === "any" || (c.trade.status === "closed" && (outcome === "win" ? c.pnl > 0 : c.pnl < 0)))
          .filter((c) => !onlyBrokenRules || c.violations.length > 0)
          .reverse();
        return {
          currency,
          totalMatching: items.length,
          trades: items.slice(0, limit).map((c) => {
            const t = c.trade;
            return {
              date: dayKey(t.opened_at, tz),
              time: `${String(localHour(t.opened_at, tz)).padStart(2, "0")}h`,
              weekday: WEEKDAYS[weekday(t.opened_at, tz)],
              symbol: t.symbol,
              direction: t.direction,
              status: t.status,
              pnl: t.status === "closed" ? round(c.pnl) : null,
              r: round(c.r),
              riskPct: round(c.riskPct),
              setup: t.setup_id ? (setupName.get(t.setup_id) ?? null) : null,
              brokenRules: c.violations.map((v) => ({ rule: v.kind, detail: v.detail })),
              emotionBefore: t.emotion_before,
              emotionAfter: t.emotion_after,
              notes: t.notes?.slice(0, 200) ?? null,
              lesson: t.lesson?.slice(0, 200) ?? null,
            };
          }),
        };
      },
    }),

    get_rules: tool({
      description: "The trader's own active rules, with their settings.",
      inputSchema: z.object({}),
      execute: async () => ({
        rules: scope.rules
          .filter((r) => r.active)
          .map((r) => ({ rule: r.kind, settings: r.params, appliesTo: r.account_id ? "one account" : "all accounts" })),
        ruleMeaning: {
          max_risk_pct: "maximum risk per trade, in % of the balance",
          require_stop: "every trade needs a stop loss",
          min_rr: "minimum planned reward-to-risk ratio",
          max_trades_per_day: "maximum trades per day",
          max_losses_per_day: "stop trading after this many losses in a day",
          no_stop_widening: "never move the stop further away",
          trading_hours: "only open trades inside this time window",
        },
      }),
    }),
  };
}
