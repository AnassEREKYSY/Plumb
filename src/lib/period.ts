import type { Trade } from "./types";

export const PERIODS = ["7", "30", "90", "all"] as const;
export type Period = (typeof PERIODS)[number];

export function parsePeriod(v: string | string[] | undefined, fallback: Period = "90"): Period {
  const s = Array.isArray(v) ? v[0] : v;
  return PERIODS.includes(s as Period) ? (s as Period) : fallback;
}

export function inPeriod(t: Trade, p: Period, now = Date.now()) {
  if (p === "all") return true;
  const ts = new Date(t.closed_at ?? t.opened_at).getTime();
  return ts >= now - Number(p) * 86400_000;
}
