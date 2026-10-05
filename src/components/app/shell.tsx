"use client";
import {
  BookOpen,
  ChartNoAxesColumn,
  ClipboardList,
  LayoutGrid,
  ListChecks,
  LogOut,
  Menu,
  NotebookPen,
  Settings,
  Plus,
  X,
  ScrollText,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { exitDemoAction, setAccountAction, signOutAction } from "@/app/actions";
import { Logo } from "@/components/brand/logo";
import { buttonClass } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n/client";
import type { Account } from "@/lib/types";
import { LocaleSwitch, ThemeSwitch } from "./prefs";

type NavItem = { href: string; key: "dashboard" | "plan" | "journal" | "rules" | "review" | "analytics" | "playbook"; icon: typeof LayoutGrid };
const GROUPS: { key: "groupToday" | "groupJournal" | "groupDiscipline" | "groupInsight"; items: NavItem[] }[] = [
  { key: "groupToday", items: [{ href: "/dashboard", key: "dashboard", icon: LayoutGrid }, { href: "/plan", key: "plan", icon: NotebookPen }] },
  { key: "groupJournal", items: [{ href: "/journal", key: "journal", icon: ScrollText }] },
  { key: "groupDiscipline", items: [{ href: "/rules", key: "rules", icon: ListChecks }, { href: "/review", key: "review", icon: ClipboardList }] },
  { key: "groupInsight", items: [{ href: "/analytics", key: "analytics", icon: ChartNoAxesColumn }, { href: "/playbook", key: "playbook", icon: BookOpen }] },
];

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
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="min-h-dvh bg-paper">
      {demo && <DemoBanner />}
      <div className="flex">
        <aside className="sticky top-0 hidden h-dvh w-[248px] shrink-0 border-r border-line bg-paper lg:block">
          <SidebarContent accounts={accounts} selected={selected} demo={demo} email={email} />
        </aside>

        {/* Mobile drawer */}
        <div className={cn("fixed inset-0 z-40 lg:hidden", open ? "pointer-events-auto" : "pointer-events-none")}>
          <div className={cn("absolute inset-0 bg-ink/30 transition-opacity", open ? "opacity-100" : "opacity-0")} onClick={() => setOpen(false)} />
          <aside
            className={cn(
              "absolute inset-y-0 left-0 w-[280px] border-r border-line bg-paper shadow-float transition-transform duration-200",
              open ? "translate-x-0" : "-translate-x-full",
            )}
          >
            <button onClick={() => setOpen(false)} className="absolute top-4 right-3 grid size-8 place-items-center rounded-md text-muted hover:bg-surface-2" aria-label="Close">
              <X className="size-4" />
            </button>
            <SidebarContent accounts={accounts} selected={selected} demo={demo} email={email} />
          </aside>
        </div>

        <div className="min-w-0 flex-1">
          <MobileBar onMenu={() => setOpen(true)} />
          <main className="mx-auto w-full max-w-[1240px] px-4 pt-6 pb-24 sm:px-8 lg:pt-10">{children}</main>
        </div>
      </div>
    </div>
  );
}

function MobileBar({ onMenu }: { onMenu: () => void }) {
  const { t } = useI18n();
  return (
    <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-paper/90 px-4 backdrop-blur lg:hidden">
      <button onClick={onMenu} className="grid size-9 place-items-center rounded-md text-ink-2 hover:bg-surface-2" aria-label={t("nav.menu")}>
        <Menu className="size-[18px]" />
      </button>
      <Link href="/dashboard">
        <Logo markClassName="h-6" />
      </Link>
      <Link href="/plan" className={buttonClass("primary", "sm", "px-2.5")} aria-label={t("nav.newPlan")}>
        <Plus className="size-4" />
      </Link>
    </div>
  );
}

