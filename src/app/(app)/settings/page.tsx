import { Download, LogOut } from "lucide-react";
import { exitDemoAction, signOutAction } from "@/app/actions";
import { AccountsEditor } from "@/components/app/accounts-editor";
import { PageHeader } from "@/components/app/page-header";
import { LocaleSwitch, ThemeSwitch } from "@/components/app/prefs";
import { Button, buttonClass } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { getWorkspace } from "@/lib/data";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("settings.title") };
}

export default async function SettingsPage() {
  const { t } = await getI18n();
  const ws = await getWorkspace();
  const demo = ws.mode === "demo";
  return (
    <>
      <PageHeader title={t("settings.title")} />
      <div className="grid max-w-3xl gap-4">
        <Card>
          <CardHeader title={t("settings.accounts")} hint={t("settings.accountsHint")} />
          <AccountsEditor accounts={ws.accounts} />
        </Card>
        <Card>
          <CardHeader title={t("settings.preferences")} />
          <div className="divide-y divide-line border-t border-line">
            <div className="flex items-center justify-between px-5 py-3.5 text-[13.5px] text-ink">
              {t("settings.language")}
              <LocaleSwitch />
            </div>
            <div className="flex items-center justify-between px-5 py-3.5 text-[13.5px] text-ink">
              {t("settings.theme")}
              <ThemeSwitch />
            </div>
          </div>
        </Card>
        <Card>
          <CardHeader title={t("settings.data")} hint={t("settings.dataHint")} />
          <div className="px-5 pb-5">
            <a href="/api/export" className={buttonClass("secondary", "md")} download>
              <Download className="size-4" />
              {t("settings.exportCsv")}
            </a>
          </div>
        </Card>
        <Card>
          <CardHeader title={t("settings.profile")} hint={ws.userEmail ? t("settings.signedInAs", { email: ws.userEmail }) : t("demo.banner")} />
          <div className="px-5 pb-5">
            <form action={demo ? exitDemoAction : signOutAction}>
              <Button variant="secondary" type="submit">
                <LogOut className="size-4" />
                {demo ? t("demo.exit") : t("common.signOut")}
              </Button>
            </form>
          </div>
        </Card>
        <p className="text-[12px] text-muted">{t("common.disclaimer")}</p>
      </div>
    </>
  );
}
