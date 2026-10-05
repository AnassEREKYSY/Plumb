import { ArrowRight, Check, Minus, X } from "lucide-react";
import Link from "next/link";
import { enterDemoAction } from "@/app/actions";
import { TradeLadder } from "@/components/charts/trade-ladder";
import { Logo, PlumbMark } from "@/components/brand/logo";
import { LocaleSwitch, ThemeSwitch } from "@/components/app/prefs";
import { HeroVisual } from "@/components/marketing/hero-visual";
import { Button, ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { fmtR } from "@/lib/format";
import { heroData } from "@/lib/demo";
import { getI18n } from "@/lib/i18n/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export default async function Landing() {
  const { t, locale } = await getI18n();

  // The hero is drawn with the real components and the demo journal.
  const { series, start, gap, movedCost } = heroData(locale);
  const signupHref = isSupabaseConfigured ? "/signup" : "/login";

  return (
    <div className="overflow-x-clip bg-paper">
      {/* NAV */}
      <header className="relative z-20">
        <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-5 sm:px-8">
          <Link href="/" aria-label="Plumb">
            <Logo />
          </Link>
          <nav className="hidden items-center gap-7 text-[13.5px] text-ink-2 md:flex">
            <a href="#how" className="hover:text-ink">
              {t("landing.navFeatures")}
            </a>
            <a href="#principle" className="hover:text-ink">
              {t("landing.navPrinciple")}
            </a>
            <a href="#pricing" className="hover:text-ink">
              {t("landing.navPricing")}
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <div className="hidden items-center gap-2 sm:flex">
              <LocaleSwitch />
              <ThemeSwitch />
            </div>
            <ButtonLink href="/login" variant="ghost" size="sm" className="hidden sm:inline-flex">
              {t("landing.signIn")}
            </ButtonLink>
            <ButtonLink href={signupHref} size="sm">
              {t("landing.getStarted")}
            </ButtonLink>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative">
        <div className="paper-grid pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent_85%)] opacity-70" />
        <div className="relative mx-auto grid max-w-[1200px] grid-cols-1 items-start gap-10 px-5 pt-10 pb-28 sm:px-8 lg:grid-cols-[1.02fr_1fr] lg:gap-14 lg:pt-20 lg:pb-36">
          <div className="max-w-xl pt-2 lg:pt-10">
            <p className="rise mb-6 inline-flex items-center gap-2 rounded-full border border-line-strong bg-surface px-3 py-1 text-[12px] font-medium text-ink-2">
              <span className="size-1.5 rounded-full bg-gain" />
              {t("landing.eyebrow")}
            </p>
            <h1 className="rise rise-1 font-display text-[2.7rem] leading-[1.02] font-medium text-ink sm:text-[3.6rem] lg:text-[4.1rem]" style={{ fontVariationSettings: '"opsz" 144' }}>
              {t("landing.heroTitle")}
            </h1>
            <p className="rise rise-2 mt-6 max-w-lg text-[16.5px] leading-relaxed text-ink-2">{t("landing.heroText")}</p>
            <div className="rise rise-3 mt-8 flex flex-wrap items-center gap-3">
              <ButtonLink href={signupHref} size="lg">
                {t("landing.heroPrimary")}
                <ArrowRight className="size-4" />
              </ButtonLink>
              <form action={enterDemoAction}>
                <Button variant="secondary" size="lg" type="submit">
                  {t("landing.heroSecondary")}
                </Button>
              </form>
            </div>
            <p className="rise rise-4 mt-5 text-[12.5px] text-muted">{t("landing.heroNote")}</p>
          </div>
          <HeroVisual points={series} start={start} gap={gap} costMoved={movedCost} t={t} />
        </div>
      </section>

      {/* PROBLEM */}
      <section className="border-y border-line bg-surface">
        <div className="mx-auto grid grid-cols-1 max-w-[1200px] gap-10 px-5 py-20 sm:px-8 lg:grid-cols-2 lg:gap-20 lg:py-28">
          <div>
            <h2 className="font-display text-[2.1rem] leading-[1.08] font-medium text-ink sm:text-[2.6rem]">{t("landing.problemTitle")}</h2>
            <p className="mt-5 max-w-md text-[15.5px] leading-relaxed text-ink-2">{t("landing.problemText")}</p>
          </div>
          <ol className="divide-y divide-line border-y border-line">
            {(["p1", "p2", "p3", "p4"] as const).map((k, i) => (
              <li key={k} className="grid grid-cols-[44px_1fr] items-baseline gap-2 py-5">
                <span className="num font-display text-[15px] text-mauve">{String(i + 1).padStart(2, "0")}</span>
                <span className="text-[16px] leading-snug text-ink">{t(`landing.problems.${k}`)}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="mx-auto max-w-[1200px] scroll-mt-10 px-5 py-20 sm:px-8 lg:py-28">
        <div className="max-w-2xl">
          <h2 className="font-display text-[2.1rem] leading-[1.08] font-medium text-ink sm:text-[2.6rem]">{t("landing.stepsTitle")}</h2>
          <p className="mt-4 text-[15.5px] leading-relaxed text-ink-2">{t("landing.stepsText")}</p>
        </div>
        <div className="mt-14 grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          <Step n="01" title={t("landing.steps.s1Title")} text={t("landing.steps.s1Text")}>
            <MiniTicket t={t} />
          </Step>
          <Step n="02" title={t("landing.steps.s2Title")} text={t("landing.steps.s2Text")}>
            <ul className="space-y-2 text-[12px]">
              <MiniRule ok label={t("rules.kinds.require_stop.title")} />
              <MiniRule ok label={t("rules.kinds.min_rr.title")} />
              <MiniRule label={t("rules.kinds.max_risk_pct.title")} note="2.4% / 1%" />
            </ul>
          </Step>
          <Step n="03" title={t("landing.steps.s3Title")} text={t("landing.steps.s3Text")}>
            <div className="space-y-2.5 text-[12px] text-ink-2">
              <MiniMeter n={2} max={3} label={t("rules.reminders.tradesProgress", { n: 2, max: 3 })} />
              <MiniMeter n={2} max={2} label={t("rules.reminders.lossesProgress", { n: 2, max: 2 })} />
            </div>
          </Step>
          <Step n="04" title={t("landing.steps.s4Title")} text={t("landing.steps.s4Text")}>
            <ol className="space-y-1.5 text-[12.5px]">
              {(["q1", "q2", "q3"] as const).map((q, i) => (
                <li key={q} className="flex gap-2 text-ink-2">
                  <span className="num font-display text-mauve">{i + 1}</span>
                  {t(`review.${q}`)}
                </li>
              ))}
            </ol>
          </Step>
        </div>
      </section>

      {/* COST OF MISTAKES */}
      <section className="border-y border-line bg-surface">
        <div className="mx-auto grid grid-cols-1 max-w-[1200px] items-center gap-12 px-5 py-20 sm:px-8 lg:grid-cols-2 lg:gap-20 lg:py-28">
          <div>
            <h2 className="font-display text-[2.1rem] leading-[1.08] font-medium text-ink sm:text-[2.6rem]">{t("landing.costTitle")}</h2>
            <p className="mt-5 max-w-md text-[15.5px] leading-relaxed text-ink-2">{t("landing.costText")}</p>
          </div>
          <div className="rounded-xl border border-line bg-paper p-6 shadow-card">
            <div className="mb-4 flex items-baseline justify-between">
              <span className="font-display text-[1.6rem] text-ink">EURUSD</span>
              <span className="text-[12.5px] text-loss">▼ {t("common.short")} · {fmtR(-1.65, locale)}</span>
            </div>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-[1fr_200px]">
              <table className="w-full self-start text-[13px]">
                <thead>
                  <tr className="border-b border-line text-left text-[11.5px] text-muted">
                    <th className="pb-2 font-medium" />
                    <th className="pb-2 text-right font-medium">{t("trade.planned")}</th>
                    <th className="pb-2 text-right font-medium">{t("trade.actual")}</th>
                  </tr>
                </thead>
                <tbody className="num divide-y divide-line">
                  <tr>
                    <td className="py-2 text-ink-2">{t("trade.entry")}</td>
                    <td className="py-2 text-right">1.16680</td>
                    <td className="py-2 text-right">1.16680</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-ink-2">{t("trade.stop")}</td>
                    <td className="py-2 text-right">1.16860</td>
                    <td className="py-2 text-right font-semibold text-ochre">1.16977</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-ink-2">{t("trade.target")}</td>
                    <td className="py-2 text-right">1.16220</td>
                    <td className="py-2 text-right">—</td>
                  </tr>
                  <tr>
                    <td className="py-2 text-ink-2">{t("trade.risk")}</td>
                    <td className="py-2 text-right">€99</td>
                    <td className="py-2 text-right font-semibold text-loss">€163</td>
                  </tr>
                </tbody>
              </table>
              <TradeLadder direction="short" entry={1.1668} stop={1.1686} target={1.1622} exit={1.16977} finalStop={1.16977} height={210} decimals={5} />
            </div>
            <p className="mt-5 rounded-md bg-ochre-tint px-3 py-2.5 text-[13px] text-ink">
              {t("trade.stopMoved", { planned: "1.16860", final: "1.16977" })}
            </p>
          </div>
        </div>
      </section>

      {/* PRINCIPLE */}
      <section id="principle" className="scroll-mt-10 bg-[#2a1f2d] text-[#f1ebf1]">
        <div className="mx-auto max-w-[1200px] px-5 py-20 sm:px-8 lg:py-28">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_1.3fr] lg:gap-20">
            <div className="relative">
              <PlumbMark className="mb-8 h-20 w-auto text-[#c9a9c4]" tip="#74c095" />
              <h2 className="font-display text-[2.3rem] leading-[1.05] font-medium sm:text-[2.9rem]">{t("landing.principleTitle")}</h2>
              <p className="mt-5 max-w-md text-[15.5px] leading-relaxed text-[#cfc3cf]">{t("landing.principleText")}</p>
            </div>
            <div className="overflow-hidden rounded-xl border border-white/10">
              <div className="grid grid-cols-2 border-b border-white/10 bg-white/[0.04] text-[12px] font-medium text-[#b9aab8]">
                <div className="flex items-center gap-2 px-5 py-3">
                  <Check className="size-3.5 text-[#74c095]" /> {t("landing.principleOk")}
                </div>
                <div className="flex items-center gap-2 border-l border-white/10 px-5 py-3">
                  <X className="size-3.5 text-[#d58dbd]" /> {t("landing.principleNo")}
                </div>
              </div>
              {([1, 2, 3, 4] as const).map((i) => (
                <div key={i} className="grid grid-cols-2 border-b border-white/10 last:border-b-0">
                  <p className="px-5 py-5 font-display text-[15.5px] leading-snug" style={{ fontVariationSettings: '"opsz" 24' }}>
                    {t(`landing.principleRows.ok${i}`)}
                  </p>
                  <p className="border-l border-white/10 px-5 py-5 text-[14px] leading-snug text-[#9d8f9c] line-through decoration-[#d58dbd]/60">
                    {t(`landing.principleRows.no${i}`)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SAMPLE SIZE */}
      <section className="mx-auto grid grid-cols-1 max-w-[1200px] items-center gap-12 px-5 py-20 sm:px-8 lg:grid-cols-2 lg:gap-20 lg:py-28">
        <div className="order-2 lg:order-1">
          <div className="rounded-xl border border-line bg-surface p-6 shadow-card">
            <div className="flex items-center justify-between">
              <span className="font-display text-[1.35rem] text-ink">{locale === "fr" ? "Cassure du range d'ouverture" : "Opening range breakout"}</span>
              <span className="num text-[13px] font-semibold text-gain">{fmtR(1.42, locale)}</span>
            </div>
            <div className="mt-5 flex gap-1">
              {Array.from({ length: 30 }).map((_, i) => (
                <span key={i} className={cn("h-7 flex-1 rounded-[2px]", i < 6 ? (i === 2 ? "bg-loss/80" : "bg-gain") : "border border-dashed border-line-strong")} />
              ))}
            </div>
            <div className="num mt-2 flex justify-between text-[11px] text-muted">
              <span>6</span>
              <span>30</span>
            </div>
            <p className="mt-4 flex gap-2 rounded-md bg-ochre-tint px-3 py-2.5 text-[13px] leading-snug text-ink">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-ochre" />
              {t("landing.sampleCard")}
            </p>
          </div>
        </div>
        <div className="order-1 lg:order-2">
          <h2 className="font-display text-[2.1rem] leading-[1.08] font-medium text-ink sm:text-[2.6rem]">{t("landing.sampleTitle")}</h2>
          <p className="mt-5 max-w-md text-[15.5px] leading-relaxed text-ink-2">{t("landing.sampleText")}</p>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="scroll-mt-10 border-t border-line bg-surface">
        <div className="mx-auto max-w-[1200px] px-5 py-20 sm:px-8 lg:py-28">
          <div className="max-w-2xl">
            <h2 className="font-display text-[2.1rem] leading-[1.08] font-medium text-ink sm:text-[2.6rem]">{t("landing.pricingTitle")}</h2>
            <p className="mt-4 text-[15.5px] leading-relaxed text-ink-2">{t("landing.pricingText")}</p>
          </div>
          <div className="mt-12 grid max-w-4xl grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl border-2 border-plum bg-paper p-7">
              <div className="flex items-baseline justify-between">
                <span className="text-[14px] font-semibold text-ink">{t("landing.free")}</span>
                <span className="font-display text-[2.2rem] text-ink">{t("landing.freePrice")}</span>
              </div>
              <ul className="mt-6 space-y-3 text-[14px] text-ink-2">
                {(["i1", "i2", "i3", "i4", "i5"] as const).map((k) => (
                  <li key={k} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 size-4 shrink-0 text-gain" strokeWidth={2.2} />
                    {t(`landing.freeItems.${k}`)}
                  </li>
                ))}
              </ul>
              <ButtonLink href={signupHref} className="mt-8 w-full" size="lg">
                {t("landing.getStarted")}
              </ButtonLink>
            </div>
            <div className="rounded-xl border border-line bg-paper p-7">
              <div className="flex items-baseline justify-between">
                <span className="text-[14px] font-semibold text-ink">{t("landing.pro")}</span>
                <span className="font-display text-[1.6rem] text-muted">{t("landing.proPrice")}</span>
              </div>
              <ul className="mt-6 space-y-3 text-[14px] text-muted">
                {(["i1", "i2", "i3", "i4"] as const).map((k) => (
                  <li key={k} className="flex items-start gap-2.5">
                    <Minus className="mt-0.5 size-4 shrink-0" />
                    {t(`landing.proItems.${k}`)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-8 px-5 py-12 sm:px-8 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <Logo />
            <p className="mt-3 text-[13.5px] text-muted">{t("landing.footerTagline")}</p>
          </div>
          <div className="max-w-sm space-y-2 text-[12.5px] text-muted md:text-right">
            <p>{t("common.disclaimer")}</p>
            <p>{t("landing.footerData")}</p>
            <p>© 2026 Plumb</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Step({ n, title, text, children }: { n: string; title: string; text: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col bg-surface p-6">
      <span className="num font-display text-[14px] text-mauve">{n}</span>
      <h3 className="mt-3 font-display text-[1.5rem] text-ink">{title}</h3>
      <p className="mt-2 text-[13.5px] leading-relaxed text-ink-2">{text}</p>
      <div className="mt-auto pt-6">
        <div className="rounded-lg border border-line bg-paper p-3.5">{children}</div>
      </div>
    </div>
  );
}

function MiniTicket({ t }: { t: Awaited<ReturnType<typeof getI18n>>["t"] }) {
  return (
    <dl className="num grid grid-cols-3 gap-2 text-[11px]">
      <div>
        <dt className="text-muted">{t("plan.positionSize")}</dt>
        <dd className="mt-0.5 text-[14px] font-semibold text-ink">0.55</dd>
      </div>
      <div>
        <dt className="text-muted">{t("plan.atRisk")}</dt>
        <dd className="mt-0.5 text-[14px] font-semibold text-loss">−€99</dd>
      </div>
      <div>
        <dt className="text-muted">{t("plan.ratio")}</dt>
        <dd className="mt-0.5 text-[14px] font-semibold text-ink">1:2.6</dd>
      </div>
    </dl>
  );
}

function MiniRule({ ok, label, note }: { ok?: boolean; label: string; note?: string }) {
  return (
    <li className="flex items-center gap-2">
      <span className={cn("grid size-4 shrink-0 place-items-center rounded-full", ok ? "bg-gain-tint text-gain" : "bg-ochre-tint text-ochre")}>
        {ok ? <Check className="size-2.5" strokeWidth={3} /> : <X className="size-2.5" strokeWidth={3} />}
      </span>
      <span className="flex-1 truncate text-ink">{label}</span>
      {note && <span className="num text-[10.5px] font-medium text-ochre">{note}</span>}
    </li>
  );
}

function MiniMeter({ n, max, label }: { n: number; max: number; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex gap-[3px]">
        {Array.from({ length: max }).map((_, i) => (
          <span key={i} className={cn("h-3 w-1.5 rounded-[1.5px]", i < n ? (n >= max ? "bg-ochre" : "bg-plum") : "bg-surface-3")} />
        ))}
      </span>
      {label}
    </div>
  );
}
