"use server";

import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ACCOUNT_COOKIE, DEMO_COOKIE, isDemoMode } from "@/lib/data";
import { LOCALE_COOKIE, isLocale } from "@/lib/i18n/config";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { EMOTIONS } from "@/lib/types";

export type ActionResult = { ok: true; id?: string } | { ok: false; error: "demo" | "invalid" | "auth" | "server"; message?: string };

const YEAR = 60 * 60 * 24 * 365;

/* ------------------------------------------------------------------ preferences */

export async function setLocaleAction(locale: string) {
  if (!isLocale(locale)) return;
  (await cookies()).set(LOCALE_COOKIE, locale, { path: "/", maxAge: YEAR, sameSite: "lax" });
  revalidatePath("/", "layout");
}

export async function setAccountAction(id: string) {
  (await cookies()).set(ACCOUNT_COOKIE, id, { path: "/", maxAge: YEAR, sameSite: "lax" });
  revalidatePath("/", "layout");
}

export async function enterDemoAction() {
  const c = await cookies();
  c.set(DEMO_COOKIE, "1", { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 7 });
  c.delete(ACCOUNT_COOKIE);
  redirect("/dashboard");
}

export async function exitDemoAction() {
  const c = await cookies();
  c.delete(DEMO_COOKIE);
  c.delete(ACCOUNT_COOKIE);
  redirect(isSupabaseConfigured ? "/signup" : "/");
}

/* ------------------------------------------------------------------ auth */

export type AuthState = { error?: string; info?: string } | undefined;

const credentials = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(200),
});

export async function signInAction(_: AuthState, form: FormData): Promise<AuthState> {
  if (!isSupabaseConfigured) return { error: "notConfigured" };
  const parsed = credentials.safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return { error: "invalid" };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: "invalid" };
  (await cookies()).delete(DEMO_COOKIE);
  const next = String(form.get("next") ?? "");
  redirect(next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");
}

export async function signUpAction(_: AuthState, form: FormData): Promise<AuthState> {
  if (!isSupabaseConfigured) return { error: "notConfigured" };
  const parsed = credentials.extend({ name: z.string().trim().max(60).optional() }).safeParse({
    email: form.get("email"),
    password: form.get("password"),
    name: form.get("name") || undefined,
  });
  if (!parsed.success) return { error: "invalid" };
  const supabase = await createClient();
  const h = await headers();
  const origin = h.get("origin") ?? (h.get("host") ? `${h.get("x-forwarded-proto") ?? "https"}://${h.get("host")}` : "");
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { display_name: parsed.data.name },
      emailRedirectTo: origin ? `${origin}/auth/confirm` : undefined,
    },
  });
  if (error) return { error: error.message };
  (await cookies()).delete(DEMO_COOKIE);
  if (data.session) redirect("/dashboard");
  return { info: "checkEmail" };
}

export async function signOutAction() {
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  const c = await cookies();
  c.delete(DEMO_COOKIE);
  c.delete(ACCOUNT_COOKIE);
  redirect("/");
}

/* ------------------------------------------------------------------ helpers */

async function writable(): Promise<ActionResult | null> {
  if (await isDemoMode()) return { ok: false, error: "demo" };
  return null;
}

const optNum = z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().finite().nullable());
const optText = z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? null : v), z.string().max(4000).nullable());
const emotion = z.enum(EMOTIONS).nullable();

const tradeSchema = z.object({
  account_id: z.string().uuid(),
  setup_id: z.string().uuid().nullable(),
  status: z.enum(["planned", "open", "closed", "cancelled"]),
  symbol: z.string().trim().min(1).max(24).transform((s) => s.toUpperCase()),
  market: z.enum(["forex", "stocks", "crypto", "futures", "indices", "commodities"]),
  direction: z.enum(["long", "short"]),
  point_value: z.number().positive(),
  planned_entry: optNum,
  initial_stop: optNum,
  target: optNum,
  planned_size: optNum,
  reason: optText,
  checklist_done: z.array(z.string().max(300)).max(30),
  entry_price: optNum,
  exit_price: optNum,
  final_stop: optNum,
  size: optNum,
  fees: z.number().finite().default(0),
  pnl_override: optNum,
  opened_at: z.string().datetime({ offset: true }),
  closed_at: z.string().datetime({ offset: true }).nullable(),
  emotion_before: emotion,
  emotion_after: emotion,
  notes: optText,
  lesson: optText,
  tags: z.array(z.string().trim().min(1).max(40)).max(20),
});
export type TradeInput = z.input<typeof tradeSchema>;

function done(id?: string): ActionResult {
  revalidatePath("/", "layout");
  return { ok: true, id };
}

/* ------------------------------------------------------------------ trades */

