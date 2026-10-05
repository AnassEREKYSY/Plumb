import Link from "next/link";
import { cn } from "@/lib/cn";
import type { TFn } from "@/lib/i18n/translate";
import type { Period } from "@/lib/period";

export function PeriodTabs({ value, t, base, extra = {} }: { value: Period; t: TFn; base: string; extra?: Record<string, string> }) {
  const opts: { v: Period; label: string }[] = [
    { v: "7", label: t("common.d7") },
    { v: "30", label: t("common.d30") },
    { v: "90", label: t("common.d90") },
    { v: "all", label: t("common.allTime") },
  ];
  return (
    <nav aria-label={t("common.period")} className="inline-flex rounded-md border border-line-strong bg-surface-2 p-0.5">
      {opts.map((o) => (
        <Link
          key={o.v}
          scroll={false}
          href={{ pathname: base, query: { ...extra, p: o.v } }}
          aria-current={value === o.v ? "page" : undefined}
          className={cn(
            "grid h-7 min-w-11 place-items-center rounded-[5px] px-2.5 text-[12.5px] font-medium transition-colors",
            value === o.v ? "bg-surface text-ink shadow-[0_1px_2px_rgba(0,0,0,0.08)] ring-1 ring-line" : "text-muted hover:text-ink",
          )}
        >
          {o.label}
        </Link>
      ))}
    </nav>
  );
}
