"use client";
import { Check, Minus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveTradeAction, type TradeInput } from "@/app/actions";
import { TradeLadder } from "@/components/charts/trade-ladder";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Segmented } from "@/components/ui/segmented";
import { useToast } from "@/components/ui/toast";
import { checkTrades, plannedRR, positionSize } from "@/lib/calc";
import { cn } from "@/lib/cn";
import { fmtMoney, fmtNum, fmtPct } from "@/lib/format";
import { useI18n } from "@/lib/i18n/client";
import { INSTRUMENTS, MARKETS, findInstrument, roundToStep } from "@/lib/instruments";
import type { Account, Direction, Emotion, Market, Rule, RuleKind, Setup, Trade } from "@/lib/types";
import { EmotionPicker } from "./emotion-picker";

type Mode = "plan" | "log";

const toLocalInput = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
const n = (s: string) => (s.trim() === "" ? null : Number(s.replace(",", ".")));

export function PlanForm({
  accounts,
  setups,
  rules,
  trades,
  defaultAccountId,
  balances,
}: {
  accounts: Account[];
  setups: Setup[];
  rules: Rule[];
  trades: Trade[];
  defaultAccountId: string;
  balances: Record<string, number>;
}) {
  const { t, locale } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  // A plan is checked as if entered now (daily counters, trading hours).
  const [nowIso] = useState(() => new Date().toISOString());

  const [mode, setMode] = useState<Mode>("plan");
  const [accountId, setAccountId] = useState(defaultAccountId);
  const account = accounts.find((a) => a.id === accountId) ?? accounts[0];
  const [symbol, setSymbol] = useState("EURUSD");
  const preset = findInstrument(symbol);
  const [market, setMarket] = useState<Market>("forex");
  const [pointValue, setPointValue] = useState("100000");
  const [direction, setDirection] = useState<Direction>("long");
  const [entry, setEntry] = useState("");
  const [stop, setStop] = useState("");
  const [target, setTarget] = useState("");
  const [riskPct, setRiskPct] = useState(String(account?.risk_per_trade_pct ?? 1));
  const [sizeOverride, setSizeOverride] = useState("");
  const [setupId, setSetupId] = useState<string>("");
  const [checks, setChecks] = useState<string[]>([]);
  const [reason, setReason] = useState("");
  const [emotionBefore, setEmotionBefore] = useState<Emotion | null>(null);
  // log mode
  const [exit, setExit] = useState("");
  const [finalStop, setFinalStop] = useState("");
  const [fees, setFees] = useState("");
  const [netOverride, setNetOverride] = useState("");
  const [openedAt, setOpenedAt] = useState(() => toLocalInput(new Date()));
  const [closedAt, setClosedAt] = useState(() => toLocalInput(new Date()));
  const [emotionAfter, setEmotionAfter] = useState<Emotion | null>(null);
  const [notes, setNotes] = useState("");
  const [lesson, setLesson] = useState("");
  const [tags, setTags] = useState("");

  const onSymbol = (s: string) => {
    setSymbol(s.toUpperCase());
    const p = findInstrument(s);
    if (p) {
      setMarket(p.market);
      setPointValue(String(p.pointValue));
    }
  };

  const setup = setups.find((s) => s.id === setupId);
  const e = n(entry),
    sl = n(stop),
    tp = n(target),
    pv = n(pointValue) ?? 1,
    rp = n(riskPct) ?? 1;
  const balance = balances[accountId] ?? account?.starting_balance ?? 0;

  const stopError = e != null && sl != null && (direction === "long" ? sl >= e : sl <= e);
  const targetError = e != null && tp != null && (direction === "long" ? tp <= e : tp >= e);

  const rawSize = e != null && sl != null && !stopError ? positionSize({ balance, riskPct: rp, entry: e, stop: sl, pointValue: pv }) : null;
  const calcSize = rawSize != null ? roundToStep(rawSize, preset?.step ?? 0.01) : null;
  const size = n(sizeOverride) ?? calcSize;
  const risk = e != null && sl != null && size ? Math.abs(e - sl) * size * pv : null;
  const reward = e != null && tp != null && size ? Math.abs(tp - e) * size * pv : null;
  const rr = plannedRR({ planned_entry: e, initial_stop: sl, target: tp, direction });

  const draft: Trade = {
      id: "draft",
      account_id: accountId,
      setup_id: setupId || null,
      status: mode === "log" ? "closed" : "open",
      symbol,
      market,
      direction,
      point_value: pv,
      planned_entry: e,
      initial_stop: sl,
      target: tp,
      planned_size: size,
      reason: reason || null,
      checklist_done: checks,
      entry_price: e,
      exit_price: mode === "log" ? n(exit) : null,
      final_stop: mode === "log" ? (n(finalStop) ?? sl) : sl,
      size,
      fees: n(fees) ?? 0,
      pnl_override: mode === "log" ? n(netOverride) : null,
      opened_at: mode === "log" && openedAt ? new Date(openedAt).toISOString() : nowIso,
      closed_at: mode === "log" && closedAt ? new Date(closedAt).toISOString() : null,
      emotion_before: emotionBefore,
      emotion_after: emotionAfter,
      notes: notes || null,
      lesson: lesson || null,
      tags: [],
      created_at: "",
  };

  const ruleResults = (() => {
    if (e == null) return null;
    const res = checkTrades([...trades.filter((x) => x.account_id === accountId), draft], rules, accounts);
    const mine = res.find((r) => r.trade.id === "draft");
    if (!mine) return null;
    const applicable = rules.filter((r) => r.active && (r.account_id == null || r.account_id === accountId));
    return applicable.map((rule) => ({ rule, violation: mine.violations.find((v) => v.ruleId === rule.id) ?? null, riskPct: mine.riskPct }));
  })();

  const submit = (status: "planned" | "open" | "closed") => {
    if (e == null || stopError || targetError) return;
    const input: TradeInput = {
      account_id: accountId,
      setup_id: setupId || null,
      status,
      symbol,
      market,
      direction,
      point_value: pv,
      planned_entry: e,
      initial_stop: sl,
      target: tp,
      planned_size: size,
      reason: reason || null,
      checklist_done: checks,
      entry_price: status === "planned" ? null : e,
      exit_price: status === "closed" ? n(exit) : null,
      final_stop: status === "closed" ? (n(finalStop) ?? sl) : status === "open" ? sl : null,
      size: status === "planned" ? null : size,
      fees: n(fees) ?? 0,
      pnl_override: status === "closed" ? n(netOverride) : null,
      opened_at: status === "closed" ? new Date(openedAt).toISOString() : new Date().toISOString(),
      closed_at: status === "closed" ? new Date(closedAt).toISOString() : null,
      emotion_before: emotionBefore,
      emotion_after: status === "closed" ? emotionAfter : null,
      notes: notes || null,
      lesson: lesson || null,
      tags: tags
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    };
    start(async () => {
      const res = await saveTradeAction(input);
      if (res.ok) {
        toast(t("common.saved"));
        router.push(res.id ? `/journal/${res.id}` : "/journal");
      } else toast(res.error === "demo" ? t("common.demoReadOnly") : (res.message ?? t("common.error")), "error");
    });
  };

  const canSubmit = e != null && sl != null && !stopError && !targetError && symbol.trim().length > 0 && (mode === "plan" || n(exit) != null || n(netOverride) != null);
  const priceStep = "any";

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-4">
        <Segmented
          value={mode}
          onChange={setMode}
          options={[
            { value: "plan", label: t("plan.modePlan") },
            { value: "log", label: t("plan.modeLog") },
          ]}
          className="w-full sm:w-auto"
        />

        <Card className="p-4 sm:p-5">
          <SectionTitle n="01">{t("plan.instrument")}</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
            <Field label={t("common.account")} htmlFor="account">
              <Select
                id="account"
                value={accountId}
                onChange={(ev) => {
                  setAccountId(ev.target.value);
                  const a = accounts.find((x) => x.id === ev.target.value);
                  if (a) setRiskPct(String(a.risk_per_trade_pct));
                }}
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("plan.symbol")} htmlFor="symbol">
              <Input id="symbol" list="instruments" value={symbol} onChange={(ev) => onSymbol(ev.target.value)} placeholder={t("plan.symbolPlaceholder")} autoComplete="off" className="font-medium uppercase" />
              <datalist id="instruments">
                {INSTRUMENTS.map((i) => (
                  <option key={i.symbol} value={i.symbol} />
                ))}
              </datalist>
            </Field>
            <Field label={t("plan.market")} htmlFor="market">
              <Select id="market" value={market} onChange={(ev) => setMarket(ev.target.value as Market)}>
                {MARKETS.map((m) => (
                  <option key={m} value={m}>
                    {t(`markets.${m}`)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("plan.direction")}>
              <Segmented
                value={direction}
                onChange={setDirection}
                options={[
                  { value: "long", label: <span className="text-gain">▲ {t("common.long")}</span> },
                  { value: "short", label: <span className="text-loss">▼ {t("common.short")}</span> },
                ]}
                className="w-full"
              />
            </Field>
          </div>
        </Card>

        <Card className="p-4 sm:p-5">
          <SectionTitle n="02">{t("plan.levels")}</SectionTitle>
          <div className="grid grid-cols-3 gap-x-2.5 gap-y-4 sm:gap-4">
            <Field label={t("plan.entry")} htmlFor="entry">
              <Input id="entry" inputMode="decimal" type="number" step={priceStep} value={entry} onChange={(ev) => setEntry(ev.target.value)} className="num" />
            </Field>
            <Field label={t("plan.stop")} htmlFor="stop" error={stopError ? t("plan.invalidStop") : undefined}>
              <Input id="stop" inputMode="decimal" type="number" step={priceStep} value={stop} onChange={(ev) => setStop(ev.target.value)} className={cn("num", stopError && "border-loss")} />
            </Field>
            <Field label={t("plan.target")} htmlFor="target" error={targetError ? t("plan.invalidTarget") : undefined}>
              <Input id="target" inputMode="decimal" type="number" step={priceStep} value={target} onChange={(ev) => setTarget(ev.target.value)} className={cn("num", targetError && "border-loss")} />
            </Field>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-x-2.5 gap-y-4 sm:grid-cols-3 sm:gap-4">
            <Field label={`${t("plan.riskPct")} (%)`} htmlFor="risk" hint={t("plan.riskPctHint", { pct: fmtNum(account?.risk_per_trade_pct ?? 1, locale, 1) })}>
              <Input id="risk" inputMode="decimal" type="number" step="0.05" value={riskPct} onChange={(ev) => setRiskPct(ev.target.value)} className="num" />
            </Field>
            <Field label={t("plan.size")} htmlFor="size" hint={t("plan.sizeHint")}>
              <Input id="size" inputMode="decimal" type="number" step="any" value={sizeOverride} placeholder={calcSize != null ? String(calcSize) : ""} onChange={(ev) => setSizeOverride(ev.target.value)} className="num" />
            </Field>
            <Field label={t("plan.pointValue")} htmlFor="pv" hint={t("plan.pointValueHint")} className="col-span-2 sm:col-span-1">
              <Input id="pv" inputMode="decimal" type="number" step="any" value={pointValue} onChange={(ev) => setPointValue(ev.target.value)} className="num" />
            </Field>
          </div>
        </Card>

        <Card className="p-4 sm:p-5">
          <SectionTitle n="03">{t("plan.setup")}</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("plan.setup")} htmlFor="setup">
              <Select
                id="setup"
                value={setupId}
                onChange={(ev) => {
                  setSetupId(ev.target.value);
                  setChecks([]);
                }}
              >
                <option value="">{t("plan.noSetup")}</option>
                {setups.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </Field>
            {setup && setup.checklist.length > 0 && (
              <fieldset className="sm:row-span-2">
                <legend className="mb-2 text-[12.5px] font-medium text-ink-2">{t("plan.checklist")}</legend>
                <ul className="space-y-1.5">
                  {setup.checklist.map((item) => {
                    const on = checks.includes(item);
                    return (
                      <li key={item}>
                        <label className={cn("flex cursor-pointer items-start gap-2.5 rounded-md border px-3 py-2 text-[13px] transition-colors", on ? "border-gain/40 bg-gain-tint text-ink" : "border-line bg-surface text-ink-2 hover:border-line-strong")}>
                          <input type="checkbox" className="sr-only" checked={on} onChange={() => setChecks((c) => (on ? c.filter((x) => x !== item) : [...c, item]))} />
                          <span className={cn("mt-px grid size-4 shrink-0 place-items-center rounded-[4px] border", on ? "border-gain bg-gain text-surface" : "border-line-strong")}>
                            {on && <Check className="size-3" strokeWidth={3} />}
                          </span>
                          {item}
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </fieldset>
            )}
            <Field label={t("plan.reason")} htmlFor="reason" className={setup && setup.checklist.length > 0 ? "" : "sm:col-span-2"}>
              <Textarea id="reason" value={reason} onChange={(ev) => setReason(ev.target.value)} placeholder={t("plan.reasonPlaceholder")} rows={3} />
            </Field>
          </div>
          <div className="mt-5">
            <EmotionPicker value={emotionBefore} onChange={setEmotionBefore} label={t("plan.emotionBefore")} />
          </div>
        </Card>

        {mode === "log" && (
          <Card className="p-4 sm:p-5">
            <SectionTitle n="04">{t("plan.outcome")}</SectionTitle>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label={t("plan.openedAt")} htmlFor="opened">
                <Input id="opened" type="datetime-local" value={openedAt} onChange={(ev) => setOpenedAt(ev.target.value)} />
              </Field>
              <Field label={t("plan.closedAt")} htmlFor="closed">
                <Input id="closed" type="datetime-local" value={closedAt} onChange={(ev) => setClosedAt(ev.target.value)} />
              </Field>
              <Field label={t("plan.exit")} htmlFor="exit">
                <Input id="exit" type="number" step="any" inputMode="decimal" value={exit} onChange={(ev) => setExit(ev.target.value)} className="num" />
              </Field>
              <Field label={t("plan.finalStop")} htmlFor="fstop" hint={t("plan.finalStopHint")}>
                <Input id="fstop" type="number" step="any" inputMode="decimal" value={finalStop} placeholder={stop} onChange={(ev) => setFinalStop(ev.target.value)} className="num" />
              </Field>
              <Field label={t("plan.fees")} htmlFor="fees">
                <Input id="fees" type="number" step="any" inputMode="decimal" value={fees} onChange={(ev) => setFees(ev.target.value)} className="num" placeholder="0" />
              </Field>
              <Field label={t("plan.netOverride")} htmlFor="net" hint={t("plan.netOverrideHint")}>
                <Input id="net" type="number" step="any" inputMode="decimal" value={netOverride} onChange={(ev) => setNetOverride(ev.target.value)} className="num" />
              </Field>
            </div>
            <div className="mt-5 space-y-4">
              <EmotionPicker value={emotionAfter} onChange={setEmotionAfter} label={t("plan.emotionAfter")} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label={t("plan.notes")} htmlFor="notes">
                  <Textarea id="notes" value={notes} onChange={(ev) => setNotes(ev.target.value)} rows={3} />
                </Field>
                <Field label={t("plan.lesson")} htmlFor="lesson">
                  <Textarea id="lesson" value={lesson} onChange={(ev) => setLesson(ev.target.value)} rows={3} />
                </Field>
              </div>
              <Field label={t("plan.tags")} htmlFor="tags">
                <Input id="tags" value={tags} onChange={(ev) => setTags(ev.target.value)} placeholder={t("plan.tagsPlaceholder")} />
              </Field>
            </div>
          </Card>
        )}
      </div>

      {/* Ticket */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-line bg-surface-2/60 px-5 py-3">
            <span className="text-[13px] font-semibold text-ink">{t("plan.ticket")}</span>
            <span className="num text-[12.5px] text-muted">
              {symbol || "—"} · <span className={direction === "long" ? "text-gain" : "text-loss"}>{t(`common.${direction}`)}</span>
            </span>
          </div>
          <div className="px-5 pt-4">
            <div className="text-[12px] text-muted">{t("plan.positionSize")}</div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-display num text-[2.4rem] leading-none text-ink">{size != null ? fmtNum(size, locale, size < 1 ? 2 : size < 10 ? 2 : 0) : "—"}</span>
              <span className="text-[13px] text-muted">{preset?.unit ?? ""}</span>
            </div>
          </div>
          <dl className="mt-4 grid grid-cols-3 border-y border-line text-[12px]">
            <Stat label={t("plan.atRisk")} value={risk != null ? fmtMoney(-risk, account?.currency ?? "EUR", locale, { decimals: 0 }) : "—"} tone="loss" sub={risk != null && balance ? `${fmtPct(risk / balance, locale, 2)} ${t("plan.ofBalance")}` : undefined} />
            <Stat label={t("plan.reward")} value={reward != null ? fmtMoney(reward, account?.currency ?? "EUR", locale, { decimals: 0, sign: true }) : "—"} tone="gain" />
            <Stat label={t("plan.ratio")} value={rr != null ? `1:${fmtNum(rr, locale, 2)}` : "—"} />
          </dl>
          <div className="px-5 py-4">
            <TradeLadder direction={direction} entry={e} stop={stopError ? null : sl} target={targetError ? null : tp} exit={mode === "log" ? n(exit) : null} finalStop={mode === "log" ? n(finalStop) : null} height={200} />
          </div>
          <div className="border-t border-line px-5 py-4">
            <div className="mb-2.5 text-[12px] font-medium text-muted">{t("plan.checksTitle")}</div>
            {!ruleResults ? (
              <p className="text-[12.5px] text-muted">{t("plan.checksEmpty")}</p>
            ) : (
              <ul className="space-y-2">
                {ruleResults.map(({ rule, violation }) => (
                  <RuleLine key={rule.id} kind={rule.kind} params={rule.params} violation={violation?.detail ?? null} skipped={rule.kind === "no_stop_widening" && mode === "plan"} />
                ))}
              </ul>
            )}
          </div>
          <div className="flex flex-col gap-2 border-t border-line bg-surface-2/40 p-4">
            {mode === "plan" ? (
              <>
                <Button disabled={!canSubmit || pending} onClick={() => submit("planned")} size="lg">
                  {pending ? t("common.saving") : t("plan.savePlan")}
                </Button>
                <Button variant="secondary" disabled={!canSubmit || pending} onClick={() => submit("open")}>
                  {t("plan.tookTrade")}
                </Button>
              </>
            ) : (
              <Button disabled={!canSubmit || pending} onClick={() => submit("closed")} size="lg">
                {pending ? t("common.saving") : t("plan.saveLog")}
              </Button>
            )}
            <p className="pt-1 text-center text-[11px] text-muted">{t("common.disclaimer")}</p>
          </div>
        </Card>
      </aside>

      {/* Small screens: the ticket summary stays reachable at the bottom */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 px-4 py-2.5 shadow-[0_-8px_24px_-12px_rgba(0,0,0,0.25)] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-[640px] items-center gap-3">
          <dl className="num grid flex-1 grid-cols-3 gap-2 text-[11px]">
            <div>
              <dt className="text-muted">{t("plan.positionSize")}</dt>
              <dd className="text-[14px] font-semibold text-ink">{size != null ? fmtNum(size, locale, 2) : "—"}</dd>
            </div>
            <div>
              <dt className="text-muted">{t("plan.atRisk")}</dt>
              <dd className="text-[14px] font-semibold text-loss">{risk != null ? fmtMoney(-risk, account?.currency ?? "EUR", locale, { decimals: 0 }) : "—"}</dd>
            </div>
            <div>
              <dt className="text-muted">{t("plan.ratio")}</dt>
              <dd className="text-[14px] font-semibold text-ink">{rr != null ? `1:${fmtNum(rr, locale, 1)}` : "—"}</dd>
            </div>
          </dl>
          {ruleResults && ruleResults.some((r) => r.violation) && <span className="size-2 shrink-0 rounded-full bg-ochre" aria-hidden />}
          <Button disabled={!canSubmit || pending} onClick={() => submit(mode === "plan" ? "planned" : "closed")} className="shrink-0">
            {mode === "plan" ? t("plan.savePlan") : t("plan.saveLog")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <h2 className="mb-4 flex items-baseline gap-2.5 text-[14px] font-semibold text-ink">
      <span className="num font-display text-[13px] font-normal text-mauve">{n}</span>
      {children}
    </h2>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "gain" | "loss" }) {
  return (
    <div className="border-r border-line px-4 py-3 last:border-r-0">
      <dt className="text-muted">{label}</dt>
      <dd className={cn("num mt-1 text-[14.5px] font-semibold", tone === "gain" ? "text-gain" : tone === "loss" ? "text-loss" : "text-ink")}>{value}</dd>
      {sub && <dd className="num mt-0.5 text-[11px] text-muted">{sub}</dd>}
    </div>
  );
}

export function RuleLine({
  kind,
  params,
  violation,
  skipped,
}: {
  kind: RuleKind;
  params: Rule["params"];
  violation: string | null;
  skipped?: boolean;
}) {
  const { t } = useI18n();
  const title = t(`rules.kinds.${kind}.title`);
  const desc = t(`rules.kinds.${kind}.desc`, { value: params.value ?? "", start: params.start ?? "", end: params.end ?? "" });
  return (
    <li className="flex items-start gap-2.5 text-[12.5px]">
      <span
        className={cn(
          "mt-px grid size-[18px] shrink-0 place-items-center rounded-full",
          skipped ? "bg-surface-2 text-muted" : violation ? "bg-ochre-tint text-ochre" : "bg-gain-tint text-gain",
        )}
      >
        {skipped ? <Minus className="size-3" strokeWidth={2.5} /> : violation ? <X className="size-3" strokeWidth={2.5} /> : <Check className="size-3" strokeWidth={2.5} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn("block", skipped ? "text-muted" : "text-ink")}>{title}</span>
        <span className="block text-muted">{desc}</span>
      </span>
      {violation && violation !== "—" && <span className="num shrink-0 rounded bg-ochre-tint px-1.5 py-0.5 text-[11px] font-medium text-ochre">{violation}</span>}
    </li>
  );
}
