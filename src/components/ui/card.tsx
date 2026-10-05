import { cn } from "@/lib/cn";
import type { ComponentProps, ReactNode } from "react";

export function Card({ className, ...p }: ComponentProps<"section">) {
  return <section className={cn("rounded-xl border border-line bg-surface shadow-card", className)} {...p} />;
}

export function CardHeader({
  title,
  hint,
  action,
  className,
}: {
  title: ReactNode;
  hint?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("flex items-start justify-between gap-4 px-5 pt-5 pb-3", className)}>
      <div className="min-w-0">
        <h2 className="text-[14px] font-semibold tracking-[-0.01em] text-ink">{title}</h2>
        {hint ? <p className="mt-0.5 text-[12.5px] leading-snug text-muted">{hint}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

export function Label({ className, ...p }: ComponentProps<"span">) {
  return <span className={cn("text-[12.5px] font-medium text-muted", className)} {...p} />;
}
