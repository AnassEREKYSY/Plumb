import type { Account, Emotion, Review, Rule, Setup, Trade, Workspace } from "./types";
import type { Locale } from "./i18n/config";
import { findInstrument, roundToStep } from "./instruments";
import { checkTrades, computeStats, costByRule, equitySeries } from "./calc";

/* Deterministic PRNG so the demo journal is stable for a given day. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const D = (iso: string) => iso;

const SETUPS: Record<Locale, { name: string; description: string; checklist: string[]; color: string }[]> = {
  en: [
    {
      name: "Trend pullback",
      description: "Price pulls back to the 20 EMA in an established H4 trend, entry on a rejection candle.",
      checklist: ["H4 trend is clear", "Pullback reached the 20 EMA", "Rejection candle closed", "No red news in the next hour"],
      color: "#2F6B4F",
    },
    {
      name: "Opening range breakout",
      description: "Break and close outside the first 30-minute range of the session, with volume.",
      checklist: ["Range defined (first 30 min)", "Close outside the range", "Volume above average"],
      color: "#8C6A87",
    },
    {
      name: "Range fade",
      description: "Fade the edge of a clear intraday range when momentum stalls.",
      checklist: ["At least two touches on each side", "Divergence or stall at the edge", "Target is the opposite side"],
      color: "#A26C1F",
    },
    {
      name: "Liquidity sweep",
      description: "Price takes the previous high/low then reclaims it. Entry on the reclaim.",
      checklist: ["Obvious previous high/low", "Sweep and reclaim within 3 candles", "Stop beyond the sweep"],
      color: "#4B3350",
    },
  ],
  fr: [
    {
      name: "Pullback de tendance",
      description: "Retour sur l'EMA 20 dans une tendance H4 établie, entrée sur une bougie de rejet.",
      checklist: ["Tendance H4 claire", "Le pullback touche l'EMA 20", "Bougie de rejet clôturée", "Pas d'annonce majeure dans l'heure"],
      color: "#2F6B4F",
    },
    {
      name: "Cassure du range d'ouverture",
      description: "Cassure et clôture hors du range des 30 premières minutes, avec du volume.",
      checklist: ["Range défini (30 premières min)", "Clôture hors du range", "Volume au-dessus de la moyenne"],
      color: "#8C6A87",
    },
    {
      name: "Retour en range",
      description: "Jouer le retour depuis le bord d'un range intraday clair quand le momentum s'essouffle.",
      checklist: ["Au moins deux contacts de chaque côté", "Divergence ou essoufflement au bord", "Objectif : l'autre côté du range"],
      color: "#A26C1F",
    },
    {
      name: "Prise de liquidité",
      description: "Le prix prend le plus haut/bas précédent puis le réintègre. Entrée sur la réintégration.",
      checklist: ["Plus haut/bas évident", "Prise et réintégration en 3 bougies", "Stop au-delà de la mèche"],
      color: "#4B3350",
    },
  ],
};

const NOTES: Record<Locale, { win: string[]; loss: string[]; revenge: string[]; late: string[]; moved: string[] }> = {
  en: {
    win: [
      "Waited for the close this time. Clean entry, let it run to target.",
      "Followed the checklist line by line. Boring, and it worked.",
      "Took partials too early in my head, but the order did the job.",
    ],
    loss: [
      "Setup was valid, market just didn't follow. Nothing to change.",
      "Entry fine, news spike took the stop. Should check the calendar earlier.",
      "Clean loss. Stop where it should be.",
    ],
    revenge: [
      "Wanted the morning loss back. Doubled the size without thinking.",
      "Entered right after the stop-out. No setup, just frustration.",
    ],
    late: ["Couldn't sleep, opened the chart. Thin market, bad fill.", "Trading after dinner again. Tired, rushed the entry."],
    moved: ["Moved the stop 'just a bit'. It cost me 60% more than planned.", "Gave it more room instead of accepting the loss."],
  },
  fr: {
    win: [
      "J'ai attendu la clôture cette fois. Entrée propre, laissé courir jusqu'à l'objectif.",
      "Checklist suivie ligne par ligne. Ennuyeux, et ça a marché.",
      "Envie de sécuriser trop tôt, mais l'ordre a fait le travail.",
    ],
    loss: [
      "Setup valide, le marché n'a pas suivi. Rien à changer.",
      "Entrée correcte, l'annonce a pris le stop. Vérifier le calendrier plus tôt.",
      "Perte propre. Stop là où il devait être.",
    ],
    revenge: [
      "Je voulais récupérer la perte du matin. Taille doublée sans réfléchir.",
      "Entré juste après le stop. Pas de setup, juste de la frustration.",
    ],
    late: ["Pas sommeil, j'ai ouvert le graphique. Marché fin, mauvaise exécution.", "Encore du trading après le dîner. Fatigué, entrée précipitée."],
    moved: ["Stop déplacé « juste un peu ». Ça m'a coûté 60 % de plus que prévu.", "Je lui ai donné plus de place au lieu d'accepter la perte."],
  },
};

const LESSONS: Record<Locale, string[]> = {
  en: ["After a stop-out, close the platform for 30 minutes.", "No entries after 21:00.", "The stop is part of the plan, not a suggestion."],
  fr: ["Après un stop, fermer la plateforme 30 minutes.", "Pas d'entrée après 21 h.", "Le stop fait partie du plan, ce n'est pas une suggestion."],
};

interface Inst {
  symbol: string;
  price: number;
  dist: [number, number];
  fee: (size: number, price: number) => number;
}
const UNIVERSE: Inst[] = [
  { symbol: "EURUSD", price: 1.1642, dist: [0.0011, 0.0028], fee: (s) => 7 * s },
  { symbol: "GBPUSD", price: 1.3418, dist: [0.0013, 0.0032], fee: (s) => 7 * s },
  { symbol: "XAUUSD", price: 3412.5, dist: [3.2, 8.5], fee: (s) => 9 * s },
  { symbol: "NAS100", price: 24380, dist: [28, 75], fee: (s) => 1.2 * s },
  { symbol: "US500", price: 6612, dist: [9, 22], fee: (s) => 0.6 * s },
  { symbol: "GER40", price: 24150, dist: [22, 55], fee: (s) => 1 * s },
  { symbol: "BTCUSD", price: 112400, dist: [550, 1400], fee: (s, p) => s * p * 0.0006 },
];

function iso(d: Date) {
  return d.toISOString();
}

/** Build a Paris-time date: day offset from today, hour and minute (local Europe/Paris, approximated by UTC+2/+1). */
function parisDate(base: Date, dayOffset: number, hour: number, minute: number) {
  const d = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate() - dayOffset, hour, minute));
  // Europe/Paris offset for that date
  const parisHour = Number(
    new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", hour: "2-digit", hourCycle: "h23" }).format(d),
  );
  const off = (parisHour - hour + 24) % 24;
  return new Date(d.getTime() - off * 3600_000);
}

