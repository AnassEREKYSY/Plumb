"use client";
import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { deleteTradeAction, saveTradeAction, type TradeInput } from "@/app/actions";
import { EmotionPicker } from "@/components/app/emotion-picker";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n/client";
import type { Emotion, Trade } from "@/lib/types";

const toLocalInput = (iso: string) => {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
const n = (s: string) => (s.trim() === "" ? null : Number(s.replace(",", ".")));

function toInput(tr: Trade): TradeInput {
  return {
    account_id: tr.account_id,
    setup_id: tr.setup_id,
    status: tr.status,
    symbol: tr.symbol,
    market: tr.market,
    direction: tr.direction,
    point_value: tr.point_value,
    planned_entry: tr.planned_entry,
    initial_stop: tr.initial_stop,
    target: tr.target,
    planned_size: tr.planned_size,
    reason: tr.reason,
    checklist_done: tr.checklist_done,
    entry_price: tr.entry_price,
    exit_price: tr.exit_price,
    final_stop: tr.final_stop,
    size: tr.size,
    fees: tr.fees,
    pnl_override: tr.pnl_override,
    opened_at: tr.opened_at,
    closed_at: tr.closed_at,
    emotion_before: tr.emotion_before,
    emotion_after: tr.emotion_after,
    notes: tr.notes,
    lesson: tr.lesson,
    tags: tr.tags,
  };
}

export function DeleteTradeButton({ id }: { id: string }) {
  const { t } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="danger"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (!window.confirm(t("trade.deleteConfirm"))) return;
        start(async () => {
          const res = await deleteTradeAction(id);
          if (res.ok) {
            toast(t("trade.deleted"));
            router.push("/journal");
          } else toast(res.error === "demo" ? t("common.demoReadOnly") : t("common.error"), "error");
        });
      }}
    >
      <Trash2 className="size-3.5" />
      {t("common.delete")}
    </Button>
  );
}

export function OutcomeForm({ trade }: { trade: Trade }) {
  const { t } = useI18n();
  const toast = useToast();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [entry, setEntry] = useState(String(trade.entry_price ?? trade.planned_entry ?? ""));
  const [size, setSize] = useState(String(trade.size ?? trade.planned_size ?? ""));
  const [exit, setExit] = useState("");
  const [finalStop, setFinalStop] = useState(String(trade.final_stop ?? trade.initial_stop ?? ""));
  const [fees, setFees] = useState("");
  const [net, setNet] = useState("");
  const [openedAt, setOpenedAt] = useState(toLocalInput(trade.opened_at));
  const [closedAt, setClosedAt] = useState(() => toLocalInput(new Date().toISOString()));
  const [emotionAfter, setEmotionAfter] = useState<Emotion | null>(null);
  const [notes, setNotes] = useState(trade.notes ?? "");
  const [lesson, setLesson] = useState(trade.lesson ?? "");
  const [mounted, setMounted] = useState(false);
  // Dates are shown in the browser's time zone: render after mount to avoid a hydration mismatch.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  const save = (patch: Partial<TradeInput>) =>
    start(async () => {
      const res = await saveTradeAction({ ...toInput(trade), ...patch }, trade.id);
      if (res.ok) {
        toast(t("common.saved"));
        router.refresh();
      } else toast(res.error === "demo" ? t("common.demoReadOnly") : (res.message ?? t("common.error")), "error");
    });

  const close = () =>
    save({
      status: "closed",
      entry_price: n(entry),
      size: n(size),
      exit_price: n(exit),
      final_stop: n(finalStop),
      fees: n(fees) ?? 0,
      pnl_override: n(net),
      opened_at: new Date(openedAt).toISOString(),
      closed_at: new Date(closedAt).toISOString(),
      emotion_after: emotionAfter,
      notes: notes || null,
      lesson: lesson || null,
    });

  if (!mounted) return <div className="h-64" />;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={t("trade.entry")} htmlFor="o-entry">
          <Input id="o-entry" type="number" step="any" value={entry} onChange={(e) => setEntry(e.target.value)} className="num" />
        </Field>
        <Field label={t("trade.size")} htmlFor="o-size">
          <Input id="o-size" type="number" step="any" value={size} onChange={(e) => setSize(e.target.value)} className="num" />
        </Field>
        <Field label={t("plan.exit")} htmlFor="o-exit">
          <Input id="o-exit" type="number" step="any" value={exit} onChange={(e) => setExit(e.target.value)} className="num" />
        </Field>
        <Field label={t("plan.finalStop")} htmlFor="o-fstop" hint={t("plan.finalStopHint")}>
          <Input id="o-fstop" type="number" step="any" value={finalStop} onChange={(e) => setFinalStop(e.target.value)} className="num" />
        </Field>
        <Field label={t("plan.fees")} htmlFor="o-fees">
          <Input id="o-fees" type="number" step="any" value={fees} onChange={(e) => setFees(e.target.value)} placeholder="0" className="num" />
        </Field>
        <Field label={t("plan.netOverride")} htmlFor="o-net" hint={t("plan.netOverrideHint")}>
          <Input id="o-net" type="number" step="any" value={net} onChange={(e) => setNet(e.target.value)} className="num" />
        </Field>
        <Field label={t("plan.openedAt")} htmlFor="o-open">
          <Input id="o-open" type="datetime-local" value={openedAt} onChange={(e) => setOpenedAt(e.target.value)} />
        </Field>
        <Field label={t("plan.closedAt")} htmlFor="o-close">
          <Input id="o-close" type="datetime-local" value={closedAt} onChange={(e) => setClosedAt(e.target.value)} />
        </Field>
      </div>
      <EmotionPicker value={emotionAfter} onChange={setEmotionAfter} label={t("plan.emotionAfter")} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("plan.notes")} htmlFor="o-notes">
          <Textarea id="o-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
        </Field>
        <Field label={t("plan.lesson")} htmlFor="o-lesson">
          <Textarea id="o-lesson" value={lesson} onChange={(e) => setLesson(e.target.value)} rows={3} />
        </Field>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={close} disabled={pending || (n(exit) == null && n(net) == null)}>
          {pending ? t("common.saving") : t("trade.recordOutcome")}
        </Button>
        {trade.status === "planned" && (
          <Button variant="secondary" disabled={pending} onClick={() => save({ status: "open", entry_price: n(entry), size: n(size), final_stop: trade.initial_stop, opened_at: new Date().toISOString() })}>
            {t("trade.markOpen")}
          </Button>
        )}
        <Button variant="ghost" disabled={pending} onClick={() => save({ status: "cancelled" })}>
          {t("trade.cancelPlan")}
        </Button>
      </div>
    </div>
  );
}
