import type { Metadata } from "next";
import { Inter, Geist } from "next/font/google";
import "./globals.css";
import { Sidebar } from "./components/Sidebar";
import Script from "next/script";

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
    icon: "/logo-1000x1000.webp",
    shortcut: "/logo-1000x1000.webp",
    apple: "/logo-1000x1000.webp",
  },
};

import { ClientLayout } from "./components/ClientLayout";
import { PWARegistration } from "./components/PWARegistration";
import { cn } from "@/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-br" className={cn("font-sans", geist.variable)}>
      <head>
        <link rel="preconnect" href="https://js.stripe.com" />
        <link rel="dns-prefetch" href="https://js.stripe.com" />
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism-tomorrow.min.css" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <PWARegistration />
        <ClientLayout>
          {children}
        </ClientLayout>
        <Script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/prism.min.js" strategy="afterInteractive" />
        <Script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/plugins/autoloader/prism-autoloader.min.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
