import type { Account, Rule, RuleKind, Trade } from "./types";

/* ------------------------------------------------------------------ */
/*  Per-trade arithmetic                                               */
/* ------------------------------------------------------------------ */

const sign = (t: Pick<Trade, "direction">) => (t.direction === "long" ? 1 : -1);
/** Short, readable price for violation details. */
const px = (v: number | null) => (v == null ? "—" : String(Number(v.toPrecision(6))));

/** Amount at risk with the ORIGINAL stop (what R is measured against). */
export function riskAmount(t: Trade): number | null {
  const entry = t.entry_price ?? t.planned_entry;
  const size = t.size ?? t.planned_size;
  if (entry == null || t.initial_stop == null || size == null) return null;
  const r = Math.abs(entry - t.initial_stop) * size * t.point_value;
  return r > 0 ? r : null;
}

export function plannedRiskAmount(t: Trade): number | null {
  if (t.planned_entry == null || t.initial_stop == null || t.planned_size == null) return null;
  const r = Math.abs(t.planned_entry - t.initial_stop) * t.planned_size * t.point_value;
  return r > 0 ? r : null;
}

/** Planned reward / risk ratio. */
export function plannedRR(t: Pick<Trade, "planned_entry" | "initial_stop" | "target" | "direction">): number | null {
  const { planned_entry: e, initial_stop: s, target: tp } = t;
  if (e == null || s == null || tp == null) return null;
  const risk = Math.abs(e - s);
  const reward = (tp - e) * (t.direction === "long" ? 1 : -1);
  if (risk === 0) return null;
  return reward / risk;
}

export function grossPnl(t: Trade): number | null {
  if (t.entry_price == null || t.exit_price == null || t.size == null) return null;
  return (t.exit_price - t.entry_price) * sign(t) * t.size * t.point_value;
}

/** Net result after fees. A manually entered result wins over the computed one. */
export function netPnl(t: Trade): number {
  if (t.status !== "closed") return 0;
  if (t.pnl_override != null) return t.pnl_override;
  const g = grossPnl(t);
  return g == null ? 0 : g - (t.fees ?? 0);
}

export function rMultiple(t: Trade): number | null {
  if (t.status !== "closed") return null;
  const risk = riskAmount(t);
  if (!risk) return null;
  return netPnl(t) / risk;
}

/** Did the trader move the stop further away than planned? */
export function stopWidened(t: Trade): boolean {
  if (t.initial_stop == null || t.final_stop == null) return false;
  return t.direction === "long" ? t.final_stop < t.initial_stop - 1e-12 : t.final_stop > t.initial_stop + 1e-12;
}

export function positionSize(opts: {
  balance: number;
  riskPct: number;
  entry: number;
  stop: number;
  pointValue: number;
}): number | null {
  const dist = Math.abs(opts.entry - opts.stop);
  if (!dist || !opts.pointValue || !opts.balance) return null;
  return (opts.balance * (opts.riskPct / 100)) / (dist * opts.pointValue);
}

/* ------------------------------------------------------------------ */
/*  Time helpers (account time zone)                                   */
/* ------------------------------------------------------------------ */

const dtfCache = new Map<string, Intl.DateTimeFormat>();
function parts(iso: string, tz: string) {
  let f = dtfCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      weekday: "short",
      hourCycle: "h23",
    });
    dtfCache.set(tz, f);
  }
  const out: Record<string, string> = {};
  for (const p of f.formatToParts(new Date(iso))) out[p.type] = p.value;
  return out;
}

export function dayKey(iso: string, tz: string): string {
  const p = parts(iso, tz);
  return `${p.year}-${p.month}-${p.day}`;
}
export function localHour(iso: string, tz: string): number {
  return Number(parts(iso, tz).hour);
}
export function localMinutes(iso: string, tz: string): number {
  const p = parts(iso, tz);
  return Number(p.hour) * 60 + Number(p.minute);
}
export function weekday(iso: string, tz: string): number {
  const map: Record<string, number> = { Mon: 0, Tue: 1, Wed: 2, Thu: 3, Fri: 4, Sat: 5, Sun: 6 };
  return map[parts(iso, tz).weekday] ?? 0;
}
const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + (m || 0);
};

/* ------------------------------------------------------------------ */
/*  Rules engine — checks trades against the trader's OWN rules        */
/* ------------------------------------------------------------------ */

export interface Violation {
  ruleId: string;
  kind: RuleKind;
  tradeId: string;
  /** Short factual detail, e.g. "2.4% vs 1%" */
  detail: string;
}

export interface CheckedTrade {
  trade: Trade;
  pnl: number;
  r: number | null;
  riskPct: number | null;
  violations: Violation[];
  checksRun: number;
  balanceBefore: number;
}

