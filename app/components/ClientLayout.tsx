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

  const closeMobileMenu = () => {
    document.body.classList.remove("mobile-menu-open");
  };

  return (
    <LoadingProvider>
      <AuthGuard>
        <Sidebar />
        <div className="mobile-overlay" onClick={closeMobileMenu}></div>
        <main>
          {children}
        </main>
      </AuthGuard>
    </LoadingProvider>
  );
}
