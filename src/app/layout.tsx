import type { Metadata, Viewport } from "next";
import { Bodoni_Moda, Plus_Jakarta_Sans } from "next/font/google";

import { AuthProvider } from "@/components/auth-provider";
import { BottomNav, SiteHeader } from "@/components/site-nav";
import { ToastProvider } from "@/components/toast";
import { SITE_URL } from "@/lib/env";
import { THEME_COLORS, THEME_SCRIPT } from "@/lib/theme-script";

import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"], display: "swap" });
// Didona de revista de moda: solo para la marca y títulos grandes
const bodoni = Bodoni_Moda({ variable: "--font-bodoni", subsets: ["latin"], display: "swap" });

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
  // Barra del navegador: del color del fondo en cada tema (el rosa en superficies grandes cansa la vista).
  // Si la clienta elige un tema a mano, THEME_SCRIPT ajusta estas etiquetas.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: THEME_COLORS.light },
    { media: "(prefers-color-scheme: dark)", color: THEME_COLORS.dark },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: THEME_SCRIPT pone data-theme en <html> antes de que React hidrate
    <html lang="es-MX" className={`${jakarta.variable} ${bodoni.variable} antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
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
