"use client";
import { Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { deleteRuleAction, saveRuleAction } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { fmtMoney } from "@/lib/format";
import { useI18n } from "@/lib/i18n/client";
import type { Rule, RuleKind } from "@/lib/types";

const ALL: RuleKind[] = ["max_risk_pct", "require_stop", "min_rr", "max_trades_per_day", "max_losses_per_day", "no_stop_widening", "trading_hours"];
const DEFAULTS: Record<RuleKind, Rule["params"]> = {
  max_risk_pct: { value: 1 },
  require_stop: {},
  min_rr: { value: 1.5 },
  max_trades_per_day: { value: 3 },
  max_losses_per_day: { value: 2 },
  no_stop_widening: {},
  trading_hours: { start: "08:00", end: "21:00" },
};
const HAS_VALUE: RuleKind[] = ["max_risk_pct", "min_rr", "max_trades_per_day", "max_losses_per_day"];

export function RulesEditor({
  rules,
  stats,
  currency,
}: {
  rules: Rule[];
  stats: Record<string, { count: number; cost: number }>;
  currency: string;
}) {
  const { t } = useI18n();
  const toast = useToast();
  const [pending, start] = useTransition();
  const missing = ALL.filter((k) => !rules.some((r) => r.kind === k));

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) toast(res.error === "demo" ? t("common.demoReadOnly") : t("common.error"), "error");
      else toast(t("common.saved"));
    });

  return (
    <div className={cn("space-y-3", pending && "opacity-80")}>
      {rules.map((r) => (
        <RuleCard key={r.id} rule={r} stat={stats[r.id]} currency={currency} onSave={(patch) => run(() => saveRuleAction({ account_id: r.account_id, kind: r.kind, params: r.params, active: r.active, ...patch }, r.id))} onDelete={() => run(() => deleteRuleAction(r.id))} />
      ))}

      <Card className="border-dashed bg-transparent shadow-none">
        <div className="px-5 py-4">
          <div className="text-[13.5px] font-semibold text-ink">{t("rules.addTitle")}</div>
          <p className="mt-0.5 text-[12.5px] text-muted">{missing.length ? t("rules.addHint") : t("rules.allAdded")}</p>
          {missing.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {missing.map((k) => (
                <button
                  key={k}
                  onClick={() => run(() => saveRuleAction({ account_id: null, kind: k, params: DEFAULTS[k], active: true }))}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line-strong bg-surface px-3 text-[12.5px] text-ink-2 hover:border-mauve hover:text-ink"
                >
                  <Plus className="size-3.5" />
                  {t(`rules.kinds.${k}.title`)}
                </button>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

function RuleCard({
  rule,
  stat,
  currency,
  onSave,
  onDelete,
}: {
  rule: Rule;
  stat?: { count: number; cost: number };
  currency: string;
  onSave: (patch: Partial<Pick<Rule, "params" | "active">>) => void;
  onDelete: () => void;
}) {
  const { t, locale } = useI18n();
  const [value, setValue] = useState(String(rule.params.value ?? ""));
  const [start, setStart] = useState(rule.params.start ?? "08:00");
  const [end, setEnd] = useState(rule.params.end ?? "21:00");
  const dirty =
    (HAS_VALUE.includes(rule.kind) && Number(value) !== rule.params.value) ||
    (rule.kind === "trading_hours" && (start !== rule.params.start || end !== rule.params.end));
  const desc = t(`rules.kinds.${rule.kind}.desc`, { value: rule.params.value ?? "", start: rule.params.start ?? "", end: rule.params.end ?? "" });

  return (
    <Card className={cn("transition-opacity", !rule.active && "opacity-65")}>
      <div className="flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center">
        <button
          type="button"
          role="switch"
          aria-checked={rule.active}
          aria-label={rule.active ? t("rules.active") : t("rules.paused")}
          onClick={() => onSave({ active: !rule.active })}
          className={cn("relative h-6 w-10 shrink-0 rounded-full transition-colors", rule.active ? "bg-gain" : "bg-surface-3")}
        >
          <span className={cn("absolute top-0.5 left-0 size-5 rounded-full bg-surface shadow transition-transform", rule.active ? "translate-x-[18px]" : "translate-x-0.5")} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[14.5px] font-semibold text-ink">{t(`rules.kinds.${rule.kind}.title`)}</h3>
            {!rule.active && <Badge>{t("rules.paused")}</Badge>}
          </div>
          <p className="mt-0.5 text-[13px] text-muted">{desc}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {HAS_VALUE.includes(rule.kind) && (
            <label className="flex items-center gap-2 text-[12.5px] text-muted">
              <Input type="number" step={rule.kind === "max_risk_pct" ? 0.1 : rule.kind === "min_rr" ? 0.1 : 1} min={0} value={value} onChange={(e) => setValue(e.target.value)} className="num h-8 w-20 text-right" />
              {rule.kind !== "max_risk_pct" && rule.kind !== "min_rr" ? t(`rules.kinds.${rule.kind as "max_trades_per_day"}.unit`) : rule.kind === "max_risk_pct" ? "%" : "R"}
            </label>
          )}
          {rule.kind === "trading_hours" && (
            <div className="flex items-center gap-2 text-[12.5px] text-muted">
              {t("rules.kinds.trading_hours.from")}
              <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} className="num h-8 w-[104px]" />
              {t("rules.kinds.trading_hours.to")}
              <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} className="num h-8 w-[104px]" />
            </div>
          )}
          {dirty && (
            <button
              onClick={() => onSave({ params: rule.kind === "trading_hours" ? { start, end } : { value: Number(value) } })}
              className="h-8 rounded-md bg-plum px-3 text-[12.5px] font-medium text-on-plum hover:bg-plum-hover"
            >
              {t("common.save")}
            </button>
          )}
        </div>

        <div className="flex items-center gap-4 border-t border-line pt-3 md:w-[190px] md:justify-end md:border-t-0 md:border-l md:pt-0 md:pl-5">
          <div className="text-right">
            <div className={cn("text-[12.5px]", stat?.count ? "text-ochre" : "text-gain")}>{stat?.count ? (stat.count === 1 ? t("rules.brokenOnce") : t("rules.brokenTimes", { n: stat.count })) : t("rules.neverBroken")}</div>
            {stat?.cost ? <div className="num text-[14px] font-semibold text-loss">{fmtMoney(-stat.cost, currency, locale, { decimals: 0 })}</div> : null}
          </div>
          <button onClick={onDelete} className="grid size-8 place-items-center rounded-md text-muted hover:bg-loss-tint hover:text-loss" aria-label={t("rules.remove")} title={t("rules.remove")}>
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>
    </Card>
  );
}