/**
 * Evaluate every closed / open trade against the active rules.
 * Trades are processed chronologically so daily counters and the running balance are correct.
 */
export function checkTrades(trades: Trade[], rules: Rule[], accounts: Account[]): CheckedTrade[] {
  const accById = new Map(accounts.map((a) => [a.id, a]));
  const sorted = [...trades]
    .filter((t) => t.status === "closed" || t.status === "open")
    .sort((a, b) => a.opened_at.localeCompare(b.opened_at));

  const balance = new Map<string, number>(accounts.map((a) => [a.id, a.starting_balance]));
  const perDay = new Map<string, { count: number; losses: number }>();
  const out: CheckedTrade[] = [];

  for (const t of sorted) {
    const acc = accById.get(t.account_id);
    const tz = acc?.timezone ?? "Europe/Paris";
    const bal = balance.get(t.account_id) ?? acc?.starting_balance ?? 0;
    const risk = riskAmount(t);
    const riskPct = risk && bal > 0 ? (risk / bal) * 100 : null;
    const key = `${t.account_id}|${dayKey(t.opened_at, tz)}`;
    const day = perDay.get(key) ?? { count: 0, losses: 0 };

    const violations: Violation[] = [];
    let checksRun = 0;
    const applicable = rules.filter((r) => r.active && (r.account_id == null || r.account_id === t.account_id));

    for (const rule of applicable) {
      const v = rule.params.value ?? 0;
      const add = (detail: string) => violations.push({ ruleId: rule.id, kind: rule.kind, tradeId: t.id, detail });
      switch (rule.kind) {
        case "max_risk_pct":
          if (riskPct == null) break;
          checksRun++;
          if (riskPct > v * 1.05) add(`${riskPct.toFixed(1)}% / ${v}%`);
          break;
        case "require_stop":
          checksRun++;
          if (t.initial_stop == null) add("—");
          break;
        case "min_rr": {
          const rr = plannedRR(t);
          if (rr == null) break;
          checksRun++;
          if (rr < v - 1e-9) add(`1:${rr.toFixed(1)} / 1:${v}`);
          break;
        }
        case "max_trades_per_day":
          checksRun++;
          if (day.count + 1 > v) add(`#${day.count + 1} / ${v}`);
          break;
        case "max_losses_per_day":
          checksRun++;
          if (day.losses >= v) add(`${day.losses} / ${v}`);
          break;
        case "no_stop_widening":
          if (t.final_stop == null) break;
          checksRun++;
          if (stopWidened(t)) add(`${px(t.initial_stop)} → ${px(t.final_stop)}`);
          break;
        case "trading_hours": {
          if (!rule.params.start || !rule.params.end) break;
          checksRun++;
          const m = localMinutes(t.opened_at, tz);
          const s = toMinutes(rule.params.start);
          const e = toMinutes(rule.params.end);
          const inside = s <= e ? m >= s && m <= e : m >= s || m <= e;
          if (!inside) {
            const p = parts(t.opened_at, tz);
            add(`${p.hour}:${p.minute}`);
          }
          break;
        }
      }
    }

    const pnl = netPnl(t);
    day.count += 1;
    if (t.status === "closed" && pnl < 0) day.losses += 1;
    perDay.set(key, day);
    if (t.status === "closed") balance.set(t.account_id, bal + pnl);

    out.push({ trade: t, pnl, r: rMultiple(t), riskPct, violations, checksRun, balanceBefore: bal });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/*  Statistics                                                         */
/* ------------------------------------------------------------------ */

export interface Stats {
  count: number;
  wins: number;
  losses: number;
  netPnl: number;
  grossWin: number;
  grossLoss: number;
  winRate: number | null;
  avgWin: number | null;
  avgLoss: number | null;
  profitFactor: number | null;
  expectancy: number | null;
  expectancyR: number | null;
  maxDrawdown: number;
  maxDrawdownPct: number;
  bestStreak: number;
  worstStreak: number;
  fees: number;
  disciplineScore: number | null;
  respected: number;
  checksRun: number;
  checksFailed: number;
  costOfMistakes: number;
  cleanPnl: number;
}

export function computeStats(checked: CheckedTrade[], startingBalance = 0): Stats {
  const closed = checked.filter((c) => c.trade.status === "closed");
  let wins = 0,
    losses = 0,
    grossWin = 0,
    grossLoss = 0,
    fees = 0,
    sumR = 0,
    nR = 0,
    equity = startingBalance,
    peak = startingBalance,
    maxDD = 0,
    maxDDPct = 0,
    cur = 0,
    best = 0,
    worst = 0,
    checksRun = 0,
    checksFailed = 0,
    clean = 0,
    costOfMistakes = 0,
    respected = 0;

  for (const c of closed) {
    const p = c.pnl;
    fees += c.trade.fees ?? 0;
    if (p > 0) {
      wins++;
      grossWin += p;
      cur = cur >= 0 ? cur + 1 : 1;
    } else if (p < 0) {
      losses++;
      grossLoss += -p;
      cur = cur <= 0 ? cur - 1 : -1;
    }
    best = Math.max(best, cur);
    worst = Math.min(worst, cur);
    if (c.r != null) {
      sumR += c.r;
      nR++;
    }
    equity += p;
    peak = Math.max(peak, equity);
    const dd = peak - equity;
    if (dd > maxDD) {
      maxDD = dd;
      maxDDPct = peak > 0 ? (dd / peak) * 100 : 0;
    }
    const broken = new Set(c.violations.map((v) => v.ruleId)).size;
    checksRun += c.checksRun;
    checksFailed += Math.min(broken, c.checksRun);
    if (c.violations.length === 0) {
      clean += p;
      respected++;
    } else if (p < 0) costOfMistakes += -p;
  }

  const n = closed.length;
  return {
    count: n,
    wins,
    losses,
    netPnl: grossWin - grossLoss,
    grossWin,
    grossLoss,
    winRate: n ? wins / n : null,
    avgWin: wins ? grossWin / wins : null,
    avgLoss: losses ? grossLoss / losses : null,
    profitFactor: grossLoss ? grossWin / grossLoss : grossWin ? Infinity : null,
    expectancy: n ? (grossWin - grossLoss) / n : null,
    expectancyR: nR ? sumR / nR : null,
    maxDrawdown: maxDD,
    maxDrawdownPct: maxDDPct,
    bestStreak: best,
    worstStreak: -worst,
    fees,
    // Share of trades that respected every active rule. Independent of profit.
    disciplineScore: n ? Math.round((respected / n) * 100) : null,
    respected,
    checksRun,
    checksFailed,
    costOfMistakes,
    cleanPnl: clean,
  };
}

/** Equity curves: actual vs. only rule-respecting trades. */
export function equitySeries(checked: CheckedTrade[], start: number) {
  let eq = start,
    clean = start;
  const pts: { t: string; equity: number; clean: number; tradeId: string }[] = [];
  for (const c of checked) {
    if (c.trade.status !== "closed") continue;
    eq += c.pnl;
    if (c.violations.length === 0) clean += c.pnl;
    pts.push({ t: c.trade.closed_at ?? c.trade.opened_at, equity: eq, clean, tradeId: c.trade.id });
  }
  return pts;
}

/** Cost (money lost) per broken rule kind. */
export function costByRule(checked: CheckedTrade[]) {
  const map = new Map<RuleKind, { kind: RuleKind; count: number; cost: number }>();
  for (const c of checked) {
    if (c.trade.status !== "closed") continue;
    const kinds = new Set(c.violations.map((v) => v.kind));
    for (const k of kinds) {
      const row = map.get(k) ?? { kind: k, count: 0, cost: 0 };
      row.count++;
      if (c.pnl < 0) row.cost += -c.pnl;
      map.set(k, row);
    }
  }
  return [...map.values()].sort((a, b) => b.cost - a.cost);
}

/** Group closed trades by a key and compute compact stats per bucket. */
export function breakdown<K extends string | number>(checked: CheckedTrade[], keyOf: (c: CheckedTrade) => K | null) {
  const map = new Map<K, CheckedTrade[]>();
  for (const c of checked) {
    if (c.trade.status !== "closed") continue;
    const k = keyOf(c);
    if (k == null) continue;
    const arr = map.get(k) ?? [];
    arr.push(c);
    map.set(k, arr);
  }
  return [...map.entries()].map(([key, items]) => {
    const s = computeStats(items);
    return { key, count: s.count, winRate: s.winRate, net: s.netPnl, expectancy: s.expectancy, expectancyR: s.expectancyR };
  });
}

/** Sample-size honesty: how much should the trader trust a number based on n trades? */
export function confidence(n: number): { level: "none" | "low" | "medium" | "good"; missing: number } {
  if (n < 10) return { level: "none", missing: 30 - n };
  if (n < 30) return { level: "low", missing: 30 - n };
  if (n < 100) return { level: "medium", missing: 0 };
  return { level: "good", missing: 0 };
}

export function dailyPnl(checked: CheckedTrade[], tz: string) {
  const map = new Map<string, { pnl: number; count: number; broken: number }>();
  for (const c of checked) {
    if (c.trade.status !== "closed") continue;
    const k = dayKey(c.trade.closed_at ?? c.trade.opened_at, tz);
    const row = map.get(k) ?? { pnl: 0, count: 0, broken: 0 };
    row.pnl += c.pnl;
    row.count++;
    if (c.violations.length) row.broken++;
    map.set(k, row);
  }
  return map;
}
