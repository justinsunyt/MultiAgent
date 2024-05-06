import type { Metadata } from "next";
import "./globals.css";
import localFont from "next/font/local";
import UserProvider from "@/context/userContext";
import { ThemeProvider } from "next-themes";
import { createClient } from "@/utils/supabase/server";
import ReactQueryClientProvider from "@/components/reactQueryClientProvider";
import SidebarProvider from "@/context/sidebarContext";
import { Toaster } from "sonner";

export const spaceGrotesk = localFont({
  src: "./SpaceGrotesk.ttf",
  display: "swap",
});

export const metadata: Metadata = {
  title: "MultiAgent",
  description:
    "Autonomous Web Browsing AI Agent with Vision - powered by MultiOn",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html className="h-full" lang="en" suppressHydrationWarning>
      <body className={"h-full bg-zinc-950 " + spaceGrotesk.className}>
        <ReactQueryClientProvider>
          <UserProvider user={user}>
            <SidebarProvider>
              <ThemeProvider
                attribute="class"
                defaultTheme="dark"
                enableSystem={false}
                disableTransitionOnChange
              >
                {children}
                <Toaster richColors />
              </ThemeProvider>
            </SidebarProvider>
          </UserProvider>
        </ReactQueryClientProvider>
      </body>
    </html>
  );
}