export function buildDemoWorkspace(locale: Locale, now = new Date()): Workspace {
  const seedDay = Number(now.toISOString().slice(0, 10).replace(/-/g, ""));
  const rnd = mulberry32(seedDay);
  const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];
  const between = (a: number, b: number) => a + rnd() * (b - a);

  const created = iso(new Date(now.getTime() - 120 * 86400_000));
  const accounts: Account[] = [
    {
      id: "acc-demo",
      name: locale === "fr" ? "Compte démo" : "Demo account",
      kind: "demo",
      currency: "EUR",
      starting_balance: 10000,
      risk_per_trade_pct: 1,
      timezone: "Europe/Paris",
      created_at: created,
    },
    {
      id: "acc-prop",
      name: locale === "fr" ? "Challenge prop · Phase 1" : "Prop challenge · Phase 1",
      kind: "prop",
      currency: "EUR",
      starting_balance: 25000,
      risk_per_trade_pct: 0.5,
      timezone: "Europe/Paris",
      created_at: created,
    },
  ];

  const setups: Setup[] = SETUPS[locale].map((s, i) => ({
    id: `setup-${i + 1}`,
    name: s.name,
    description: s.description,
    checklist: s.checklist,
    color: s.color,
    created_at: created,
  }));

  const rules: Rule[] = [
    { id: "r1", account_id: null, kind: "max_risk_pct", params: { value: 1 }, active: true, created_at: created },
    { id: "r2", account_id: null, kind: "require_stop", params: {}, active: true, created_at: created },
    { id: "r3", account_id: null, kind: "min_rr", params: { value: 1.5 }, active: true, created_at: created },
    { id: "r4", account_id: null, kind: "max_trades_per_day", params: { value: 3 }, active: true, created_at: created },
    { id: "r5", account_id: null, kind: "max_losses_per_day", params: { value: 2 }, active: true, created_at: created },
    { id: "r6", account_id: null, kind: "no_stop_widening", params: {}, active: true, created_at: created },
    { id: "r7", account_id: null, kind: "trading_hours", params: { start: "08:00", end: "21:00" }, active: true, created_at: created },
  ];

  const setupEdge = [
    { p: 0.55, win: [1.6, 2.4] },
    { p: 0.44, win: [1.8, 3.0] },
    { p: 0.5, win: [1.5, 1.9] },
    { p: 0.47, win: [1.7, 2.6] },
  ];

  const trades: Trade[] = [];
  const notes = NOTES[locale];
  let id = 0;

  const genAccount = (acc: Account, days: number, perDay: [number, number], maxBehaviour = 1) => {
    let balance: number = acc.starting_balance;
    for (let off = days; off >= 1; off--) {
      const day = parisDate(now, off, 12, 0);
      const wd = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Paris", weekday: "short" }).format(day);
      if (wd === "Sat" || wd === "Sun") continue;
      if (rnd() < 0.22) continue; // days off
      let n = Math.round(between(perDay[0], perDay[1]));
      if (rnd() < 0.08 * maxBehaviour) n += 2; // overtrading day
      let lossesToday = 0;
      let hour = Math.floor(between(8, 11));
      let minute = Math.floor(between(0, 59));
      let prevLoss: boolean = false;

      for (let k = 0; k < n; k++) {
        const inst = pick(UNIVERSE);
        const preset = findInstrument(inst.symbol)!;
        const setupIdx = Math.floor(rnd() * setups.length);
        const edge = setupEdge[setupIdx];
        const direction = rnd() < 0.55 ? "long" : "short";
        const dir = direction === "long" ? 1 : -1;

        const revenge: boolean = prevLoss && rnd() < 0.42 * maxBehaviour;
        const late = !revenge && rnd() < 0.11 * maxBehaviour;
        let emotionBefore: Emotion = pick<Emotion>(["calm", "calm", "focused", "confident", "focused", "nervous", "impatient", "bored"]);
        if (revenge) emotionBefore = pick<Emotion>(["frustrated", "frustrated", "impatient"]);
        if (late) emotionBefore = pick<Emotion>(["tired", "bored"]);

        if (late) {
          hour = Math.floor(between(21, 23));
          minute = Math.floor(between(5, 55));
        } else {
          hour = Math.min(20, hour + Math.floor(between(0, 3)));
          minute = Math.floor(between(0, 59));
        }
        const opened = parisDate(now, off, hour, minute);

        const drift = between(-0.035, 0.035);
        const entry = inst.price * (1 + drift);
        const dist = between(inst.dist[0], inst.dist[1]);
        const riskPct: number = (revenge ? between(1.8, 2.6) : between(0.85, 1.0)) * (acc.risk_per_trade_pct / 1);
        const size: number = roundToStep((balance * (riskPct / 100)) / (dist * preset.pointValue), preset.step) || preset.step;
        const lowRR = rnd() < 0.07;
        const rrPlanned = lowRR ? between(0.9, 1.3) : between(edge.win[0], edge.win[1]);
        const stop = entry - dir * dist;
        const target = entry + dir * dist * rrPlanned;

        let pWin = edge.p;
        if (emotionBefore === "calm" || emotionBefore === "focused") pWin += 0.07;
        if (emotionBefore === "impatient" || emotionBefore === "fomo") pWin -= 0.14;
        if (emotionBefore === "nervous" || emotionBefore === "bored") pWin -= 0.06;
        if (revenge) pWin = 0.28;
        if (late) pWin = 0.27;

        const win = rnd() < pWin;
        let rOutcome: number;
        let finalStop = stop;
        let moved = false;
        if (win) {
          rOutcome = rnd() < 0.75 ? rrPlanned : between(0.4, rrPlanned);
        } else if (rnd() < 0.14 * maxBehaviour) {
          moved = true;
          finalStop = entry - dir * dist * 1.65;
          rOutcome = -1.65;
        } else {
          rOutcome = rnd() < 0.15 ? between(-0.6, -0.2) : -1;
        }
        const exit = entry + dir * dist * rOutcome;
        const holdMin = win ? between(18, 150) : moved ? between(160, 420) : between(40, 260);
        const closed = new Date(opened.getTime() + holdMin * 60_000);
        const fees = Number(inst.fee(size, entry).toFixed(2));
        const gross: number = (exit - entry) * dir * size * preset.pointValue;
        const net: number = gross - fees;
        balance += net;

        const note = moved ? pick(notes.moved) : revenge ? pick(notes.revenge) : late ? pick(notes.late) : rnd() < 0.35 ? pick(win ? notes.win : notes.loss) : null;
        const tags: string[] = [];
        if (revenge) tags.push(locale === "fr" ? "revanche" : "revenge");
        if (moved) tags.push(locale === "fr" ? "stop déplacé" : "moved stop");
        if (late) tags.push(locale === "fr" ? "tard" : "late");
        if (!revenge && !late && rnd() < 0.15) tags.push(locale === "fr" ? "news" : "news");

        const checklist = setups[setupIdx].checklist;
        const checklistDone = revenge || late ? checklist.slice(0, 1) : rnd() < 0.8 ? checklist : checklist.slice(0, checklist.length - 1);

        trades.push({
          id: `t-${++id}`,
          account_id: acc.id,
          setup_id: revenge && rnd() < 0.5 ? null : setups[setupIdx].id,
          status: "closed",
          symbol: inst.symbol,
          market: preset.market,
          direction,
          point_value: preset.pointValue,
          planned_entry: entry,
          initial_stop: stop,
          target,
          planned_size: size,
          reason: null,
          checklist_done: checklistDone,
          entry_price: entry,
          exit_price: exit,
          final_stop: finalStop,
          size,
          fees,
          pnl_override: null,
          opened_at: iso(opened),
          closed_at: iso(closed),
          emotion_before: emotionBefore,
          emotion_after: win ? pick<Emotion>(["calm", "confident", "focused"]) : pick<Emotion>(["frustrated", "calm", "nervous", "frustrated"]),
          notes: note,
          lesson: moved || revenge ? pick(LESSONS[locale]) : null,
          tags,
          created_at: iso(opened),
        });

        prevLoss = net < 0;
        if (net < 0) lossesToday++;
        if (lossesToday >= 3) break;
        hour += 1;
      }
    }
  };

  genAccount(accounts[0], 92, [1, 3], 1);
  genAccount(accounts[1], 26, [1, 2], 0.45);

  // Today: one open trade and one written plan.
  const todayOpen = parisDate(now, 0, 10, 12);
  const nasPreset = findInstrument("NAS100")!;
  trades.push({
    id: `t-${++id}`,
    account_id: "acc-demo",
    setup_id: "setup-1",
    status: "open",
    symbol: "NAS100",
    market: "indices",
    direction: "long",
    point_value: nasPreset.pointValue,
    planned_entry: 24412,
    initial_stop: 24362,
    target: 24512,
    planned_size: 2,
    reason: locale === "fr" ? "Pullback propre sur l'EMA 20 H1 après l'ouverture." : "Clean pullback into the H1 20 EMA after the open.",
    checklist_done: SETUPS[locale][0].checklist,
    entry_price: 24414,
    exit_price: null,
    final_stop: 24362,
    size: 2,
    fees: 0,
    pnl_override: null,
    opened_at: iso(todayOpen),
    closed_at: null,
    emotion_before: "focused",
    emotion_after: null,
    notes: null,
    lesson: null,
    tags: [],
    created_at: iso(todayOpen),
  });
  trades.push({
    id: `t-${++id}`,
    account_id: "acc-demo",
    setup_id: "setup-4",
    status: "planned",
    symbol: "EURUSD",
    market: "forex",
    direction: "short",
    point_value: 100000,
    planned_entry: 1.1668,
    initial_stop: 1.1686,
    target: 1.1622,
    planned_size: 0.55,
    reason:
      locale === "fr"
        ? "Si le prix prend le plus haut d'hier et réintègre, short vers le milieu du range."
        : "If price sweeps yesterday's high and reclaims, short back to mid-range.",
    checklist_done: [SETUPS[locale][3].checklist[0]],
    entry_price: null,
    exit_price: null,
    final_stop: null,
    size: null,
    fees: 0,
    pnl_override: null,
    opened_at: iso(new Date(todayOpen.getTime() + 3 * 3600_000)),
    closed_at: null,
    emotion_before: "calm",
    emotion_after: null,
    notes: null,
    lesson: null,
    tags: [],
    created_at: iso(todayOpen),
  });

  const lastMonday = parisDate(now, ((now.getUTCDay() + 6) % 7) + 7, 0, 0);
  const reviews: Review[] = [
    {
      id: "rev-1",
      week_start: D(lastMonday.toISOString().slice(0, 10)),
      went_well:
        locale === "fr"
          ? "Les pullbacks de tendance : plan respecté, pas de stop déplacé."
          : "Trend pullbacks: plan followed, no moved stops.",
      to_improve:
        locale === "fr"
          ? "Deux trades le soir après 21 h, les deux perdants."
          : "Two trades in the evening after 21:00, both losers.",
      focus_next: locale === "fr" ? "Fermer la plateforme après le 2e perdant." : "Close the platform after the 2nd loser.",
      created_at: iso(now),
    },
  ];

  return { mode: "demo", userEmail: null, accounts, setups, trades, rules, reviews };
}

/** Numbers used by the landing page hero, from the demo account. */
export function heroData(locale: Locale) {
  const ws = buildDemoWorkspace(locale);
  const acc = ws.accounts[0];
  const checked = checkTrades(ws.trades.filter((x) => x.account_id === acc.id), ws.rules, ws.accounts);
  const s = computeStats(checked, acc.starting_balance);
  const monthAgo = Date.now() - 30 * 86400_000;
  const moved = (list: typeof checked) => costByRule(list).find((c) => c.kind === "no_stop_widening")?.cost;
  return {
    series: equitySeries(checked, acc.starting_balance).map((p) => ({ t: p.t, equity: p.equity, clean: p.clean })),
    start: acc.starting_balance,
    gap: s.cleanPnl - s.netPnl,
    movedCost: moved(checked.filter((c) => new Date(c.trade.opened_at).getTime() > monthAgo)) ?? moved(checked) ?? 0,
  };
}
