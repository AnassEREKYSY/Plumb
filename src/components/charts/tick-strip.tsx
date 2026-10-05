import { cn } from "@/lib/cn";

/** Last N trades as small bars: height = |R|, colour = result, dot = a rule was broken. */
export function TickStrip({
  items,
  className,
}: {
  items: { r: number | null; pnl: number; broken: boolean; id: string }[];
  className?: string;
}) {
  const max = Math.max(1, ...items.map((i) => Math.abs(i.r ?? 0)));
  return (
    <div className={cn("flex h-9 items-end gap-[3px]", className)}>
      {items.map((i) => {
        const h = Math.max(3, (Math.abs(i.r ?? (i.pnl ? 0.5 : 0)) / max) * 26);
        return (
          <div key={i.id} className="flex flex-1 flex-col items-center justify-end gap-[3px]">
            <div className={cn("w-full max-w-[6px] rounded-[1.5px]", i.pnl >= 0 ? "bg-gain" : "bg-loss")} style={{ height: h }} />
            <div className={cn("size-[4px] rounded-full", i.broken ? "bg-ochre" : "bg-transparent")} />
          </div>
        );
      })}
    </div>
  );
}
