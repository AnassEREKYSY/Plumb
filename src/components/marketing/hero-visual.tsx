import { CircleAlert, Check, X } from "lucide-react";
import { EquityChart, type EquityPoint } from "@/components/charts/equity-chart";
import { PlumbMark } from "@/components/brand/logo";
import { Money } from "@/components/ui/money";
import type { TFn } from "@/lib/i18n/translate";

/** A composition of real Plumb components fed with the demo journal. */
export function HeroVisual({
  points,
  start,
  gap,
  costMoved,
  t,
}: {
  points: EquityPoint[];
  start: number;
  gap: number;
  costMoved: number;
  t: TFn;
}) {
  return (
    <div className="relative mx-auto w-full max-w-[600px] min-w-0 sm:pt-[150px] lg:pt-[170px]">
      {/* the plumb line, hanging from the top of the page */}
      <div className="pointer-events-none absolute top-[-40px] left-[64%] z-10 hidden -translate-x-1/2 text-plum sm:block lg:top-[-80px]">
        <div className="plumb-swing flex flex-col items-center" style={{ transformOrigin: "50% 0" }}>
          <div className="h-[70px] w-[1.5px] bg-current lg:h-[110px]" />
          <PlumbMark className="-mt-[30px] h-[124px] w-auto" />
        </div>
      </div>

      <div className="rise rise-2 relative rounded-xl border border-line bg-surface shadow-float">
        <div className="flex items-center justify-between border-b border-line px-5 py-3">
          <div>
            <div className="text-[13px] font-semibold text-ink">{t("dashboard.equityTitle")}</div>
            <div className="text-[11.5px] text-muted">{t("landing.mockAccount")} · 90D</div>
          </div>
          <div className="text-right">
            <div className="text-[11px] text-muted">{t("dashboard.gap")}</div>
            <Money value={gap} currency="EUR" decimals={0} className="text-[15px] font-semibold" neutral />
          </div>
        </div>
        <div className="px-2 pt-3 pb-2">
          <EquityChart points={points} start={start} currency="EUR" height={210} compact />
        </div>
        <div className="flex items-center gap-4 border-t border-line px-5 py-2.5 text-[11.5px] text-ink-2">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-[2px] w-4 bg-plum" /> {t("dashboard.equity")}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0 w-4 border-t-2 border-dashed border-gain" /> {t("dashboard.clean")}
          </span>
        </div>
      </div>

      {/* reminder, in the trader's own words */}
      <div className="rise rise-3 relative mb-3 w-full rounded-lg sm:absolute sm:top-[40px] sm:mb-0 sm:w-[250px] border border-ochre/35 bg-surface p-3.5 shadow-float sm:-left-12 lg:top-[52px]">
        <div className="flex gap-2.5">
          <CircleAlert className="mt-0.5 size-4 shrink-0 text-ochre" strokeWidth={2} />
          <p className="text-[12.5px] leading-snug text-ink">{t("landing.mockReminder")}</p>
        </div>
        <div className="mt-2.5 flex gap-1 pl-[26px]">
          <span className="h-2.5 w-1.5 rounded-[1.5px] bg-ochre" />
          <span className="h-2.5 w-1.5 rounded-[1.5px] bg-ochre" />
        </div>
      </div>

      {/* cost of one broken rule */}
      <div className="rise rise-4 relative mt-3 w-full rounded-lg border border-line bg-surface p-4 shadow-float sm:absolute sm:-right-8 sm:-bottom-14 sm:mt-0 sm:w-[250px]">
        <div className="text-[12px] text-muted">{t("landing.mockCost")}</div>
        <div className="mt-1 flex items-baseline gap-2">
          <Money value={-costMoved} currency="EUR" decimals={0} className="font-display text-[2rem] leading-none" />
        </div>
        <div className="mt-0.5 text-[11.5px] text-muted">{t("landing.mockCostPeriod")}</div>
        <ul className="mt-3 space-y-1.5 border-t border-line pt-3 text-[12px]">
          <li className="flex items-center gap-2 text-ink-2">
            <span className="grid size-4 place-items-center rounded-full bg-gain-tint text-gain">
              <Check className="size-2.5" strokeWidth={3} />
            </span>
            {t("rules.kinds.max_risk_pct.title")}
          </li>
          <li className="flex items-center gap-2 text-ink">
            <span className="grid size-4 place-items-center rounded-full bg-ochre-tint text-ochre">
              <X className="size-2.5" strokeWidth={3} />
            </span>
            {t("rules.kinds.no_stop_widening.title")}
          </li>
        </ul>
      </div>
    </div>
  );
}
