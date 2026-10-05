import { PageHeader } from "@/components/app/page-header";
import { PlanForm } from "@/components/app/plan-form";
import { netPnl } from "@/lib/calc";
import { getScope } from "@/lib/data";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("plan.title") };
}

export default async function PlanPage() {
  const { t } = await getI18n();
  const { ws, account } = await getScope();
  const balances = Object.fromEntries(
    ws.accounts.map((a) => [a.id, a.starting_balance + ws.trades.filter((tr) => tr.account_id === a.id).reduce((s, tr) => s + netPnl(tr), 0)]),
  );
  return (
    <>
      <PageHeader title={t("plan.title")} intro={t("plan.intro")} />
      <PlanForm
        accounts={ws.accounts}
        setups={ws.setups}
        rules={ws.rules}
        trades={ws.trades}
        defaultAccountId={account?.id ?? ws.accounts[0]?.id ?? ""}
        balances={balances}
      />
    </>
  );
}
