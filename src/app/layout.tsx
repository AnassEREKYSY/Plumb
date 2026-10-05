import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/providers/providers";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return {
    title: { default: dict.meta.title, template: "%s · Plumb" },
    description: dict.meta.description,
    applicationName: "Plumb",
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf8f5" },
    { media: "(prefers-color-scheme: dark)", color: "#141016" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const { locale, dict } = await getI18n();
  return (
    <html lang={locale} suppressHydrationWarning>
      <body className="min-h-dvh">
        <Providers locale={locale} dict={dict}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
