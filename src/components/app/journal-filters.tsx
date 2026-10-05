"use client";
import { Search, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Select, inputClass } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n/client";
import { EMOTIONS, type Setup } from "@/lib/types";

export function JournalFilters({ setups }: { setups: Setup[] }) {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, start] = useTransition();

  const set = (k: string, v: string) => {
    const next = new URLSearchParams(sp.toString());
    if (v) next.set(k, v);
    else next.delete(k);
    start(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
  };
  const active = ["q", "result", "rules", "setup", "emotion", "after"].some((k) => sp.get(k));

  return (
    <div className={cn("flex flex-wrap items-center gap-2", pending && "opacity-70")}>
      <div className="relative w-full sm:w-52">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted" />
        <input
          defaultValue={sp.get("q") ?? ""}
          onChange={(e) => set("q", e.target.value.trim())}
          placeholder={t("journal.search")}
          className={cn(inputClass, "h-8 pl-8 text-[13px]")}
        />
      </div>
      <Select value={sp.get("result") ?? ""} onChange={(e) => set("result", e.target.value)} className="h-8 w-auto text-[13px]" aria-label={t("journal.filterResult")}>
        <option value="">{t("journal.filterResult")}</option>
        <option value="winners">{t("journal.winners")}</option>
        <option value="losers">{t("journal.losers")}</option>
      </Select>
      <Select value={sp.get("rules") ?? ""} onChange={(e) => set("rules", e.target.value)} className="h-8 w-auto text-[13px]" aria-label={t("journal.filterRules")}>
        <option value="">{t("journal.filterRules")}</option>
        <option value="ok">{t("journal.rulesOk")}</option>
        <option value="broken">{t("journal.rulesBroken")}</option>
      </Select>
      <Select value={sp.get("setup") ?? ""} onChange={(e) => set("setup", e.target.value)} className="h-8 w-auto max-w-48 text-[13px]" aria-label={t("journal.setup")}>
        <option value="">{t("journal.setup")}</option>
        {setups.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </Select>
      <Select value={sp.get("emotion") ?? ""} onChange={(e) => set("emotion", e.target.value)} className="h-8 w-auto text-[13px]" aria-label={t("journal.emotion")}>
        <option value="">{t("journal.emotion")}</option>
        {EMOTIONS.map((e) => (
          <option key={e} value={e}>
            {t(`emotions.${e}`)}
          </option>
        ))}
      </Select>
      {active && (
        <button
          onClick={() => {
            const next = new URLSearchParams();
            for (const k of ["p", "view", "month"]) if (sp.get(k)) next.set(k, sp.get(k)!);
            start(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
          }}
          className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-[12.5px] text-muted hover:bg-surface-2 hover:text-ink"
        >
          <X className="size-3.5" />
          {t("common.all")}
        </button>
      )}
    </div>
  );
}
