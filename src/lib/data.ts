import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { buildDemoWorkspace } from "./demo";
import { getLocale } from "./i18n/server";
import { isSupabaseConfigured } from "./supabase/env";
import { createClient } from "./supabase/server";
import type { Account, Review, Rule, Setup, Trade, Workspace } from "./types";

export const DEMO_COOKIE = "plumb-demo";
export const ACCOUNT_COOKIE = "plumb-account";

export const isDemoMode = cache(async () => {
  if (!isSupabaseConfigured) return true;
  return (await cookies()).get(DEMO_COOKIE)?.value === "1";
});

const num = (v: unknown) => (v == null ? null : Number(v));

function normalizeTrade(r: Record<string, unknown>): Trade {
  return {
    ...(r as unknown as Trade),
    point_value: Number(r.point_value),
    planned_entry: num(r.planned_entry),
    initial_stop: num(r.initial_stop),
    target: num(r.target),
    planned_size: num(r.planned_size),
    entry_price: num(r.entry_price),
    exit_price: num(r.exit_price),
    final_stop: num(r.final_stop),
    size: num(r.size),
    fees: Number(r.fees ?? 0),
    pnl_override: num(r.pnl_override),
    checklist_done: (r.checklist_done as string[]) ?? [],
    tags: (r.tags as string[]) ?? [],
  };
}

export const getWorkspace = cache(async (): Promise<Workspace> => {
  const locale = await getLocale();
  if (await isDemoMode()) return buildDemoWorkspace(locale);

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const email = (claims?.claims?.email as string | undefined) ?? null;

  const [accounts, setups, trades, rules, reviews] = await Promise.all([
    supabase.from("accounts").select("*").order("created_at"),
    supabase.from("setups").select("*").order("created_at"),
    supabase.from("trades").select("*").order("opened_at"),
    supabase.from("rules").select("*").order("created_at"),
    supabase.from("reviews").select("*").order("week_start", { ascending: false }),
  ]);

  return {
    mode: "live",
    userEmail: email,
    accounts: ((accounts.data ?? []) as Account[]).map((a) => ({
      ...a,
      starting_balance: Number(a.starting_balance),
      risk_per_trade_pct: Number(a.risk_per_trade_pct),
    })),
    setups: (setups.data ?? []) as Setup[],
    trades: (trades.data ?? []).map(normalizeTrade),
    rules: ((rules.data ?? []) as Rule[]).map((r) => ({ ...r, params: r.params ?? {} })),
    reviews: (reviews.data ?? []) as Review[],
  };
});

/** Selected account id, or "all". */
export async function getSelectedAccount(ws: Workspace): Promise<Account | null> {
  const v = (await cookies()).get(ACCOUNT_COOKIE)?.value;
  if (v === "all") return null;
  return ws.accounts.find((a) => a.id === v) ?? ws.accounts[0] ?? null;
}

/** Trades + accounts + start balance for the current account scope. */
export async function getScope() {
  const ws = await getWorkspace();
  const account = await getSelectedAccount(ws);
  const accounts = account ? [account] : ws.accounts;
  const ids = new Set(accounts.map((a) => a.id));
  const trades = ws.trades.filter((t) => ids.has(t.account_id));
  const startBalance = accounts.reduce((s, a) => s + a.starting_balance, 0);
  const currency = accounts[0]?.currency ?? "EUR";
  const tz = accounts[0]?.timezone ?? "Europe/Paris";
  return { ws, account, accounts, trades, startBalance, currency, tz };
}
