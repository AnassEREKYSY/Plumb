import { AuthForm } from "@/components/app/auth-form";
import { getI18n } from "@/lib/i18n/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t("auth.signup") };
}

export default function SignupPage() {
  return <AuthForm mode="signup" configured={isSupabaseConfigured} />;
}