function SidebarContent({ accounts, selected, demo, email }: { accounts: Account[]; selected: string; demo: boolean; email: string | null }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const [pending, start] = useTransition();

  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pt-5 pb-4">
        <Link href="/dashboard" className="inline-flex">
          <Logo />
        </Link>
      </div>

      <div className="px-3">
        <label className="sr-only" htmlFor="account-switch">
          {t("common.account")}
        </label>
        <div className={cn("relative rounded-md border border-line bg-surface", pending && "opacity-60")}>
          <select
            id="account-switch"
            value={selected}
            onChange={(e) => start(() => setAccountAction(e.target.value))}
            className="h-11 w-full cursor-pointer appearance-none rounded-md bg-transparent pr-8 pl-3 text-[13px] font-medium text-ink focus:outline-none"
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
            {accounts.length > 1 && <option value="all">{t("common.allAccounts")}</option>}
          </select>
          <svg className="pointer-events-none absolute top-1/2 right-3 size-3 -translate-y-1/2 text-muted" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 4.5 6 1.5 9 4.5M3 7.5 6 10.5 9 7.5" />
          </svg>
        </div>
      </div>

      <div className="px-3 pt-3">
        <Link href="/plan" className={buttonClass("primary", "md", "w-full")}>
          <Plus className="size-4" strokeWidth={2} />
          {t("nav.newPlan")}
        </Link>
      </div>

      <nav className="mt-4 flex-1 space-y-5 overflow-y-auto px-3 pb-4">
        {GROUPS.map((g) => (
          <div key={g.key}>
            <div className="px-2 pb-1.5 text-[11px] font-medium tracking-[0.06em] text-muted/80 uppercase">{t(`nav.${g.key}`)}</div>
            <ul className="space-y-px">
              {g.items.map(({ href, key, icon: Icon }) => {
                const active = pathname === href || pathname.startsWith(href + "/");
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      className={cn(
                        "group relative flex h-9 items-center gap-2.5 rounded-md px-2 text-[13.5px] transition-colors",
                        active ? "bg-surface font-medium text-ink shadow-card ring-1 ring-line" : "text-ink-2 hover:bg-surface-2 hover:text-ink",
                      )}
                    >
                      {active && <span className="absolute top-2 bottom-2 -left-3 w-[3px] rounded-r bg-plum" />}
                      <Icon className={cn("size-[17px]", active ? "text-plum" : "text-muted group-hover:text-ink-2")} strokeWidth={1.7} />
                      {t(`nav.${key}`)}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="space-y-3 border-t border-line px-3 pt-3 pb-4">
        <Link
          href="/settings"
          className={cn(
            "flex h-9 items-center gap-2.5 rounded-md px-2 text-[13.5px] transition-colors",
            pathname.startsWith("/settings") ? "bg-surface font-medium text-ink ring-1 ring-line" : "text-ink-2 hover:bg-surface-2",
          )}
        >
          <Settings className="size-[17px] text-muted" strokeWidth={1.7} />
          {t("nav.settings")}
        </Link>
        <div className="flex items-center justify-between gap-2 px-1">
          <ThemeSwitch />
          <LocaleSwitch />
        </div>
        <div className="flex items-center justify-between gap-2 px-2 text-[12px] text-muted">
          <span className="truncate">{demo ? t("accountKind.demo") : email}</span>
          <form action={demo ? exitDemoAction : signOutAction}>
            <button className="flex items-center gap-1.5 rounded px-1.5 py-1 hover:bg-surface-2 hover:text-ink" type="submit">
              <LogOut className="size-3.5" />
              {demo ? t("demo.exit") : t("common.signOut")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

function DemoBanner() {
  const { t } = useI18n();
  return (
    <div className="border-b border-line bg-plum text-on-plum dark:bg-mauve-tint dark:text-ink">
      <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-center gap-x-4 gap-y-1 px-4 py-2 text-[13px]">
        <span className="opacity-90">{t("demo.banner")}</span>
        <form action={exitDemoAction}>
          <button className="font-medium underline decoration-from-font underline-offset-4 hover:opacity-80">{t("demo.cta")} →</button>
        </form>
      </div>
    </div>
  );
}

