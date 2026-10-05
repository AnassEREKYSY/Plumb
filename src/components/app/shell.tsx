"use client";
import {
  BookOpen,
  ChartNoAxesColumn,
  ChevronDown,
  ClipboardList,
  LayoutGrid,
  ListChecks,
  LogOut,
  Menu,
  NotebookPen,
  Plus,
  ScrollText,
  Settings,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { exitDemoAction, setAccountAction, signOutAction } from "@/app/actions";
import { Logo } from "@/components/brand/logo";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n/client";
import type { Account } from "@/lib/types";
import { LocaleSwitch, ThemeSwitch } from "./prefs";

type NavKey = "dashboard" | "plan" | "journal" | "rules" | "review" | "analytics" | "playbook";
type NavItem = { href: string; key: NavKey; icon: typeof LayoutGrid };

const NAV: NavItem[] = [
  { href: "/dashboard", key: "dashboard", icon: LayoutGrid },
  { href: "/journal", key: "journal", icon: ScrollText },
  { href: "/plan", key: "plan", icon: NotebookPen },
  { href: "/rules", key: "rules", icon: ListChecks },
  { href: "/review", key: "review", icon: ClipboardList },
  { href: "/analytics", key: "analytics", icon: ChartNoAxesColumn },
  { href: "/playbook", key: "playbook", icon: BookOpen },
];

const isActive = (pathname: string, href: string) => pathname === href || pathname.startsWith(href + "/");

export function AppShell({
  children,
  accounts,
  selected,
  demo,
  email,
}: {
  children: React.ReactNode;
  accounts: Account[];
  selected: string;
  demo: boolean;
  email: string | null;
}) {
  const { t } = useI18n();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the menu on navigation, lock page scroll while it is open.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <div className="min-h-dvh bg-paper">
      {demo && <DemoBanner />}

      {/* Backdrop for the small-screen menu */}
      <div
        aria-hidden
        onClick={() => setOpen(false)}
        className={cn("fixed inset-0 z-30 bg-ink/25 transition-opacity xl:hidden", open ? "opacity-100" : "pointer-events-none opacity-0")}
      />

      <header className="sticky top-0 z-40 border-b border-line bg-paper/80 backdrop-blur-xl backdrop-saturate-150">
        <div className="mx-auto flex h-14 max-w-[1320px] items-center gap-2 px-4 sm:gap-3 sm:px-6 lg:h-16 lg:px-8">
          <button
            onClick={() => setOpen((v) => !v)}
            className="-ml-1.5 grid size-9 shrink-0 place-items-center rounded-md text-ink-2 hover:bg-surface-2 xl:hidden"
            aria-label={t("nav.menu")}
            aria-expanded={open}
            aria-controls="app-menu"
          >
            {open ? <X className="size-[18px]" /> : <Menu className="size-[18px]" />}
          </button>

          <Link href="/dashboard" className="mr-1 shrink-0 xl:mr-5" aria-label="Plumb">
            <Logo markClassName="h-6 lg:h-7" />
          </Link>

          {/* Desktop navigation */}
          <nav aria-label={t("nav.menu")} className="hidden h-full items-stretch xl:flex">
            {NAV.map(({ href, key }) => {
              const active = isActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex items-center px-3 text-[13.5px] font-medium whitespace-nowrap transition-colors duration-150",
                    active ? "text-ink" : "text-muted hover:text-ink",
                  )}
                >
                  {t(`nav.${key}`)}
                  <span className={cn("absolute inset-x-3 -bottom-px h-[2px] origin-center rounded-full bg-plum transition-transform duration-200", active ? "scale-x-100" : "scale-x-0")} />
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex min-w-0 items-center gap-2">
            <AccountSwitch accounts={accounts} selected={selected} className="hidden md:block" />
            <Link href="/plan" className={buttonClass("primary", "sm", "hidden sm:inline-flex")}>
              <Plus className="size-4" strokeWidth={2} />
              {t("nav.newPlan")}
            </Link>
            <Link href="/plan" className={buttonClass("primary", "sm", "w-8 shrink-0 px-0 sm:hidden")} aria-label={t("nav.newPlan")}>
              <Plus className="size-4" strokeWidth={2} />
            </Link>
            <UserMenu demo={demo} email={email} />
          </div>
        </div>

        {/* Small-screen menu, drops down under the bar */}
        <div
          id="app-menu"
          className={cn(
            "absolute inset-x-0 top-full max-h-[calc(100dvh-3.5rem)] overflow-y-auto border-b border-line bg-paper shadow-float transition-[transform,opacity,visibility] duration-200 xl:hidden",
            open ? "visible translate-y-0 opacity-100" : "invisible -translate-y-2 opacity-0",
          )}
        >
          <div className="mx-auto max-w-[1320px] px-4 pt-3 pb-5 sm:px-6">
            <AccountSwitch accounts={accounts} selected={selected} className="mb-3 md:hidden" full />
            <ul className="grid grid-cols-1 gap-1 sm:grid-cols-2">
              {[...NAV, { href: "/settings", key: "settings" as const, icon: Settings }].map(({ href, key, icon: Icon }) => {
                const active = isActive(pathname, href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      tabIndex={open ? 0 : -1}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex h-11 items-center gap-3 rounded-md px-3 text-[14.5px] transition-colors",
                        active ? "bg-surface font-medium text-ink ring-1 ring-line" : "text-ink-2 hover:bg-surface-2",
                      )}
                    >
                      <Icon className={cn("size-[18px]", active ? "text-plum" : "text-muted")} strokeWidth={1.7} />
                      {t(`nav.${key}`)}
                    </Link>
                  </li>
                );
              })}
            </ul>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
              <ThemeSwitch />
              <LocaleSwitch />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1320px] px-4 pt-6 pb-24 sm:px-6 lg:px-8 lg:pt-10">{children}</main>
    </div>
  );
}

