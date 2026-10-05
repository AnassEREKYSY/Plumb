"use client";
import { useState } from "react";
import { useWidth } from "@/components/ui/use-width";
import { cn } from "@/lib/cn";

export interface Bar {
  label: string;
  value: number;
  sub?: string;
  muted?: boolean;
  tone?: "gain" | "loss" | "mauve";
}

/** Vertical bars around a zero line. Positive = gain, negative = loss. */
export function Bars({ bars, height = 180, format }: { bars: Bar[]; height?: number; format: (v: number) => string }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const padT = 14,
    padB = 22;
  const ih = height - padT - padB;
  const max = Math.max(...bars.map((b) => b.value), 0);
  const min = Math.min(...bars.map((b) => b.value), 0);
  const span = max - min || 1;
  const y = (v: number) => padT + ((max - v) / span) * ih;
  const bw = width / Math.max(1, bars.length);
  const zero = y(0);
  const step = bars.length > 14 ? Math.ceil(bars.length / 12) : 1;

  return (
    <div ref={ref} className="relative">
      <svg width={width} height={height} className="block">
        <line x1={0} x2={width} y1={zero} y2={zero} stroke="var(--line-strong)" />
        {bars.map((b, i) => {
          const top = Math.min(y(b.value), zero);
          const h = Math.max(1, Math.abs(y(b.value) - zero));
          return (
            <g key={i} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)}>
              <rect x={i * bw} y={0} width={bw} height={height} fill="transparent" />
              <rect
                x={i * bw + bw * 0.18}
                y={top}
                width={bw * 0.64}
                height={h}
                rx={1.5}
                fill={b.tone ? `var(--${b.tone})` : b.value >= 0 ? "var(--gain)" : "var(--loss)"}
                opacity={b.muted ? 0.35 : hover == null || hover === i ? 1 : 0.55}
              />
              {i % step === 0 && (
                <text x={i * bw + bw / 2} y={height - 6} textAnchor="middle" className="fill-muted text-[10.5px]">
                  {b.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      {hover != null && (
        <div
          className={cn("pointer-events-none absolute top-0 rounded-md border border-line bg-surface px-2 py-1 text-[12px] shadow-float")}
          style={{ left: Math.min(Math.max(hover * bw + bw / 2 - 50, 0), width - 110) }}
        >
          <div className="text-muted">{bars[hover].label}</div>
          <div className="num font-medium text-ink">{format(bars[hover].value)}</div>
          {bars[hover].sub ? <div className="text-muted">{bars[hover].sub}</div> : null}
        </div>
      )}
    </div>
  );
}
