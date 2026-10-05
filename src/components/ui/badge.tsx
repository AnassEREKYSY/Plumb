import { cn } from "@/lib/cn";
import type { ComponentProps } from "react";

type Tone = "neutral" | "gain" | "loss" | "mauve" | "ochre" | "outline";
const tones: Record<Tone, string> = {
  neutral: "bg-surface-2 text-ink-2",
  gain: "bg-gain-tint text-gain",
  loss: "bg-loss-tint text-loss",
  mauve: "bg-mauve-tint text-plum",
  ochre: "bg-ochre-tint text-ochre",
  outline: "border border-line-strong text-ink-2",
};

export function Badge({ tone = "neutral", className, ...p }: ComponentProps<"span"> & { tone?: Tone }) {
  return (
    <span
      className={cn("inline-flex h-[22px] items-center gap-1 rounded-[4px] px-1.5 text-[11.5px] font-medium whitespace-nowrap", tones[tone], className)}
      {...p}
    />
  );
}
