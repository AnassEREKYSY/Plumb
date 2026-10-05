import Link from "next/link";
import { PageHeader } from "@/components/app/page-header";
import { SetupEditor } from "@/components/app/setup-editor";
import { Card } from "@/components/ui/card";
import { Money, RValue } from "@/components/ui/money";
import { checkTrades, computeStats, confidence } from "@/lib/calc";
import { cn } from "@/lib/cn";
import { getScope } from "@/lib/data";
import { fmtPct } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("playbook.title") };
}

export default async function PlaybookPage() {
  const { t, locale } = await getI18n();
  const { ws, accounts, trades, currency } = await getScope();
  const checked = checkTrades(trades, ws.rules, accounts);

  return (
    <>
      <PageHeader title={t("playbook.title")} intro={t("playbook.intro")} actions={<SetupEditor trigger="new" />} />
      {ws.setups.length === 0 ? (
        <Card className="px-6 py-14 text-center text-[14px] text-muted">{t("playbook.empty")}</Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {ws.setups.map((s) => {
            const mine = checked.filter((c) => c.trade.setup_id === s.id);
            const st = computeStats(mine);
            const conf = confidence(st.count);
            return (
              <Card key={s.id} className="flex flex-col overflow-hidden">
                <div className="h-1" style={{ background: s.color ?? "var(--mauve)" }} />
                <div className="flex items-start justify-between gap-3 px-5 pt-4">
                  <div>
                    <h2 className="font-display text-[1.35rem] leading-tight text-ink">{s.name}</h2>
                    {s.description && <p className="mt-1 text-[13px] leading-relaxed text-muted">{s.description}</p>}
                  </div>
                  <SetupEditor trigger="edit" setup={s} />
                </div>
                {s.checklist.length > 0 && (
                  <ol className="mx-5 mt-4 space-y-1.5 border-l border-line pl-4 text-[13px] text-ink-2">
                    {s.checklist.map((c, i) => (
                      <li key={i} className="relative">
                        <span className="num absolute -left-[26px] w-4 text-right text-[11px] text-muted">{i + 1}</span>
                        {c}
                      </li>
                    ))}
                  </ol>
                )}
                <div className="mt-auto pt-5">
                  <div className="grid grid-cols-4 border-t border-line text-[12px]">
                    <Stat label={t("analytics.trades")}>{st.count}</Stat>
                    <Stat label={t("analytics.winRateShort")}>{fmtPct(st.winRate, locale)}</Stat>
                    <Stat label={t("analytics.expR")}>
                      <RValue value={st.expectancyR} />
                    </Stat>
                    <Stat label={t("analytics.net")}>
                      <Money value={st.netPnl} currency={currency} compact />
                    </Stat>
                  </div>
                  <Link
                    href={`/journal?setup=${s.id}`}
                    className={cn("flex items-center gap-2 border-t border-line px-5 py-2.5 text-[12px] hover:bg-mauve-soft", conf.level === "none" || conf.level === "low" ? "text-ochre" : "text-muted")}
                  >
                    <span className={cn("size-1.5 rounded-full", conf.level === "none" || conf.level === "low" ? "bg-ochre" : "bg-gain")} />
                    {st.count === 0 ? t("playbook.noTrades") : t(`confidence.${conf.level}`, { n: st.count, missing: conf.missing })}
                  </Link>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-r border-line px-4 py-3 last:border-r-0">
      <div className="text-muted">{label}</div>
      <div className="num mt-1 text-[14.5px] font-semibold text-ink">{children}</div>
    </div>
  );
}
