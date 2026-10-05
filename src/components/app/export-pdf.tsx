"use client";
import { Check, FileDown, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n/client";
import type { Period } from "@/lib/period";

/** Button + dialog that downloads the journal of the current account as a PDF report. */
export function ExportPdfButton({ defaultPeriod = "90", variant = "secondary", className }: { defaultPeriod?: Period; variant?: "primary" | "secondary"; className?: string }) {
  const { t } = useI18n();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [period, setPeriod] = useState<Period>(defaultPeriod);
  const [include, setInclude] = useState({ trades: true, notes: true, reviews: true });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, busy]);

  const download = async () => {
    setBusy(true);
    try {
      const q = new URLSearchParams({
        p: period,
        trades: include.trades ? "1" : "0",
        notes: include.notes ? "1" : "0",
        reviews: include.reviews ? "1" : "0",
      });
      const res = await fetch(`/api/export/pdf?${q}`);
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      const name = /filename="([^"]+)"/.exec(res.headers.get("Content-Disposition") ?? "")?.[1] ?? "plumb-journal.pdf";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      setOpen(false);
    } catch {
      toast(t("pdf.failed"), "error");
    } finally {
      setBusy(false);
    }
  };

  const options: { key: keyof typeof include; label: string }[] = [
    { key: "trades", label: t("pdf.includeTrades") },
    { key: "notes", label: t("pdf.includeNotes") },
    { key: "reviews", label: t("pdf.includeReviews") },
  ];

  return (
    <>
      <Button variant={variant} size="sm" className={className} onClick={() => setOpen(true)}>
        <FileDown className="size-4" strokeWidth={1.8} />
        {t("pdf.button")}
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-ink/25 p-0 sm:place-items-center sm:p-4" onClick={() => !busy && setOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="export-title"
            className="page-enter w-full max-w-md rounded-t-2xl border border-line bg-surface shadow-float sm:rounded-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 px-5 pt-5">
              <div>
                <h2 id="export-title" className="text-[16px] font-semibold text-ink">
                  {t("pdf.dialogTitle")}
                </h2>
                <p className="mt-1 text-[13px] leading-relaxed text-muted">{t("pdf.dialogHint")}</p>
              </div>
              <button onClick={() => setOpen(false)} disabled={busy} className="grid size-8 shrink-0 place-items-center rounded-md text-muted hover:bg-surface-2" aria-label={t("common.close")}>
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-5 px-5 py-5">
              <div>
                <div className="mb-2 text-[12.5px] font-medium text-ink-2">{t("common.period")}</div>
                <Segmented
                  value={period}
                  onChange={setPeriod}
                  className="w-full"
                  options={[
                    { value: "7", label: t("common.d7") },
                    { value: "30", label: t("common.d30") },
                    { value: "90", label: t("common.d90") },
                    { value: "all", label: t("common.allTime") },
                  ]}
                />
              </div>
              <ul className="space-y-1.5">
                {options.map(({ key, label }) => {
                  const on = include[key];
                  return (
                    <li key={key}>
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={on}
                        onClick={() => setInclude((s) => ({ ...s, [key]: !s[key] }))}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left text-[13.5px] transition-colors",
                          on ? "border-line-strong bg-surface text-ink" : "border-line text-muted hover:border-line-strong",
                        )}
                      >
                        <span className={cn("grid size-4 shrink-0 place-items-center rounded-[4px] border transition-colors", on ? "border-plum bg-plum text-on-plum" : "border-line-strong")}>
                          {on && <Check className="size-3" strokeWidth={3} />}
                        </span>
                        {label}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-4">
              <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
                {t("common.cancel")}
              </Button>
              <Button onClick={download} disabled={busy}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : <FileDown className="size-4" strokeWidth={1.8} />}
                {busy ? t("pdf.preparing") : t("pdf.download")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
