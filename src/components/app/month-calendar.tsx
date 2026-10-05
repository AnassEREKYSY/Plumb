import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Money } from "@/components/ui/money";
import { cn } from "@/lib/cn";
import { fmtDate } from "@/lib/format";
import type { Locale } from "@/lib/i18n/config";
import type { TFn } from "@/lib/i18n/translate";

export function MonthCalendar({
  month,
  days,
  currency,
  t,
  locale,
  today,
  query,
}: {
  month: string; // yyyy-mm
  days: Map<string, { pnl: number; count: number; broken: number }>;
  currency: string;
  t: TFn;
  locale: Locale;
  today: string;
  query: Record<string, string>;
}) {
  const [y, m] = month.split("-").map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1));
  const daysIn = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const lead = (first.getUTCDay() + 6) % 7;
  const cells: (string | null)[] = [...Array(lead).fill(null)];
  for (let d = 1; d <= daysIn; d++) cells.push(`${month}-${String(d).padStart(2, "0")}`);
  while (cells.length % 7) cells.push(null);
  const prev = new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 7);
  const next = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 7);

  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  const monthTotal = [...days.entries()].filter(([k]) => k.startsWith(month)).reduce((s, [, v]) => s + v.pnl, 0);

  return (
    <div>
      <div className="flex items-center justify-between px-5 py-3">
        <div className="flex items-center gap-1">
          <Link href={{ query: { ...query, view: "calendar", month: prev } }} scroll={false} className="grid size-8 place-items-center rounded-md text-muted hover:bg-surface-2 hover:text-ink" aria-label="prev">
            <ChevronLeft className="size-4" />
          </Link>
          <h3 className="w-40 text-center text-[15px] font-semibold text-ink first-letter:uppercase">{fmtDate(first.toISOString(), locale, { month: "long", year: "numeric" }, "UTC")}</h3>
          <Link href={{ query: { ...query, view: "calendar", month: next } }} scroll={false} className="grid size-8 place-items-center rounded-md text-muted hover:bg-surface-2 hover:text-ink" aria-label="next">
            <ChevronRight className="size-4" />
          </Link>
        </div>
        <Money value={monthTotal} currency={currency} className="text-[15px] font-semibold" />
      </div>
      <div className="grid grid-cols-[repeat(7,minmax(0,1fr))_minmax(0,0.9fr)] border-t border-line text-[11.5px] text-muted">
        {(["d0", "d1", "d2", "d3", "d4", "d5", "d6"] as const).map((d) => (
          <div key={d} className="border-r border-line px-2 py-1.5">
            {t(`weekdays.${d}`)}
          </div>
        ))}
        <div className="px-2 py-1.5 text-right">Σ</div>
      </div>
      {weeks.map((w, wi) => {
        const total = w.reduce((s, d) => s + (d ? (days.get(d)?.pnl ?? 0) : 0), 0);
        const count = w.reduce((s, d) => s + (d ? (days.get(d)?.count ?? 0) : 0), 0);
        return (
          <div key={wi} className="grid grid-cols-[repeat(7,minmax(0,1fr))_minmax(0,0.9fr)] border-t border-line">
            {w.map((d, di) => {
              const v = d ? days.get(d) : undefined;
              return (
                <div
                  key={di}
                  className={cn(
                    "relative min-h-[84px] border-r border-line p-2",
                    !d && "bg-surface-2/50",
                    v && (v.pnl >= 0 ? "bg-gain-tint/70" : "bg-loss-tint/70"),
                  )}
                >
                  {d && (
                    <>
                      <div className={cn("text-[12px]", d === today ? "inline-grid size-5 place-items-center rounded-full bg-plum font-medium text-on-plum" : "text-muted")}>
                        {Number(d.slice(8))}
                      </div>
                      {v && (
                        <div className="mt-2">
                          <Money value={v.pnl} currency={currency} className="block text-[13px] font-semibold" />
                          <div className="mt-0.5 text-[11px] text-muted">
                            {v.count} {t("common.trades")}
                          </div>
                          {v.broken > 0 && <span className="absolute top-2 right-2 size-[6px] rounded-full bg-ochre" title={t("journal.brokenCount", { n: v.broken })} />}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
            <div className="flex flex-col items-end justify-center p-2">
              {count > 0 && (
                <>
                  <Money value={total} currency={currency} className="text-[13px] font-semibold" />
                  <span className="text-[11px] text-muted">
                    {count} {t("common.trades")}
                  </span>
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
