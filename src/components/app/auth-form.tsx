"use client";
import Link from "next/link";
import { useActionState } from "react";
import { enterDemoAction, signInAction, signUpAction, type AuthState } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { useI18n } from "@/lib/i18n/client";

export function AuthForm({ mode, next, configured, confirmError }: { mode: "login" | "signup"; next?: string; configured: boolean; confirmError?: boolean }) {
  const { t } = useI18n();
  const [state, action, pending] = useActionState<AuthState, FormData>(mode === "login" ? signInAction : signUpAction, undefined);
  const err = state?.error;
  const message =
    err === "invalid" ? t("auth.invalid") : err === "notConfigured" ? t("auth.notConfigured") : err ? err : confirmError ? t("common.error") : null;

  return (
    <div>
      <h1 className="font-display text-[2.2rem] leading-tight font-medium text-ink">{mode === "login" ? t("auth.loginTitle") : t("auth.signupTitle")}</h1>
      <p className="mt-2 text-[14px] text-muted">{mode === "login" ? t("auth.loginSubtitle") : t("auth.signupSubtitle")}</p>

      {!configured && <p className="mt-6 rounded-md border border-ochre/30 bg-ochre-tint px-3 py-2.5 text-[13px] text-ink">{t("auth.notConfigured")}</p>}

      {state?.info === "checkEmail" ? (
        <p className="mt-8 rounded-md border border-gain/30 bg-gain-tint px-4 py-3 text-[14px] text-ink">{t("auth.checkEmail")}</p>
      ) : (
        <form action={action} className="mt-8 space-y-4">
          <input type="hidden" name="next" value={next ?? ""} />
          {mode === "signup" && (
            <Field label={t("auth.name")} htmlFor="name">
              <Input id="name" name="name" autoComplete="given-name" disabled={!configured} />
            </Field>
          )}
          <Field label={t("auth.email")} htmlFor="email">
            <Input id="email" name="email" type="email" autoComplete="email" required disabled={!configured} />
          </Field>
          <Field label={t("auth.password")} htmlFor="password" hint={mode === "signup" ? t("auth.passwordHint") : undefined}>
            <Input id="password" name="password" type="password" minLength={8} autoComplete={mode === "login" ? "current-password" : "new-password"} required disabled={!configured} />
          </Field>
          {message && configured && <p className="text-[13px] text-loss">{message}</p>}
          <Button type="submit" size="lg" className="w-full" disabled={pending || !configured}>
            {pending ? "…" : mode === "login" ? t("auth.login") : t("auth.signup")}
          </Button>
        </form>
      )}

      <div className="my-6 flex items-center gap-3 text-[12px] text-muted">
        <span className="h-px flex-1 bg-line" />
        {t("auth.or")}
        <span className="h-px flex-1 bg-line" />
      </div>
      <form action={enterDemoAction}>
        <Button type="submit" variant="secondary" size="lg" className="w-full">
          {t("auth.tryDemo")}
        </Button>
      </form>

      {configured && (
        <p className="mt-8 text-center text-[13.5px] text-muted">
          {mode === "login" ? t("auth.noAccount") : t("auth.hasAccount")}{" "}
          <Link href={mode === "login" ? "/signup" : "/login"} className="font-medium text-plum hover:underline">
            {mode === "login" ? t("auth.signup") : t("auth.login")}
          </Link>
        </p>
      )}
    </div>
  );
}
