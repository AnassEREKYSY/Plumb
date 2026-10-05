"use client";
import { cn } from "@/lib/cn";
import { fmtDate, fmtMoney } from "@/lib/format";
import { useI18n } from "@/lib/i18n/client";

/** Weekdays (rows) × weeks (columns). Colour intensity = result, ochre ring = a rule was broken. */
export function WeekHeatmap({
  days,
  weeks = 13,
  currency,
  today,
}: {
  days: Record<string, { pnl: number; count: number; broken: number }>;
  weeks?: number;
  currency: string;
  today: string; // yyyy-mm-dd
}) {
  const { t, locale } = useI18n();
  const end = new Date(`${today}T12:00:00Z`);
  const dow = (end.getUTCDay() + 6) % 7; // 0 = Monday
  const monday = new Date(end.getTime() - dow * 86400_000);
  const first = new Date(monday.getTime() - (weeks - 1) * 7 * 86400_000);
  const max = Math.max(1, ...Object.values(days).map((d) => Math.abs(d.pnl)));

  const cols: { key: string; date: Date }[][] = [];
  for (let w = 0; w < weeks; w++) {
    const col = [];
    for (let d = 0; d < 5; d++) {
      const date = new Date(first.getTime() + (w * 7 + d) * 86400_000);
      col.push({ key: date.toISOString().slice(0, 10), date });
    }
    cols.push(col);
  }
  const wd = ["d0", "d1", "d2", "d3", "d4"] as const;

  return (
    <div className="flex gap-2">
      <div className="flex flex-col justify-between py-[3px] pt-5 text-[10.5px] text-muted">
        {wd.map((k) => (
          <span key={k} className="h-[18px] leading-[18px]">
            {t(`weekdays.${k}`)}
          </span>
        ))}
      </div>
      <div className="grid flex-1 gap-[5px]" style={{ gridTemplateColumns: `repeat(${weeks}, minmax(0, 1fr))` }}>
        {cols.map((col, ci) => (
          <div key={ci} className="flex flex-col gap-[5px]">
            <span className="h-[15px] truncate text-[10.5px] text-muted">
              {col[0].date.getUTCDate() <= 7 ? fmtDate(col[0].date.toISOString(), locale, { month: "short" }, "UTC") : ""}
            </span>
            {col.map(({ key, date }) => {
              const d = days[key];
              const future = key > today;
              const a = d ? 0.22 + 0.78 * Math.min(1, Math.abs(d.pnl) / max) : 0;
              const tip = d
                ? `${fmtDate(date.toISOString(), locale, { weekday: "short", day: "numeric", month: "short" }, "UTC")} · ${fmtMoney(d.pnl, currency, locale, { sign: true })} · ${d.count} ${t("common.trades")}`
                : fmtDate(date.toISOString(), locale, { weekday: "short", day: "numeric", month: "short" }, "UTC");
              return (
                <div
                  key={key}
                  title={tip}
                  className={cn(
                    "relative h-[18px] rounded-[3px]",
                    future ? "bg-transparent" : d ? "" : "bg-surface-2",
                    key === today && !d ? "ring-1 ring-line-strong" : "",
                  )}
                  style={d ? { background: `color-mix(in oklab, ${d.pnl >= 0 ? "var(--gain)" : "var(--loss)"} ${Math.round(a * 100)}%, var(--surface))` } : undefined}
                >
                  {d?.broken ? <span className="absolute top-[3px] right-[3px] size-[5px] rounded-full bg-ochre ring-1 ring-surface" /> : null}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
