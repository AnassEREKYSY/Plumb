"use client";
import { useWidth } from "@/components/ui/use-width";
import { fmtPrice } from "@/lib/format";
import { useI18n } from "@/lib/i18n/client";

interface Level {
  key: string;
  price: number;
  label: string;
  color: string;
  dashed?: boolean;
  strong?: boolean;
}

/**
 * A vertical price ladder: the plan (target / entry / stop) as zones, and what really happened
 * (exit, moved stop) drawn on top. The plumb line in the middle is the plan.
 */
export function TradeLadder({
  direction,
  entry,
  stop,
  target,
  exit,
  finalStop,
  height = 230,
  decimals,
}: {
  direction: "long" | "short";
  entry: number | null;
  stop: number | null;
  target: number | null;
  exit?: number | null;
  finalStop?: number | null;
  height?: number;
  decimals?: number;
}) {
  const { t, locale } = useI18n();
  const [ref, width] = useWidth<HTMLDivElement>(320);

  if (entry == null || stop == null) {
    return (
      <div ref={ref} style={{ height }} className="paper-grid relative rounded-md border border-dashed border-line-strong">
        <div className="absolute inset-y-3 left-[36%] w-px bg-line-strong" />
        {[t("plan.ladderTarget"), t("plan.ladderEntry"), t("plan.ladderStop")].map((l, i) => (
          <div key={l} className="absolute left-[36%] flex -translate-x-[13px] items-center gap-3 text-[11.5px] text-muted" style={{ top: `${22 + i * 28}%` }}>
            <span className="h-px w-[26px] bg-line-strong" />
            {l}
          </div>
        ))}
      </div>
    );
  }

  const moved = finalStop != null && Math.abs(finalStop - stop) > 1e-12 ? finalStop : null;
  const prices = [entry, stop, target, exit, moved].filter((v): v is number => v != null);
  let lo = Math.min(...prices),
    hi = Math.max(...prices);
  const pad = (hi - lo || Math.abs(entry) * 0.002 || 1) * 0.14;
  lo -= pad;
  hi += pad;
  const padT = 10,
    padB = 10;
  const y = (p: number) => padT + ((hi - p) / (hi - lo)) * (height - padT - padB);

  const railX = Math.round(width * 0.36);
  const zoneW = 26;

  const levels: Level[] = [];
  if (target != null) levels.push({ key: "target", price: target, label: t("plan.ladderTarget"), color: "var(--gain)" });
  levels.push({ key: "entry", price: entry, label: t("plan.ladderEntry"), color: "var(--ink)", strong: true });
  levels.push({ key: "stop", price: stop, label: t("plan.ladderStop"), color: "var(--loss)" });
  const exitAtMoved = exit != null && moved != null && Math.abs(exit - moved) < Math.abs(entry) * 1e-6;
  if (moved != null && !exitAtMoved) levels.push({ key: "moved", price: moved, label: t("plan.ladderMoved"), color: "var(--loss)", dashed: true });
  if (exit != null)
    levels.push({ key: "exit", price: exit, label: exitAtMoved ? `${t("plan.ladderExit")} · ${t("plan.ladderMoved").toLowerCase()}` : t("plan.ladderExit"), color: "var(--plum)", strong: true });

  // Avoid label overlaps
  const sorted = [...levels].sort((a, b) => y(a.price) - y(b.price));
  const ly: Record<string, number> = {};
  let prev = -Infinity;
  for (const l of sorted) {
    const v = Math.max(y(l.price), prev + 15);
    ly[l.key] = v;
    prev = v;
  }

  const fmt = (p: number) => fmtPrice(p, locale, decimals);

  return (
    <div ref={ref}>
      <svg width={width} height={height} className="block overflow-visible">
        {/* plumb line */}
        <line x1={railX} x2={railX} y1={2} y2={height - 2} stroke="var(--line-strong)" strokeWidth="1" />
        {/* reward zone */}
        {target != null && (
          <rect x={railX - zoneW / 2} y={Math.min(y(entry), y(target))} width={zoneW} height={Math.abs(y(target) - y(entry))} fill="var(--gain)" opacity="0.16" rx="2" />
        )}
        {/* risk zone */}
        <rect x={railX - zoneW / 2} y={Math.min(y(entry), y(stop))} width={zoneW} height={Math.abs(y(stop) - y(entry))} fill="var(--loss)" opacity="0.16" rx="2" />
        {/* extra risk taken by moving the stop */}
        {moved != null && (
          <rect
            x={railX - zoneW / 2}
            y={Math.min(y(stop), y(moved))}
            width={zoneW}
            height={Math.abs(y(moved) - y(stop))}
            fill="none"
            stroke="var(--loss)"
            strokeDasharray="3 3"
            rx="2"
          />
        )}
        {levels.map((l) => (
          <g key={l.key}>
            <line
              x1={railX - zoneW / 2 - 8}
              x2={railX + zoneW / 2 + 8}
              y1={y(l.price)}
              y2={y(l.price)}
              stroke={l.color}
              strokeWidth={l.strong ? 2 : 1.5}
              strokeDasharray={l.dashed ? "4 3" : undefined}
            />
            {l.key === "exit" && (
              <path d={`M${railX},${y(l.price) - 5} l5,5 l-5,5 l-5,-5 z`} fill="var(--plum)" stroke="var(--surface)" strokeWidth="1.5" />
            )}
            <path
              d={`M${railX + zoneW / 2 + 10},${y(l.price)} L${railX + zoneW / 2 + 18},${ly[l.key]} L${railX + zoneW / 2 + 22},${ly[l.key]}`}
              fill="none"
              stroke="var(--line-strong)"
            />
            <text x={railX + zoneW / 2 + 26} y={ly[l.key] + 4} className="text-[11.5px]" fill="var(--muted)">
              {l.label}
            </text>
            <text x={width - 2} y={ly[l.key] + 4} textAnchor="end" className="num text-[12px] font-medium" fill={l.color}>
              {fmt(l.price)}
            </text>
          </g>
        ))}
        {/* direction arrow on the left */}
        <g transform={`translate(${railX - zoneW / 2 - 30}, ${y(entry)})`} className="text-muted">
          <path d={direction === "long" ? "M0,6 L6,-2 L12,6" : "M0,-6 L6,2 L12,-6"} fill="none" stroke="currentColor" strokeWidth="1.5" />
        </g>
      </svg>
    </div>
  );
}
