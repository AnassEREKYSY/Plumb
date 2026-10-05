import { cn } from "@/lib/cn";

/**
 * The Plumb mark: a plumb bob hanging from its line.
 * The bob uses currentColor; the tip is the sage accent.
 */
export function PlumbMark({ className, tip = "var(--gain)", swing = false }: { className?: string; tip?: string; swing?: boolean }) {
  return (
    <svg viewBox="0 0 40 96" className={cn("shrink-0", className)} aria-hidden="true" fill="none">
      <g className={swing ? "plumb-swing" : undefined}>
        <line x1="20" y1="1.2" x2="20" y2="34.6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        <rect x="13" y="36" width="14" height="6.2" rx="1.4" fill="currentColor" />
        <path d="M11.2 43.4 H28.8 L37.4 49.4 L23.8 84 H16.2 L2.6 49.4 Z" fill="currentColor" />
        <path d="M16.4 85.6 H23.6 L20 94.8 Z" fill={tip} />
      </g>
    </svg>
  );
}

export function Logo({ className, markClassName }: { className?: string; markClassName?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-plum", className)}>
      <PlumbMark className={cn("h-7 w-auto", markClassName)} />
      <span className="font-display text-[1.45rem] leading-none font-semibold text-ink" style={{ fontVariationSettings: '"opsz" 48' }}>
        Plumb
      </span>
    </span>
  );
}
