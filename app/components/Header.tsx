"use client";

import { PiggyBank, Sun, Moon, Bell, ChevronDown, LogOut, Menu } from "lucide-react";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { getUserProfile, signOut } from "../actions/authActions";

export function Header() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [profile, setProfile] = useState<any>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const response = await fetch("/api/auth/me");
        const data = await response.json();
        if (data.profile) {
          setProfile(data.profile);
        }
      } catch (err) {
        console.error("Error loading profile via API:", err);
      }
    };
    loadProfile();

    const savedTheme = localStorage.getItem("theme") as "dark" | "light";
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.setAttribute("data-theme", savedTheme);
    }
  }, []);

  const toggleTheme = (newTheme: "dark" | "light") => {
    setTheme(newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
  };

  const toggleMobileMenu = () => {
    document.body.classList.toggle("mobile-menu-open");
  };

  const getPageTitle = () => {
    if (pathname === "/") return "Dashboard";
    if (pathname === "/produtos") return "Produtos";
    if (pathname === "/vendas") return "Vendas";
    if (pathname === "/integracoes") return "Integrações";
    if (pathname === "/admin/aprovacoes") return "Aprovações";
    if (pathname === "/configuracoes") return "Configurações";
    return "Dashboard";
  };

  const getInitials = (name: string) => {
    if (!name) return "U";
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <header className="top-bar">
      <div className="flex items-center gap-3">
        <button className="mobile-menu-btn" onClick={toggleMobileMenu}>
          <Menu size={24} />
        </button>
        <h1 className="page-title">{getPageTitle()}</h1>
      </div>

      <div className="top-bar-actions">
        {/* Theme Toggle */}
        <div className="theme-toggle">
          <button 
            className={`toggle-btn ${theme === "light" ? "active" : ""}`}
            onClick={() => toggleTheme("light")}
          >
            <Sun size={14} />
          </button>
          <button 
            className={`toggle-btn ${theme === "dark" ? "active" : ""}`}
            onClick={() => toggleTheme("dark")}
          >
            <Moon size={14} />
          </button>
        </div>

        {/* Notifications */}
        <button className="icon-btn">
          <Bell size={20} />
        </button>

        {/* Profile */}
        <div className="profile-container" style={{ position: 'relative' }}>
          <div 
            className="profile-widget" 
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            style={{ cursor: 'pointer' }}
          >
            <div className="avatar">
              {profile ? getInitials(profile.full_name || profile.email) : "..."}
            </div>
            <span className="profile-name">
              {profile?.full_name || profile?.email?.split('@')[0] || "Usuário"}
            </span>
            <ChevronDown size={14} color="#a1a1aa" style={{ 
              transform: isProfileOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s'
            }} />
          </div>

          {isProfileOpen && (
            <div className="profile-dropdown" style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '8px',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: '12px',
              padding: '8px',
              minWidth: '160px',
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
              zIndex: 1000
            }}>
              <button 
                onClick={() => signOut()}
                className="dropdown-item"
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: '#ef4444',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <LogOut size={16} />
                Sair da conta
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

