import Link from "next/link";
import { Logo, PlumbMark } from "@/components/brand/logo";
import { LocaleSwitch, ThemeSwitch } from "@/components/app/prefs";
import { getI18n } from "@/lib/i18n/server";

export default async function AuthLayout({ children }: LayoutProps<"/">) {
  const { t } = await getI18n();
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(420px,0.85fr)]">
      <div className="flex flex-col px-5 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Link href="/" aria-label="Plumb">
            <Logo />
          </Link>
          <div className="flex items-center gap-2">
            <LocaleSwitch />
            <ThemeSwitch />
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center py-12">
          <div className="w-full max-w-[380px]">{children}</div>
        </div>
        <p className="text-center text-[11.5px] text-muted">{t("common.disclaimer")}</p>
      </div>
      <aside className="relative hidden overflow-hidden border-l border-line bg-surface-2 text-ink lg:block">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 text-plum">
          <div className="plumb-swing flex flex-col items-center" style={{ transformOrigin: "50% 0" }}>
            <div className="h-[34vh] w-[1.5px] bg-current" />
            <PlumbMark className="-mt-[26px] h-[120px] w-auto" />
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 p-12">
          <p className="font-display text-[26px] leading-[1.2]">
            {t("auth.sideQuote")}
          </p>
          <p className="mt-3 max-w-sm text-[14.5px] leading-relaxed text-muted">{t("auth.sideText")}</p>
        </div>
      </aside>
    </div>
  );
}
