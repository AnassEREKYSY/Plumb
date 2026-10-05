"use client";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState, useTransition } from "react";
import { setLocaleAction } from "@/app/actions";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n/client";
import type { Locale } from "@/lib/i18n/config";

export function ThemeSwitch({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const { t } = useI18n();
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);
  const opts = [
    { v: "light", icon: Sun, label: t("theme.light") },
    { v: "dark", icon: Moon, label: t("theme.dark") },
    { v: "system", icon: Monitor, label: t("theme.system") },
  ];
  return (
    <div role="radiogroup" aria-label={t("theme.toggle")} className={cn("inline-flex rounded-md border border-line bg-surface-2 p-0.5", className)}>
      {opts.map(({ v, icon: Icon, label }) => {
        const on = mounted && theme === v;
        return (
          <button
            key={v}
            type="button"
            role="radio"
            aria-checked={on}
            title={label}
            onClick={() => setTheme(v)}
            className={cn(
              "grid h-7 w-8 place-items-center rounded-[5px] transition-colors",
              on ? "bg-surface text-ink shadow-[0_1px_2px_rgba(0,0,0,0.08)] ring-1 ring-line" : "text-muted hover:text-ink",
            )}
          >
            <Icon className="size-3.5" strokeWidth={1.8} />
            <span className="sr-only">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function LocaleSwitch({ className }: { className?: string }) {
  const { locale, t } = useI18n();
  const [pending, start] = useTransition();
  const set = (l: Locale) => start(() => setLocaleAction(l));
  return (
    <div role="radiogroup" aria-label={t("locale.label")} className={cn("inline-flex rounded-md border border-line bg-surface-2 p-0.5", pending && "opacity-60", className)}>
      {(["en", "fr"] as const).map((l) => (
        <button
          key={l}
          type="button"
          role="radio"
          aria-checked={locale === l}
          title={t(`locale.${l}`)}
          aria-label={t(`locale.${l}`)}
          onClick={() => set(l)}
          className={cn(
            "h-7 rounded-[5px] px-2 text-[11.5px] font-semibold tracking-wide uppercase transition-colors",
            locale === l ? "bg-surface text-ink shadow-[0_1px_2px_rgba(0,0,0,0.08)] ring-1 ring-line" : "text-muted hover:text-ink",
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
