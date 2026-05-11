"use client";

import { useState, useEffect } from "react";
import { Header } from "../components/Header";
import { User, Mail, Lock, Shield, Save, AlertCircle, CheckCircle2 } from "lucide-react";
import { getUserProfile, changePassword } from "../actions/authActions";
import { useLoading } from "../context/LoadingContext";

export const runtime = 'edge';
export const dynamic = 'force-dynamic';
export const dynamic = 'force-dynamic';

export default function SettingsPage() {
  const [profile, setProfile] = useState<any>(null);
  const { setIsLoading } = useLoading();
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/auth/me");
        const data = await response.json();
        if (data.profile) {
          setProfile(data.profile);
        }
      } catch (err) {
        console.error("Error loading settings profile:", err);
      }
      // Small delay for premium feel
      setTimeout(() => setIsLoading(false), 500);
    };
    loadProfile();
  }, []);

  const handlePasswordChange = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage(null);
    
    const formData = new FormData(e.currentTarget);
    const newPass = formData.get("new_password") as string;
    const confirmPass = formData.get("confirm_password") as string;

    if (newPass !== confirmPass) {
      setMessage({ type: 'error', text: 'As novas senhas não coincidem.' });
      return;
    }

    if (newPass.length < 6) {
      setMessage({ type: 'error', text: 'A nova senha deve ter pelo menos 6 caracteres.' });
      return;
    }

    setIsLoading(true);
    const result = await changePassword(formData);
    
    // Artificial delay to show the nice spinner
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (result.success) {
      setMessage({ type: 'success', text: result.success });
      (e.target as HTMLFormElement).reset();
    } else {
      setMessage({ type: 'error', text: result.error || 'Erro ao alterar senha' });
    }
    setIsLoading(false);
  };

  return (
    <>
      <Header />

      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold">Configurações da Conta</h2>
          <p className="text-secondary text-sm">Gerencie seus dados pessoais e segurança</p>
        </div>
      </div>

      <div className="nav-divider" style={{ marginBottom: "32px" }}></div>

      <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
        
        {/* Personal Data - Read Only */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center gap-2">
              <User size={18} className="text-accent" />
              <h3 className="card-title">Dados Pessoais</h3>
            </div>
          </div>
          <div className="card-body">
            <div className="form-group">
              <label className="form-label">Nome Completo</label>
              <div className="input-with-icon">
                <User className="input-icon" size={16} />
                <input 
                  type="text" 
                  className="form-input" 
                  value={profile?.full_name || ""} 
                  readOnly 
                  style={{ opacity: 0.7, cursor: 'not-allowed', backgroundColor: 'var(--bg-main)' }}
                />
              </div>
              <p className="text-[11px] text-secondary mt-1">O nome completo não pode ser alterado pelo próprio usuário.</p>
            </div>

            <div className="form-group">
              <label className="form-label">E-mail de Acesso</label>
              <div className="input-with-icon">
                <Mail className="input-icon" size={16} />
                <input 
                  type="email" 
                  className="form-input" 
                  value={profile?.email || ""} 
                  readOnly 
                  style={{ opacity: 0.7, cursor: 'not-allowed', backgroundColor: 'var(--bg-main)' }}
                />
              </div>
              <p className="text-[11px] text-secondary mt-1">Para alterar seu e-mail, entre em contato com o suporte.</p>
            </div>

            <div className="form-group">
              <label className="form-label">Tipo de Conta</label>
              <div className="flex items-center gap-2 px-4 py-3 bg-[var(--bg-main)] border border-[var(--border-color)] rounded-xl">
                <Shield size={16} className="text-accent" />
                <span className="text-sm font-semibold uppercase tracking-wider">
                  {profile?.is_admin ? "Administrador" : "Vendedor"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Security - Change Password */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center gap-2">
              <Lock size={18} className="text-accent" />
              <h3 className="card-title">Segurança e Senha</h3>
            </div>
          </div>
          <div className="card-body">
            <form onSubmit={handlePasswordChange}>
              {message && (
                <div className={`auth-message ${message.type === 'success' ? 'success' : 'error'}`} style={{ marginBottom: '20px' }}>
                  {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  {message.text}
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Senha Atual</label>
                <div className="input-with-icon">
                  <Lock className="input-icon" size={16} />
                  <input 
                    name="old_password"
                    type="password" 
                    className="form-input" 
                    placeholder="••••••••" 
                    required 
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Nova Senha</label>
                <div className="input-with-icon">
                  <Lock className="input-icon" size={16} />
                  <input 
                    name="new_password"
                    type="password" 
                    className="form-input" 
                    placeholder="••••••••" 
                    required 
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Confirmar Nova Senha</label>
                <div className="input-with-icon">
                  <Lock className="input-icon" size={16} />
                  <input 
                    name="confirm_password"
                    type="password" 
                    className="form-input" 
                    placeholder="••••••••" 
                    required 
                  />
                </div>
              </div>

              <div className="flex justify-end" style={{ marginTop: '20px' }}>
                <button type="submit" className="btn-primary" style={{ padding: '12px 24px' }}>
                  <Save size={18} />
                  Atualizar Senha
                </button>
              </div>
            </form>
          </div>
        </div>

      </div>
    </>
  );
}
