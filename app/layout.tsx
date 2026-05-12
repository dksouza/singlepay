import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "./components/Sidebar";

const inter = Inter({ subsets: ["latin"] });

export const viewport = {
  themeColor: "#8b5cf6",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: "SinglePay - Dashboard",
  description: "Plataforma de pagamentos SinglePay",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SinglePay",
  },
  icons: {
    icon: "/logo-1000x1000.png",
    shortcut: "/logo-1000x1000.png",
    apple: "/logo-1000x1000.png",
  },
};

import { ClientLayout } from "./components/ClientLayout";
import { PWARegistration } from "./components/PWARegistration";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-br">
      <body className={inter.className} suppressHydrationWarning>
        <PWARegistration />
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}
