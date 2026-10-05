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
      <aside className="relative hidden overflow-hidden bg-[#2a1f2d] text-[#f1ebf1] lg:block">
        <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] [background-size:36px_36px]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 text-[#c9a9c4]">
          <div className="plumb-swing flex flex-col items-center" style={{ transformOrigin: "50% 0" }}>
            <div className="h-[34vh] w-[1.5px] bg-current" />
            <PlumbMark className="-mt-[26px] h-[120px] w-auto" tip="#74c095" />
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 p-12">
          <p className="font-display text-[2rem] leading-[1.1]" style={{ fontVariationSettings: '"opsz" 96' }}>
            {t("auth.sideQuote")}
          </p>
          <p className="mt-4 max-w-sm text-[14.5px] leading-relaxed text-[#cfc3cf]">{t("auth.sideText")}</p>
        </div>
      </aside>
    </div>
  );
}