function AccountSwitch({ accounts, selected, className, full }: { accounts: Account[]; selected: string; className?: string; full?: boolean }) {
  const { t } = useI18n();
  const [pending, start] = useTransition();
  const id = full ? "account-switch-menu" : "account-switch";
  return (
    <div className={cn("relative", pending && "opacity-60", className)}>
      <label className="sr-only" htmlFor={id}>
        {t("common.account")}
      </label>
      <select
        id={id}
        value={selected}
        onChange={(e) => start(() => setAccountAction(e.target.value))}
        className={cn(
          "cursor-pointer appearance-none truncate rounded-md border border-line-strong bg-surface pr-8 pl-3 text-[13px] font-medium text-ink hover:border-mauve/60 focus:outline-none",
          full ? "h-11 w-full" : "h-8 max-w-[210px]",
        )}
      >
        {accounts.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
        {accounts.length > 1 && <option value="all">{t("common.allAccounts")}</option>}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-muted" />
    </div>
  );
}

function UserMenu({ demo, email }: { demo: boolean; email: string | null }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const initial = demo ? "D" : (email?.[0] ?? "P").toUpperCase();

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("settings.profile")}
        className="flex h-8 items-center gap-1 rounded-full border border-line-strong bg-surface pr-1.5 pl-[3px] hover:border-mauve/60"
      >
        <span className="grid size-[26px] place-items-center rounded-full bg-mauve-tint text-[12px] font-semibold text-plum">{initial}</span>
        <ChevronDown className={cn("size-3.5 text-muted transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div role="menu" className="pop absolute top-[calc(100%+8px)] right-0 z-50 w-[min(16rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-line bg-surface shadow-float">
          <div className="border-b border-line px-4 py-3">
            <div className="text-[11.5px] text-muted">{demo ? t("accountKind.demo") : t("settings.profile")}</div>
            <div className="text-[13px] leading-snug font-medium text-ink">{demo ? t("demo.banner") : <span className="block truncate">{email}</span>}</div>
          </div>
          <div className="space-y-3 border-b border-line px-4 py-3">
            <div className="flex items-center justify-between gap-2 text-[12.5px] text-ink-2">
              {t("settings.theme")}
              <ThemeSwitch />
            </div>
            <div className="flex items-center justify-between gap-2 text-[12.5px] text-ink-2">
              {t("settings.language")}
              <LocaleSwitch />
            </div>
          </div>
          <div className="p-1.5">
            <Link role="menuitem" href="/settings" className="flex h-9 items-center gap-2.5 rounded-md px-2.5 text-[13.5px] text-ink-2 hover:bg-surface-2 hover:text-ink">
              <Settings className="size-4 text-muted" strokeWidth={1.7} />
              {t("nav.settings")}
            </Link>
            <form action={demo ? exitDemoAction : signOutAction}>
              <button role="menuitem" type="submit" className="flex h-9 w-full items-center gap-2.5 rounded-md px-2.5 text-[13.5px] text-ink-2 hover:bg-surface-2 hover:text-ink">
                <LogOut className="size-4 text-muted" strokeWidth={1.7} />
                {demo ? t("demo.exit") : t("common.signOut")}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function DemoBanner() {
  const { t } = useI18n();
  return (
    <div className="border-b border-line bg-mauve-soft text-ink-2">
      <div className="mx-auto flex max-w-[1320px] flex-wrap items-center justify-center gap-x-4 gap-y-0.5 px-4 py-2 text-center text-[12.5px] sm:text-[13px]">
        <span>{t("demo.banner")}</span>
        <form action={exitDemoAction}>
          <button className="font-medium text-plum underline-offset-4 hover:underline">{t("demo.cta")} →</button>
        </form>
      </div>
    </div>
  );
}
