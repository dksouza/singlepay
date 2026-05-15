"use client";

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { Header } from "../components/Header";
import { User, Mail, Lock, Shield, Save, AlertCircle, CheckCircle2, Code } from "lucide-react";
import { getUserProfile, changePassword, updateProfile } from "../actions/authActions";
import { useLoading } from "../context/LoadingContext";


export default function SettingsPage() {
  const [profile, setProfile] = useState<any>(null);
  const { setIsLoading } = useLoading();
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      setIsLoading(true);
      try {
        const response = await fetch("/api/auth/me", { cache: 'no-store' });
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
    setPasswordMessage(null);
    
    const formData = new FormData(e.currentTarget);
    const newPass = formData.get("new_password") as string;
    const confirmPass = formData.get("confirm_password") as string;

    if (newPass !== confirmPass) {
      setPasswordMessage({ type: 'error', text: 'As novas senhas não coincidem.' });
      return;
    }

    if (newPass.length < 6) {
      setPasswordMessage({ type: 'error', text: 'A nova senha deve ter pelo menos 6 caracteres.' });
      return;
    }

    setIsLoading(true);
    const result = await changePassword(formData);
    
    // Artificial delay to show the nice spinner
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (result.success) {
      setPasswordMessage({ type: 'success', text: result.success });
      (e.target as HTMLFormElement).reset();
    } else {
      setPasswordMessage({ type: 'error', text: result.error || 'Erro ao alterar senha' });
    }
    setIsLoading(false);
  };

  const handleProfileUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setProfileMessage(null);
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await updateProfile(formData);

    await new Promise(resolve => setTimeout(resolve, 800));

    if (result.success) {
      setProfileMessage({ type: 'success', text: result.success });
      // Update local state
      setProfile({ ...profile, checkout_head_scripts: formData.get("checkout_head_scripts") });
    } else {
      setProfileMessage({ type: 'error', text: result.error || 'Erro ao atualizar perfil' });
    }
    setIsLoading(false);
  };

  return (
    <>
      <Header />

      <div className="flex flex-responsive justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold">Configurações da Conta</h2>
          <p className="text-secondary text-sm">Gerencie seus dados pessoais e segurança</p>
        </div>
      </div>

      <div className="nav-divider" style={{ marginBottom: "32px" }}></div>

      <div className="flex flex-col md:flex-row gap-6">
        
        {/* Personal Data - Read Only */}
        <div className="card flex-1">
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

        {/* Checkout Customization */}
        <div className="card flex-1">
          <div className="card-header">
            <div className="flex items-center gap-2">
              <Code size={18} className="text-accent" />
              <h3 className="card-title">Personalização do Checkout</h3>
            </div>
          </div>
          <div className="card-body">
            <form onSubmit={handleProfileUpdate}>
              {profileMessage && (
                <div className={`auth-message ${profileMessage.type === 'success' ? 'success' : 'error'}`} style={{ marginBottom: '20px' }}>
                  {profileMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  {profileMessage.text}
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Scripts Customizados (Header)</label>
                <textarea 
                  name="checkout_head_scripts"
                  className="form-textarea min-h-[150px] font-mono text-xs" 
                  placeholder="<!-- Cole aqui seus pixels, Google Analytics, etc -->"
                  value={profile?.checkout_head_scripts || ""}
                  onChange={(e) => setProfile({ ...profile, checkout_head_scripts: e.target.value })}
                ></textarea>
                <p className="text-[11px] text-secondary mt-2">
                  Estes scripts serão injetados dentro da tag <code>&lt;head&gt;</code> apenas na sua página de checkout pública.
                </p>
              </div>

              <div className="flex justify-end" style={{ marginTop: '20px' }}>
                <button type="submit" className="btn-primary" style={{ padding: '12px 24px' }}>
                  <Save size={18} />
                  Salvar Scripts
                </button>
              </div>
            </form>
          </div>
        </div>

      </div>

      <div className="nav-divider" style={{ margin: "32px 0" }}></div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Security - Change Password */}
        <div className="card max-w-md">
          <div className="card-header">
            <div className="flex items-center gap-2">
              <Lock size={18} className="text-accent" />
              <h3 className="card-title">Segurança e Senha</h3>
            </div>
          </div>
          <div className="card-body">
            <form onSubmit={handlePasswordChange}>
              {passwordMessage && (
                <div className={`auth-message ${passwordMessage.type === 'success' ? 'success' : 'error'}`} style={{ marginBottom: '20px' }}>
                  {passwordMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                  {passwordMessage.text}
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
