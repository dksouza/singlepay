"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { LoadingProvider } from "../context/LoadingContext";
import { AuthGuard } from "./AuthGuard";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublicPage = pathname === "/login" || /^\/pay(\/|$)/.test(pathname) || pathname === "/aguardando-aprovacao" || pathname === "/auth/callback";

  if (isPublicPage) {
    return (
      <LoadingProvider>
        {children}
      </LoadingProvider>
    );
  }

  return (
    <LoadingProvider>
      <AuthGuard>
        <Sidebar />
        <main>
          {children}
        </main>
      </AuthGuard>
    </LoadingProvider>
  );
}
