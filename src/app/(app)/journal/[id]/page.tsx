import { ArrowLeft, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TradeLadder } from "@/components/charts/trade-ladder";
import { RuleLine } from "@/components/app/plan-form";
import { DeleteTradeButton, OutcomeForm } from "@/components/app/trade-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { Money, RValue } from "@/components/ui/money";
import { checkTrades, plannedRR, plannedRiskAmount, riskAmount, stopWidened } from "@/lib/calc";
import { cn } from "@/lib/cn";
import { getWorkspace } from "@/lib/data";
import { fmtDate, fmtMoney, fmtNum, fmtPct, fmtPrice, fmtTime } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";
import { findInstrument } from "@/lib/instruments";

export default async function TradePage(props: PageProps<"/journal/[id]">) {
  const { id } = await props.params;
  const { t, locale } = await getI18n();
  const ws = await getWorkspace();
  const trade = ws.trades.find((x) => x.id === id);
  if (!trade) notFound();

  const account = ws.accounts.find((a) => a.id === trade.account_id)!;
  const tz = account?.timezone ?? "Europe/Paris";
  const currency = account?.currency ?? "EUR";
  const setup = ws.setups.find((s) => s.id === trade.setup_id);
  const checked = checkTrades(ws.trades.filter((x) => x.account_id === trade.account_id), ws.rules, ws.accounts).find((c) => c.trade.id === id);
  const applicable = ws.rules.filter((r) => r.active && (r.account_id == null || r.account_id === trade.account_id));
  const decimals = findInstrument(trade.symbol)?.decimals;
  const p = (v: number | null) => fmtPrice(v, locale, decimals);

  const pRisk = plannedRiskAmount(trade);
  const aRisk = riskAmount(trade);
  const pRR = plannedRR(trade);
  const aRR =
    trade.entry_price != null && trade.exit_price != null && trade.initial_stop != null && trade.entry_price !== trade.initial_stop
      ? ((trade.exit_price - trade.entry_price) * (trade.direction === "long" ? 1 : -1)) / Math.abs(trade.entry_price - trade.initial_stop)
      : null;
  const moved = stopWidened(trade);
  const sizeChanged = trade.planned_size != null && trade.size != null && Math.abs(trade.planned_size - trade.size) > 1e-9;
  const held =
    trade.closed_at != null ? Math.round((new Date(trade.closed_at).getTime() - new Date(trade.opened_at).getTime()) / 60000) : null;
  const heldStr = held == null ? "—" : held >= 60 * 24 ? `${Math.floor(held / 1440)} d ${Math.floor((held % 1440) / 60)} h` : held >= 60 ? `${Math.floor(held / 60)} h ${String(held % 60).padStart(2, "0")}` : `${held} min`;
  const isClosed = trade.status === "closed";

  const rows: { label: string; planned: string; actual: string; diff?: boolean }[] = [
    { label: t("trade.entry"), planned: p(trade.planned_entry), actual: p(trade.entry_price), diff: trade.planned_entry != null && trade.entry_price != null && trade.planned_entry !== trade.entry_price },
    { label: t("trade.stop"), planned: p(trade.initial_stop), actual: p(trade.final_stop), diff: moved },
    { label: t("trade.target"), planned: p(trade.target), actual: isClosed ? `${t("trade.exit")} ${p(trade.exit_price)}` : "—" },
    { label: t("trade.size"), planned: trade.planned_size != null ? fmtNum(trade.planned_size, locale, 2) : "—", actual: trade.size != null ? fmtNum(trade.size, locale, 2) : "—", diff: sizeChanged },
    { label: t("trade.risk"), planned: pRisk != null ? fmtMoney(pRisk, currency, locale, { decimals: 0 }) : "—", actual: aRisk != null ? fmtMoney(aRisk, currency, locale, { decimals: 0 }) : "—" },
    { label: t("trade.ratio"), planned: pRR != null ? `1:${fmtNum(pRR, locale, 2)}` : "—", actual: aRR != null ? fmtNum(aRR, locale, 2, true) + "R" : "—" },
  ];

  return (
    <>
      <Link href="/journal" className="mb-5 inline-flex items-center gap-1.5 text-[13px] text-muted hover:text-ink">
        <ArrowLeft className="size-3.5" /> {t("journal.title")}
      </Link>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge tone={trade.direction === "long" ? "gain" : "loss"}>{trade.direction === "long" ? "▲" : "▼"} {t(`common.${trade.direction}`)}</Badge>
            <Badge tone={isClosed ? "neutral" : "mauve"}>{t(`status.${trade.status}`)}</Badge>
            {setup && (
              <Badge tone="outline">
                <span className="size-1.5 rounded-full" style={{ background: setup.color ?? "var(--mauve)" }} />
                {setup.name}
              </Badge>
            )}
          </div>
          <h1 className="font-display text-[30px] leading-none text-ink">{trade.symbol}</h1>
          <p className="mt-2 text-[13px] text-muted">
            <span className="inline-block first-letter:uppercase">{fmtDate(trade.opened_at, locale, { weekday: "long", day: "numeric", month: "long", year: "numeric" }, tz)}</span> · {fmtTime(trade.opened_at, locale, tz)} · {account?.name} · {t(`markets.${trade.market}`)}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {isClosed && (
            <div className="text-right">
              <Money value={checked?.pnl ?? 0} currency={currency} className="font-display text-[30px] leading-none" />
              <div className="mt-1">
                <RValue value={checked?.r ?? null} className="text-[13px] font-medium" />
              </div>
            </div>
          )}
          <DeleteTradeButton id={trade.id} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-8">
          <Card>
            <CardHeader title={t("trade.planVsReality")} />
            {trade.planned_entry == null ? (
              <p className="px-5 pb-5 text-[13px] text-muted">{t("trade.noPlan")}</p>
            ) : (
              <div className="grid gap-2 px-5 pb-5 md:grid-cols-[1fr_250px] md:gap-6">
                <div>
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="border-b border-line text-left text-[11.5px] text-muted">
                        <th className="pb-2 font-medium" />
                        <th className="pb-2 text-right font-medium">{t("trade.planned")}</th>
                        <th className="pb-2 text-right font-medium">{t("trade.actual")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {rows.map((r) => (
                        <tr key={r.label}>
                          <td className="py-2.5 text-ink-2">{r.label}</td>
                          <td className="num py-2.5 text-right text-ink">{r.planned}</td>
                          <td className={cn("num py-2.5 text-right", r.diff ? "font-semibold text-ochre" : "text-ink")}>{r.actual}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {(moved || sizeChanged) && (
                    <div className="mt-4 space-y-2">
                      {moved && (
                        <p className="flex items-start gap-2 rounded-md bg-ochre-tint px-3 py-2.5 text-[13px] text-ink">
                          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-ochre" />
                          {t("trade.stopMoved", { planned: p(trade.initial_stop), final: p(trade.final_stop) })}
                        </p>
                      )}
                      {sizeChanged && (
                        <p className="flex items-start gap-2 rounded-md bg-surface-2 px-3 py-2.5 text-[13px] text-ink-2">
                          {t("trade.sizeChanged", { planned: fmtNum(trade.planned_size!, locale, 2), actual: fmtNum(trade.size!, locale, 2) })}
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <TradeLadder
                  direction={trade.direction}
                  entry={trade.entry_price ?? trade.planned_entry}
                  stop={trade.initial_stop}
                  target={trade.target}
                  exit={trade.exit_price}
                  finalStop={trade.final_stop}
                  decimals={decimals}
                  height={250}
                />
              </div>
            )}
          </Card>

          {!isClosed && trade.status !== "cancelled" && (
            <Card>
              <CardHeader title={t("trade.recordOutcome")} hint={t("trade.recordHint")} />
              <div className="px-5 pb-5">
                <OutcomeForm trade={trade} />
              </div>
            </Card>
          )}

          <Card>
            <CardHeader title={t("trade.psychology")} />
            <div className="grid gap-5 px-5 pb-5 sm:grid-cols-2">
              <Block label={t("trade.before")}>
                {trade.emotion_before ? <Badge tone="mauve">{t(`emotions.${trade.emotion_before}`)}</Badge> : <span className="text-muted">—</span>}
              </Block>
              <Block label={t("trade.after")}>
                {trade.emotion_after ? <Badge tone="mauve">{t(`emotions.${trade.emotion_after}`)}</Badge> : <span className="text-muted">—</span>}
              </Block>
              {trade.reason && <Block label={t("trade.reason")} wide>{trade.reason}</Block>}
              {setup && setup.checklist.length > 0 && (
                <Block label={t("trade.checklist")} wide>
                  <ul className="space-y-1">
                    {setup.checklist.map((item) => {
                      const ok = trade.checklist_done.includes(item);
                      return (
                        <li key={item} className={cn("flex items-center gap-2", ok ? "text-ink" : "text-muted line-through decoration-line-strong")}>
                          <span className={cn("size-1.5 rounded-full", ok ? "bg-gain" : "bg-line-strong")} />
                          {item}
                        </li>
                      );
                    })}
                  </ul>
                </Block>
              )}
              {trade.notes && (
                <Block label={t("trade.notes")} wide>
                  <p className="border-l-2 border-mauve/40 pl-3 text-[14px] leading-relaxed text-ink">{trade.notes}</p>
                </Block>
              )}
              {trade.lesson && <Block label={t("trade.lesson")} wide>{trade.lesson}</Block>}
              {trade.tags.length > 0 && (
                <Block label={t("plan.tags")} wide>
                  <div className="flex flex-wrap gap-1.5">
                    {trade.tags.map((tag) => (
                      <Badge key={tag} tone="outline">
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                </Block>
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-4 lg:col-span-4">
          {isClosed && (
            <Card>
              <CardHeader title={t("trade.result")} />
              <dl className="divide-y divide-line border-t border-line text-[13px]">
                <Row label={t("trade.net")}>
                  <Money value={checked?.pnl ?? 0} currency={currency} className="font-semibold" />
                </Row>
                <Row label={t("trade.rMultiple")}>
                  <RValue value={checked?.r ?? null} className="font-semibold" />
                </Row>
                <Row label={t("trade.fees")}>
                  <span className="num text-ink">{fmtMoney(trade.fees, currency, locale)}</span>
                </Row>
                <Row label={t("trade.riskPct")}>
                  <span className="num text-ink">{fmtPct(checked?.riskPct != null ? checked.riskPct / 100 : null, locale, 2)}</span>
                </Row>
                <Row label={t("trade.held")}>
                  <span className="num text-ink">{heldStr}</span>
                </Row>
              </dl>
            </Card>
          )}
          <Card>
            <CardHeader title={t("trade.rulesTitle")} hint={checked && checked.violations.length === 0 && isClosed ? t("trade.allRespected") : undefined} />
            <ul className="space-y-2.5 px-5 pb-5">
              {applicable.map((rule) => (
                <RuleLine
                  key={rule.id}
                  kind={rule.kind}
                  params={rule.params}
                  violation={checked?.violations.find((v) => v.ruleId === rule.id)?.detail ?? null}
                  skipped={!checked || (rule.kind === "no_stop_widening" && trade.final_stop == null)}
                />
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}

function Block({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={cn("text-[13.5px] leading-relaxed text-ink", wide && "sm:col-span-2")}>
      <div className="mb-1.5 text-[12px] font-medium text-muted">{label}</div>
      {children}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-5 py-2.5">
      <dt className="text-ink-2">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
