"use client";
import { Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { deleteAccountAction, saveAccountAction } from "@/app/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { fmtMoney } from "@/lib/format";
import { useI18n } from "@/lib/i18n/client";
import type { Account, AccountKind } from "@/lib/types";

const ZONES = ["Europe/Paris", "Europe/London", "Africa/Casablanca", "America/New_York", "America/Chicago", "Asia/Dubai", "Asia/Tokyo", "Australia/Sydney", "UTC"];

export function AccountsEditor({ accounts }: { accounts: Account[] }) {
  const { t } = useI18n();
  const [adding, setAdding] = useState(false);
  return (
    <div className="divide-y divide-line border-t border-line">
      {accounts.map((a) => (
        <AccountRow key={a.id} account={a} canDelete={accounts.length > 1} />
      ))}
      {adding ? (
        <AccountForm onDone={() => setAdding(false)} />
      ) : (
        <div className="px-5 py-3">
          <Button variant="secondary" size="sm" onClick={() => setAdding(true)}>
            <Plus className="size-3.5" /> {t("settings.addAccount")}
          </Button>
        </div>
      )}
    </div>
  );
}

function AccountRow({ account, canDelete }: { account: Account; canDelete: boolean }) {
  const { t, locale } = useI18n();
  const [edit, setEdit] = useState(false);
  const toast = useToast();
  const [pending, start] = useTransition();
  if (edit) return <AccountForm account={account} onDone={() => setEdit(false)} />;
  return (
    <div className="flex flex-wrap items-center gap-3 px-5 py-3.5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[14px] font-medium text-ink">{account.name}</span>
          <Badge tone={account.kind === "live" ? "gain" : account.kind === "prop" ? "ochre" : "mauve"}>{t(`accountKind.${account.kind}`)}</Badge>
        </div>
        <div className="num mt-0.5 text-[12.5px] text-muted">
          {fmtMoney(account.starting_balance, account.currency, locale, { decimals: 0 })} · {account.risk_per_trade_pct}% · {account.timezone}
        </div>
      </div>
      <Button variant="ghost" size="sm" onClick={() => setEdit(true)}>
        {t("common.edit")}
      </Button>
      {canDelete && (
        <button
          disabled={pending}
          onClick={() => {
            if (!window.confirm(t("settings.deleteAccountConfirm"))) return;
            start(async () => {
              const res = await deleteAccountAction(account.id);
              if (!res.ok) toast(res.error === "demo" ? t("common.demoReadOnly") : t("common.error"), "error");
            });
          }}
          className="grid size-8 place-items-center rounded-md text-muted hover:bg-loss-tint hover:text-loss"
          aria-label={t("settings.deleteAccount")}
        >
          <Trash2 className="size-3.5" />
        </button>
      )}
    </div>
  );
}

function AccountForm({ account, onDone }: { account?: Account; onDone: () => void }) {
  const { t } = useI18n();
  const toast = useToast();
  const [pending, start] = useTransition();
  const [name, setName] = useState(account?.name ?? "");
  const [kind, setKind] = useState<AccountKind>(account?.kind ?? "demo");
  const [currency, setCurrency] = useState(account?.currency ?? "EUR");
  const [balance, setBalance] = useState(String(account?.starting_balance ?? 10000));
  const [risk, setRisk] = useState(String(account?.risk_per_trade_pct ?? 1));
  const [tz, setTz] = useState(account?.timezone ?? "Europe/Paris");

  const save = () =>
    start(async () => {
      const res = await saveAccountAction(
        { name, kind, currency, starting_balance: Number(balance), risk_per_trade_pct: Number(risk), timezone: tz },
        account?.id,
      );
      if (res.ok) {
        toast(t("common.saved"));
        onDone();
      } else toast(res.error === "demo" ? t("common.demoReadOnly") : t("common.error"), "error");
    });

  return (
    <div className="space-y-4 bg-surface-2/40 px-5 py-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label={t("settings.name")} htmlFor="a-name" className="sm:col-span-2">
          <Input id="a-name" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label={t("settings.kind")} htmlFor="a-kind">
          <Select id="a-kind" value={kind} onChange={(e) => setKind(e.target.value as AccountKind)}>
            {(["demo", "live", "prop"] as const).map((k) => (
              <option key={k} value={k}>
                {t(`accountKind.${k}`)}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("settings.currency")} htmlFor="a-cur">
          <Select id="a-cur" value={currency} onChange={(e) => setCurrency(e.target.value)}>
            {["EUR", "USD", "GBP", "CHF", "CAD", "AUD", "AED", "MAD", "JPY"].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </Field>
        <Field label={t("settings.startingBalance")} htmlFor="a-bal">
          <Input id="a-bal" type="number" value={balance} onChange={(e) => setBalance(e.target.value)} className="num" />
        </Field>
        <Field label={t("settings.riskPerTrade")} htmlFor="a-risk">
          <Input id="a-risk" type="number" step="0.1" value={risk} onChange={(e) => setRisk(e.target.value)} className="num" />
        </Field>
        <Field label={t("settings.timezone")} htmlFor="a-tz" hint={t("settings.timezoneHint")} className="sm:col-span-3">
          <Select id="a-tz" value={tz} onChange={(e) => setTz(e.target.value)}>
            {(ZONES.includes(tz) ? ZONES : [tz, ...ZONES]).map((z) => (
              <option key={z}>{z}</option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="flex gap-2">
        <Button onClick={save} disabled={pending || !name.trim()} size="sm">
          {pending ? t("common.saving") : t("common.save")}
        </Button>
        <Button variant="ghost" size="sm" onClick={onDone}>
          {t("common.cancel")}
        </Button>
      </div>
    </div>
  );
}
