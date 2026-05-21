"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getUserStatus } from "../actions/authActions";
import { Loader2 } from "lucide-react";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    const checkStatus = async () => {
      // Simplificação total para garantir que /pay nunca peça login
      const isPublicPage = pathname === "/login" || /^\/pay(\/|$)/.test(pathname) || pathname === "/aguardando-aprovacao" || pathname === "/auth/callback";

      if (isPublicPage) {
        console.log("Auth Guard: Public route detected, bypassing check.", pathname);
        setIsLoading(false);
        return;
      }

      try {
        const result = await getUserStatus();
        console.log("Auth Guard Status Check:", result, "Path:", pathname);
        
        if (!result) {
          setIsLoading(false);
          return;
        }

        // 1. If user is ADMIN, they have total access, never block
        if (result.isAdmin === true) {
          if (pathname === "/aguardando-aprovacao") {
            router.push("/");
          }
          setIsLoading(false);
          return;
        }

        // 2. If user is NOT admin, check approval status
        if (result.status === 'pending' || result.status === 'blocked') {
          if (pathname !== "/aguardando-aprovacao") {
            router.push("/aguardando-aprovacao");
          }
          setIsLoading(false);
          return;
        }

        // 3. Approved users go to dashboard if they are on the pending page
        if (result.status === 'approved' && pathname === "/aguardando-aprovacao") {
          router.push("/");
          setIsLoading(false);
          return;
        }

        // 4. If user doesn't have a valid card or is blocked by billing, block access to all pages except dashboard and billing
        if (result.status === 'approved' && (result.hasValidCard === false || result.isBlockedByBilling)) {
          const allowedPaths = ["/", "/cobrancas", "/aguardando-aprovacao"];
          if (!allowedPaths.includes(pathname)) {
            router.push("/cobrancas");
            setIsLoading(false);
            return;
          }
        }

        setIsLoading(false);
      } catch (error) {
        console.error("Auth Guard Error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkStatus();
  }, [pathname, router]);

  const isPublicRoute = 
    pathname === "/login" || 
    /^\/pay(\/|$)/.test(pathname) || 
    pathname === "/auth/callback";

  if (isLoading && !isPublicRoute) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center', 
        backgroundColor: 'var(--bg-main)',
        color: 'var(--text-primary)'
      }}>
        <Loader2 style={{ color: 'var(--accent)', marginBottom: '16px', animation: 'spin 1s linear infinite' }} size={40} />
        <p style={{ fontWeight: '500', opacity: 0.7 }}>Verificando conta...</p>
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return <>{children}</>;
}
