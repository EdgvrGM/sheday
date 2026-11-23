import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";

import { AuthProvider } from "@/components/auth-provider";
import { BottomNav, SiteHeader } from "@/components/site-nav";
import { ToastProvider } from "@/components/toast";
import { SITE_URL } from "@/lib/env";

import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Sheday — Ropa para mujer", template: "%s | Sheday" },
  description:
    "Ropa para mujer con entrega inmediata y sobre pedido. Haz tu pedido en línea y paga en efectivo al recibir.",
  applicationName: "Sheday",
  appleWebApp: { capable: true, title: "Sheday", statusBarStyle: "default" },
  formatDetection: { telephone: false },
  openGraph: { type: "website", locale: "es_MX", siteName: "Sheday" },
};

export const viewport: Viewport = {
  themeColor: "#c2185b",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-MX" className={`${jakarta.variable} antialiased`}>
      <body className="flex min-h-dvh flex-col font-sans">
        <AuthProvider>
          <ToastProvider>
            <SiteHeader />
            <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 pt-4 pb-28 md:pb-12">{children}</main>
            <BottomNav />
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