export async function saveTradeAction(input: TradeInput, id?: string): Promise<ActionResult> {
  const blocked = await writable();
  if (blocked) return blocked;
  const parsed = tradeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid", message: parsed.error.issues[0]?.message };
  const supabase = await createClient();
  const q = id
    ? supabase.from("trades").update(parsed.data).eq("id", id).select("id").single()
    : supabase.from("trades").insert(parsed.data).select("id").single();
  const { data, error } = await q;
  if (error) return { ok: false, error: "server", message: error.message };
  return done(data.id);
}

export async function deleteTradeAction(id: string): Promise<ActionResult> {
  const blocked = await writable();
  if (blocked) return blocked;
  const supabase = await createClient();
  const { error } = await supabase.from("trades").delete().eq("id", id);
  if (error) return { ok: false, error: "server", message: error.message };
  return done();
}

/* ------------------------------------------------------------------ rules */

const ruleSchema = z.object({
  account_id: z.string().uuid().nullable(),
  kind: z.enum(["max_risk_pct", "require_stop", "min_rr", "max_trades_per_day", "max_losses_per_day", "no_stop_widening", "trading_hours"]),
  params: z.object({
    value: z.number().positive().max(1000).optional(),
    start: z.string().regex(/^\d{2}:\d{2}$/).optional(),
    end: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  }),
  active: z.boolean(),
});
export type RuleInput = z.input<typeof ruleSchema>;

export async function saveRuleAction(input: RuleInput, id?: string): Promise<ActionResult> {
  const blocked = await writable();
  if (blocked) return blocked;
  const parsed = ruleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const supabase = await createClient();
  const { data, error } = id
    ? await supabase.from("rules").update(parsed.data).eq("id", id).select("id").single()
    : await supabase.from("rules").insert(parsed.data).select("id").single();
  if (error) return { ok: false, error: "server", message: error.message };
  return done(data.id);
}

export async function deleteRuleAction(id: string): Promise<ActionResult> {
  const blocked = await writable();
  if (blocked) return blocked;
  const supabase = await createClient();
  const { error } = await supabase.from("rules").delete().eq("id", id);
  if (error) return { ok: false, error: "server", message: error.message };
  return done();
}

/* ------------------------------------------------------------------ accounts */

const accountSchema = z.object({
  name: z.string().trim().min(1).max(80),
  kind: z.enum(["demo", "live", "prop"]),
  currency: z.string().trim().length(3).transform((s) => s.toUpperCase()),
  starting_balance: z.number().min(0).max(1e10),
  risk_per_trade_pct: z.number().positive().max(100),
  timezone: z.string().min(1).max(64),
});
export type AccountInput = z.input<typeof accountSchema>;

export async function saveAccountAction(input: AccountInput, id?: string): Promise<ActionResult> {
  const blocked = await writable();
  if (blocked) return blocked;
  const parsed = accountSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const supabase = await createClient();
  const { data, error } = id
    ? await supabase.from("accounts").update(parsed.data).eq("id", id).select("id").single()
    : await supabase.from("accounts").insert(parsed.data).select("id").single();
  if (error) return { ok: false, error: "server", message: error.message };
  return done(data.id);
}

export async function deleteAccountAction(id: string): Promise<ActionResult> {
  const blocked = await writable();
  if (blocked) return blocked;
  const supabase = await createClient();
  const { error } = await supabase.from("accounts").delete().eq("id", id);
  if (error) return { ok: false, error: "server", message: error.message };
  (await cookies()).delete(ACCOUNT_COOKIE);
  return done();
}

/* ------------------------------------------------------------------ setups */

const setupSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: optText,
  checklist: z.array(z.string().trim().min(1).max(300)).max(30),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable(),
});
export type SetupInput = z.input<typeof setupSchema>;

export async function saveSetupAction(input: SetupInput, id?: string): Promise<ActionResult> {
  const blocked = await writable();
  if (blocked) return blocked;
  const parsed = setupSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const supabase = await createClient();
  const { data, error } = id
    ? await supabase.from("setups").update(parsed.data).eq("id", id).select("id").single()
    : await supabase.from("setups").insert(parsed.data).select("id").single();
  if (error) return { ok: false, error: "server", message: error.message };
  return done(data.id);
}

export async function deleteSetupAction(id: string): Promise<ActionResult> {
  const blocked = await writable();
  if (blocked) return blocked;
  const supabase = await createClient();
  const { error } = await supabase.from("setups").delete().eq("id", id);
  if (error) return { ok: false, error: "server", message: error.message };
  return done();
}

/* ------------------------------------------------------------------ reviews */

const reviewSchema = z.object({
  week_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  went_well: optText,
  to_improve: optText,
  focus_next: optText,
});
export type ReviewInput = z.input<typeof reviewSchema>;

export async function saveReviewAction(input: ReviewInput): Promise<ActionResult> {
  const blocked = await writable();
  if (blocked) return blocked;
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid" };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reviews")
    .upsert(parsed.data, { onConflict: "user_id,week_start" })
    .select("id")
    .single();
  if (error) return { ok: false, error: "server", message: error.message };
  return done(data.id);
}
