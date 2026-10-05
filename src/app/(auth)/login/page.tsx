import { AuthForm } from "@/components/app/auth-form";
import { getI18n } from "@/lib/i18n/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("auth.login") };
}

export default async function LoginPage(props: PageProps<"/login">) {
  const sp = await props.searchParams;
  return <AuthForm mode="login" next={typeof sp.next === "string" ? sp.next : undefined} configured={isSupabaseConfigured} confirmError={sp.error === "confirm"} />;
}
