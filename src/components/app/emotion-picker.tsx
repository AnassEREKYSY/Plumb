"use client";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n/client";
import { EMOTIONS, type Emotion } from "@/lib/types";

export function EmotionPicker({ value, onChange, label }: { value: Emotion | null; onChange: (v: Emotion | null) => void; label: string }) {
  const { t } = useI18n();
  return (
    <fieldset>
      <legend className="mb-2 text-[12.5px] font-medium text-ink-2">{label}</legend>
      <div className="flex flex-wrap gap-1.5">
        {EMOTIONS.map((e) => (
          <button
            key={e}
            type="button"
            aria-pressed={value === e}
            onClick={() => onChange(value === e ? null : e)}
            className={cn(
              "h-8 rounded-full border px-3 text-[12.5px] transition-colors",
              value === e ? "border-plum bg-plum text-on-plum" : "border-line-strong bg-surface text-ink-2 hover:border-mauve hover:text-ink",
            )}
          >
            {t(`emotions.${e}`)}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
