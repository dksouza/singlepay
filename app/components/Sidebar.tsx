"use client";
import {
  LayoutDashboard,
  DollarSign,
  Package,
  BarChart3,
  Layers,
  Mail,
  Users,
  Code2,
  Settings,
  Plug,
  Zap,
  Sidebar as SidebarIcon,
  CreditCard
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { getUserStatus } from "../actions/authActions";

export function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [isAdmin, setIsAdmin] = useState(false);
  const [revenue, setRevenue] = useState(0);

  useEffect(() => {
    const checkAdminAndRevenue = async () => {
      try {
        const response = await fetch("/api/auth/me");
        const data = await response.json();
        if (data.profile) {
          setIsAdmin(data.profile.is_admin || false);
        }
      } catch (err) {
        console.error("Error checking admin status:", err);
      }

      try {
        const dashboardRes = await fetch("/api/dashboard?period=total");
        const dashboardData = await dashboardRes.json();
        if (dashboardData) {
          const brl = dashboardData.totalSalesValueBRL || 0;
          const usd = dashboardData.totalSalesValueUSD || 0;
          const eur = dashboardData.totalSalesValueEUR || 0;
          
          // Using conversion rates consistent with the dashboard (USD x 5, EUR x 5.5)
          const totalConvertedRevenue = brl + (usd * 5) + (eur * 5.5);
          setRevenue(totalConvertedRevenue);
        }
      } catch (err) {
        console.error("Error loading revenue via API:", err);
      }
    };
    checkAdminAndRevenue();

    // Initial theme check
    const currentTheme = document.documentElement.getAttribute("data-theme") as "dark" | "light" || "dark";
    setTheme(currentTheme);
    // ... existing theme observer code ...
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "data-theme") {
          const newTheme = document.documentElement.getAttribute("data-theme") as "dark" | "light";
          setTheme(newTheme || "light");
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true });

    if (isCollapsed) {
      document.body.classList.add("sidebar-collapsed");
    } else {
      document.body.classList.remove("sidebar-collapsed");
    }

    return () => observer.disconnect();
  }, [isCollapsed]);

  const getLogo = () => {
    if (isCollapsed) return "/logo-1000x1000.webp";
    return theme === "light" ? "/logo2.webp" : "/logo1.webp";
  };

  const closeMobileMenu = () => {
    document.body.classList.remove("mobile-menu-open");
  };

  const getProgressData = (currentRevenue: number) => {
    let goal = 10000;
    let label = "R$ 10K";
    let start = 0;

    if (currentRevenue >= 100000) {
      start = 100000;
      goal = 1000000;
      label = "R$ 1M";
    } else if (currentRevenue >= 10000) {
      start = 10000;
      goal = 100000;
      label = "R$ 100K";
    }

    const progress = Math.min(100, Math.max(0, ((currentRevenue - start) / (goal - start)) * 100));

    return { goal, label, progress };
  };

  const { label, progress } = getProgressData(revenue);
  const formattedRevenue = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(revenue);

  return (
    <aside className={isCollapsed ? "collapsed" : ""}>
      <button className="mobile-close-btn" onClick={closeMobileMenu}>
        <SidebarIcon size={20} />
      </button>

      <div className="logo-container">
        <div
          className="logo-wrapper"
          onClick={() => isCollapsed && setIsCollapsed(false)}
          style={{ cursor: isCollapsed ? "pointer" : "default" }}
        >
          <img
            src={getLogo()}
            alt="SinglePay"
            className={isCollapsed ? "logo-img-small" : "logo-img-full"}
          />
        </div>

        {!isCollapsed && (
          <button
            className="icon-btn"
            onClick={() => setIsCollapsed(true)}
          >
            <SidebarIcon size={18} />
          </button>
        )}
      </div>

      <nav className="nav-group">
        <Link href="/" className={`nav-item ${pathname === "/" ? "active" : ""}`} onClick={closeMobileMenu}>
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </Link>
        <Link href="/vendas" className={`nav-item ${pathname === "/vendas" ? "active" : ""}`} onClick={closeMobileMenu}>
          <DollarSign size={20} />
          <span>Vendas</span>
        </Link>
        <Link href="/produtos" className={`nav-item ${pathname === "/produtos" ? "active" : ""}`} onClick={closeMobileMenu}>
          <Package size={20} />
          <span>Produtos</span>
        </Link>

        <Link href="/integracoes" className={`nav-item ${pathname === "/integracoes" ? "active" : ""}`} onClick={closeMobileMenu}>
          <Plug size={20} />
          <span>Integrações</span>
        </Link>

        {isAdmin && (
          <>
            <div className="nav-divider"></div>
            <Link href="/admin/aprovacoes" className={`nav-item ${pathname === "/admin/aprovacoes" ? "active" : ""}`} onClick={closeMobileMenu}>
              <Users size={20} />
              <span>Aprovações</span>
            </Link>
          </>
        )}

        <div className="nav-divider"></div>

        <Link href="/cobrancas" className={`nav-item ${pathname === "/cobrancas" ? "active" : ""}`} onClick={closeMobileMenu}>
          <CreditCard size={20} />
          <span>Cobranças</span>
        </Link>

        <Link href="/configuracoes" className={`nav-item ${pathname === "/configuracoes" ? "active" : ""}`} onClick={closeMobileMenu}>
          <Settings size={20} />
          <span>Configurações</span>
        </Link>
      </nav>

      {!isCollapsed && (
        <div style={{ marginTop: 'auto', padding: '0 12px' }}>
          <div style={{ 
            background: 'linear-gradient(90deg, var(--accent), #d946ef)', 
            padding: '1px', 
            borderRadius: '13px', 
            boxShadow: '0 0 15px rgba(139, 92, 246, 0.25)' 
          }}>
            <div className="billing-widget" style={{ padding: '10px 14px', flexDirection: 'column', alignItems: 'flex-start', gap: '8px', minWidth: '100%', border: 'none', borderRadius: '12px', backgroundColor: 'var(--bg-card)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', width: '100%' }}>
                <span style={{ fontWeight: 'bold', fontSize: '15px', color: 'var(--text-primary)' }}>Progresso</span>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Meta de faturamento</span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', marginTop: '4px' }}>
                <span style={{ fontWeight: 'bold', fontSize: '14px', color: 'var(--text-primary)' }}>
                  {formattedRevenue}
                </span>
                <span style={{ fontWeight: 'bold', fontSize: '14px', color: 'var(--text-primary)' }}>
                  {label}
                </span>
              </div>
              
              <div className="billing-progress-container" style={{ width: '100%', height: '8px', backgroundColor: 'var(--bg-card-hover)', borderRadius: '4px', overflow: 'hidden' }}>
                <div className="billing-progress-bar" style={{ width: `${progress}%`, height: '100%', backgroundColor: '#22c55e', backgroundImage: 'none', borderRadius: '4px' }}></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

