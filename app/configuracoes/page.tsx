"use client";

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { Header } from "../components/Header";
import { User, Mail, Lock, Shield, Save, AlertCircle, CheckCircle2, Code, Terminal, Copy } from "lucide-react";
import { getUserProfile, changePassword, updateProfile } from "../actions/authActions";
import { getStripeConfig } from "../actions/integrationActions";
import { useLoading } from "../context/LoadingContext";


export default function SettingsPage() {
  const [profile, setProfile] = useState<any>(null);
  const [stripeConfig, setStripeConfig] = useState<any>(null);
  const { setIsLoading } = useLoading();
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [copyStatus, setCopyStatus] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [profileRes, stripeRes] = await Promise.all([
          fetch("/api/auth/me", { cache: 'no-store' }),
          getStripeConfig()
        ]);

        const data = await profileRes.json();
        if (data.profile) {
          setProfile(data.profile);
        }

        if (stripeRes) {
          setStripeConfig(stripeRes);
        }
      } catch (err) {
        console.error("Error loading settings data:", err);
      }
      // Small delay for premium feel
      setTimeout(() => setIsLoading(false), 500);
    };
    loadData();
  }, []);

  useEffect(() => {
    // Trigger Prism highlighting after data is loaded and DOM is updated
    if (typeof window !== 'undefined' && (window as any).Prism && stripeConfig) {
      (window as any).Prism.highlightAll();
    }
  }, [stripeConfig]);

  const handleCopyScript = () => {
    const scriptText = `<script src="https://js.stripe.com/v3/"></script>
<script>
  // Apenas inicialize com sua Chave Pública (pk_live_...) 
  // Isso já ativa o rastreamento de sinais de fraude.
  const stripe = Stripe('${stripeConfig?.publishable_key || 'sua_chave_publica_aqui'}');
</script>`;

    navigator.clipboard.writeText(scriptText);
    setCopyStatus(true);
    setTimeout(() => setCopyStatus(false), 2000);
  };

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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">

        {/* Personal Data - Read Only */}
        <div className="card w-full" style={{ height: 'auto' }}>
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
        <div className="card w-full" style={{ height: 'auto' }}>
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

      <div className="nav-divider" style={{ margin: "32px 0" }}></div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Checkout Customization */}
        <div className="card w-full" style={{ height: 'auto' }}>
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
                  Estes scripts serão injetados dentro da tag <code className="language-markup font-bold">&lt;head&gt;</code> apenas na sua página de checkout pública.
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

        {/* Global Tracking Script */}
        <div className="card w-full" style={{ height: 'auto' }}>
          <div className="card-header">
            <div className="flex items-center gap-2">
              <Terminal size={18} className="text-accent" />
              <h3 className="card-title">Script de Rastreamento Stripe</h3>
            </div>
          </div>
          <div className="card-body">
            <p className="text-sm text-secondary mb-4 leading-relaxed">
              Copie e cole este script na sua <strong>página de vendas</strong> ou <strong>landing page</strong> para ativar a prevenção de fraudes da Stripe e melhorar a taxa de aprovação.
            </p>

            <div className="relative group">
              <pre className="rounded-xl !p-4 !m-0 !bg-[#1e1e1e] border border-[var(--border-color)] overflow-x-auto transition-all group-hover:border-accent/30 shadow-inner">
                <code className="language-markup">
                  {`<script src="https://js.stripe.com/v3/"></script>
<script>
  // Configurar em Integrações
  const stripe = Stripe('${stripeConfig?.publishable_key || 'sua_chave_publica_aqui'}');
</script>`}
                </code>
              </pre>
              <button
                onClick={handleCopyScript}
                className="absolute top-2 right-2 p-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] text-secondary hover:text-accent hover:border-accent/50 transition-all shadow-sm z-10"
                title="Copiar script"
              >
                {copyStatus ? <CheckCircle2 size={16} className="text-green-500" /> : <Copy size={16} />}
              </button>
            </div>

            <div className="mt-4 p-4 rounded-xl bg-accent/5 border border-accent/10">
              <p className="text-[11px] text-accent/80 flex items-start gap-2">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                <span>
                  O script acima já utiliza sua <strong>Chave Pública</strong> configurada na aba de Integrações.
                  Certifique-se de que a chave está correta para que o rastreamento funcione.
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
