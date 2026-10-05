"use client";
import { cn } from "@/lib/cn";
import { fmtMoney, fmtR } from "@/lib/format";
import { useI18n } from "@/lib/i18n/client";

export function Money({
  value,
  currency,
  sign = true,
  className,
  compact,
  neutral,
  decimals,
}: {
  value: number;
  currency: string;
  sign?: boolean;
  className?: string;
  compact?: boolean;
  neutral?: boolean;
  decimals?: number;
}) {
  const { locale } = useI18n();
  return (
    <span className={cn("num", !neutral && (value > 0 ? "text-gain" : value < 0 ? "text-loss" : "text-muted"), className)}>
      {fmtMoney(value, currency, locale, { sign, compact, decimals })}
    </span>
  );
}

export function RValue({ value, className }: { value: number | null; className?: string }) {
  const { locale } = useI18n();
  return (
    <span className={cn("num", value == null ? "text-muted" : value > 0 ? "text-gain" : value < 0 ? "text-loss" : "text-muted", className)}>
      {fmtR(value, locale)}
    </span>
  );
}
