import { AppShell } from "@/components/app/shell";
import { getSelectedAccount, getWorkspace } from "@/lib/data";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const ws = await getWorkspace();
  const account = await getSelectedAccount(ws);
  return (
    <AppShell accounts={ws.accounts} selected={account?.id ?? "all"} demo={ws.mode === "demo"} email={ws.userEmail}>
      {children}
    </AppShell>
  );
}
