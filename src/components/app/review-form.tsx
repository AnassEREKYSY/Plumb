"use client";
import { useState, useTransition } from "react";
import { saveReviewAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n/client";
import type { Review } from "@/lib/types";

export function ReviewForm({ weekStart, review }: { weekStart: string; review: Review | null }) {
  const { t } = useI18n();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [a, setA] = useState(review?.went_well ?? "");
  const [b, setB] = useState(review?.to_improve ?? "");
  const [c, setC] = useState(review?.focus_next ?? "");

  const q = (n: string, label: string, ph: string, v: string, set: (s: string) => void) => (
    <label className="block">
      <span className="mb-2 flex items-baseline gap-2.5">
        <span className="num text-[12px] font-medium text-muted">{n}</span>
        <span className="text-[15px] font-semibold text-ink">{label}</span>
      </span>
      <Textarea value={v} onChange={(e) => set(e.target.value)} placeholder={ph} rows={3} className="text-[14px]" />
    </label>
  );

  return (
    <div className="space-y-5">
      {q("01", t("review.q1"), t("review.q1Placeholder"), a, setA)}
      {q("02", t("review.q2"), t("review.q2Placeholder"), b, setB)}
      {q("03", t("review.q3"), t("review.q3Placeholder"), c, setC)}
      <Button
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await saveReviewAction({ week_start: weekStart, went_well: a || null, to_improve: b || null, focus_next: c || null });
            toast(res.ok ? t("common.saved") : res.error === "demo" ? t("common.demoReadOnly") : t("common.error"), res.ok ? "neutral" : "error");
          })
        }
      >
        {pending ? t("common.saving") : t("review.saveReview")}
      </Button>
    </div>
  );
}
