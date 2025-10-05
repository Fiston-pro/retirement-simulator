import "./globals.css";
import type { Metadata } from "next";
import { Header, AssistantWidget, pageGradient } from "@/components/site/ui";
import { SkipLink } from "@/components/a11y/WCAGKit";
import { UserProvider } from "@/lib/userCtx";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";


export const metadata: Metadata = { title: "My Future", description: "Educational tool for future pensions (ZUS)" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <body className={`min-h-dvh ${pageGradient} text-[#001B2E]`}>
        <SkipLink />
        <UserProvider>
          <Header />
          <main id="main" role="main" className="max-w-7xl mx-auto w-full px-4 sm:px-6 pt-4 pb-20">
            {children}
          </main>
          <AssistantWidget />
        </UserProvider>
      </body>
    </html>
  );
}
