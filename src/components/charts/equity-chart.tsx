"use client";
import { useMemo, useState } from "react";
import { useWidth } from "@/components/ui/use-width";
import { fmtDate, fmtMoney } from "@/lib/format";
import { useI18n } from "@/lib/i18n/client";

export interface EquityPoint {
  t: string;
  equity: number;
  clean: number;
}

function niceTicks(min: number, max: number, count = 4) {
  const span = max - min || 1;
  const raw = span / count;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((s) => span / s <= count + 0.5) ?? raw;
  const start = Math.floor(min / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= max + step * 0.01; v += step) ticks.push(Number(v.toFixed(8)));
  return ticks;
}

export function EquityChart({
  points,
  start,
  currency,
  height = 280,
  tz = "Europe/Paris",
  compact = false,
}: {
  points: EquityPoint[];
  start: number;
  currency: string;
  height?: number;
  tz?: string;
  compact?: boolean;
}) {
  const { t, locale } = useI18n();
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const data = useMemo(() => [{ t: points[0]?.t ?? "", equity: start, clean: start }, ...points], [points, start]);
  const padL = 8,
    padR = compact ? 8 : 64,
    padT = 16,
    padB = compact ? 8 : 28;
  const W = width,
    H = height;
  const iw = W - padL - padR,
    ih = H - padT - padB;

  const vals = data.flatMap((d) => [d.equity, d.clean]);
  const lo = Math.min(...vals),
    hi = Math.max(...vals);
  const ticks = niceTicks(lo, hi);
  const yMin = Math.min(lo, ticks[0]),
    yMax = Math.max(hi, ticks[ticks.length - 1]);
  const x = (i: number) => padL + (data.length > 1 ? (i / (data.length - 1)) * iw : iw / 2);
  const y = (v: number) => padT + ih - ((v - yMin) / (yMax - yMin || 1)) * ih;

  const line = (k: "equity" | "clean") => data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d[k]).toFixed(1)}`).join("");
  const gapArea =
    data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d.clean).toFixed(1)}`).join("") +
    data
      .slice()
      .reverse()
      .map((d, j) => `L${x(data.length - 1 - j).toFixed(1)},${y(d.equity).toFixed(1)}`)
      .join("") +
    "Z";

  // Month labels
  const months: { i: number; label: string }[] = [];
  let lastM = "";
  data.forEach((d, i) => {
    if (!d.t) return;
    const m = d.t.slice(0, 7);
    if (m !== lastM) {
      months.push({ i, label: fmtDate(d.t, locale, { month: "short" }, tz) });
      lastM = m;
    }
  });

  const last = data[data.length - 1];
  const h = hover != null ? data[hover] : null;

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - r.left;
    const i = Math.round(((px - padL) / iw) * (data.length - 1));
    setHover(Math.max(1, Math.min(data.length - 1, i)));
  };

  if (points.length === 0) {
    return (
      <div ref={ref} style={{ height }} className="grid place-items-center rounded-md bg-surface-2/60 text-sm text-muted">
        {t("dashboard.noTrades")}
      </div>
    );
  }

  return (
    <div ref={ref} className="relative select-none">
      <svg width={W} height={H} onPointerMove={onMove} onPointerLeave={() => setHover(null)} className="block touch-none">
        <defs>
          <pattern id="gap-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="6" height="6" fill="var(--mauve-soft)" />
            <line x1="0" y1="0" x2="0" y2="6" stroke="var(--mauve)" strokeOpacity="0.35" strokeWidth="1.4" />
          </pattern>
        </defs>
        {!compact &&
          ticks.map((v) => (
            <g key={v}>
              <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} stroke="var(--line)" strokeDasharray={v === start ? "0" : "2 4"} />
              <text x={W - padR + 10} y={y(v) + 4} className="num fill-muted text-[11px]">
                {fmtMoney(v, currency, locale, { compact: true, decimals: 0 })}
              </text>
            </g>
          ))}
        {!compact &&
          months.map((m) => (
            <text key={m.i} x={x(m.i)} y={H - 8} className="fill-muted text-[11px]">
              {m.label}
            </text>
          ))}
        <path d={gapArea} fill="url(#gap-hatch)" />
        <path d={line("clean")} fill="none" stroke="var(--gain)" strokeWidth="1.6" strokeDasharray="5 4" strokeLinejoin="round" />
        <path d={line("equity")} fill="none" stroke="var(--plum)" strokeWidth="2.2" strokeLinejoin="round" className="draw-line" style={{ ["--len" as string]: 4000 }} />
        <circle cx={x(data.length - 1)} cy={y(last.equity)} r="3.5" fill="var(--plum)" />
        <circle cx={x(data.length - 1)} cy={y(last.clean)} r="3" fill="var(--surface)" stroke="var(--gain)" strokeWidth="1.6" />
        {h && hover != null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={padT} y2={padT + ih} stroke="var(--ink)" strokeOpacity="0.25" />
            <circle cx={x(hover)} cy={y(h.equity)} r="4" fill="var(--plum)" stroke="var(--surface)" strokeWidth="2" />
            <circle cx={x(hover)} cy={y(h.clean)} r="4" fill="var(--gain)" stroke="var(--surface)" strokeWidth="2" />
          </g>
        )}
      </svg>
      {h && hover != null && (
        <div
          className="pointer-events-none absolute top-2 z-10 w-48 rounded-md border border-line bg-surface p-2.5 text-[12px] shadow-float"
          style={{ left: Math.min(Math.max(x(hover) + 12, 0), W - 200) }}
        >
          <div className="mb-1.5 text-muted">{fmtDate(h.t, locale, { weekday: "short", day: "numeric", month: "short" }, tz)}</div>
          <Row color="var(--plum)" label={t("dashboard.equity")} value={fmtMoney(h.equity, currency, locale)} />
          <Row color="var(--gain)" label={t("dashboard.clean")} value={fmtMoney(h.clean, currency, locale)} dashed />
          <div className="mt-1.5 flex justify-between border-t border-line pt-1.5">
            <span className="text-muted">{t("dashboard.gap")}</span>
            <span className="num font-medium text-ink">{fmtMoney(h.clean - h.equity, currency, locale, { sign: true })}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ color, label, value, dashed }: { color: string; label: string; value: string; dashed?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2 py-0.5">
      <span className="flex items-center gap-1.5 text-ink-2">
        <svg width="14" height="4">
          <line x1="0" x2="14" y1="2" y2="2" stroke={color} strokeWidth="2" strokeDasharray={dashed ? "3 2" : undefined} />
        </svg>
        {label}
      </span>
      <span className="num font-medium text-ink">{value}</span>
    </div>
  );
}
