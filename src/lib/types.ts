export type AccountKind = "demo" | "live" | "prop";
export type Direction = "long" | "short";
export type TradeStatus = "planned" | "open" | "closed" | "cancelled";
export type Market = "forex" | "stocks" | "crypto" | "futures" | "indices" | "commodities";

export const EMOTIONS = [
  "calm",
  "confident",
  "focused",
  "nervous",
  "impatient",
  "frustrated",
  "fomo",
  "bored",
  "tired",
] as const;
export type Emotion = (typeof EMOTIONS)[number];

export interface Account {
  id: string;
  name: string;
  kind: AccountKind;
  currency: string;
  starting_balance: number;
  risk_per_trade_pct: number;
  timezone: string;
  created_at: string;
}

export interface Setup {
  id: string;
  name: string;
  description: string | null;
  checklist: string[];
  color: string | null;
  created_at: string;
}

export interface Trade {
  id: string;
  account_id: string;
  setup_id: string | null;
  status: TradeStatus;
  symbol: string;
  market: Market;
  direction: Direction;
  /** Value of a 1.0 price move for a size of 1 (e.g. 1 for shares, 100000 for a forex lot). */
  point_value: number;

  // Plan
  planned_entry: number | null;
  initial_stop: number | null;
  target: number | null;
  planned_size: number | null;
  reason: string | null;
  checklist_done: string[];

  // Reality
  entry_price: number | null;
  exit_price: number | null;
  final_stop: number | null;
  size: number | null;
  fees: number;
  pnl_override: number | null;
  opened_at: string;
  closed_at: string | null;

  // Psychology
  emotion_before: Emotion | null;
  emotion_after: Emotion | null;
  notes: string | null;
  lesson: string | null;
  tags: string[];

  created_at: string;
}

export type RuleKind =
  | "max_risk_pct"
  | "require_stop"
  | "min_rr"
  | "max_trades_per_day"
  | "max_losses_per_day"
  | "no_stop_widening"
  | "trading_hours";

export interface RuleParams {
  value?: number;
  /** Trading hours rule: allowed window, local time "HH:MM" */
  start?: string;
  end?: string;
}

export interface Rule {
  id: string;
  account_id: string | null;
  kind: RuleKind;
  params: RuleParams;
  active: boolean;
  created_at: string;
}

export interface Review {
  id: string;
  week_start: string; // yyyy-mm-dd (Monday)
  went_well: string | null;
  to_improve: string | null;
  focus_next: string | null;
  created_at: string;
}

export interface Workspace {
  mode: "demo" | "live";
  userEmail: string | null;
  accounts: Account[];
  setups: Setup[];
  trades: Trade[];
  rules: Rule[];
  reviews: Review[];
}
