"use client";

export const runtime = 'edge';
export const dynamic = 'force-dynamic';


import { useState } from "react";
import { login, signup } from "../actions/authActions";
import { Mail, Lock, Loader2, ArrowRight, User, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const formData = new FormData(e.currentTarget);
    const result = isLogin ? await login(formData) : await signup(formData);

    const authResult = result as any;
    if (authResult?.error) {
      setMessage({ type: "error", text: authResult.error });
      setLoading(false);
    } else if (authResult?.success) {
      setMessage({ type: "success", text: authResult.success });
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            <img src="/logo1.webp" alt="SinglePay" className="login-logo" />
            <h1>{isLogin ? "Bem-vindo de volta" : "Crie sua conta"}</h1>
            <p>{isLogin ? "Acesse seu painel Singlepay" : "Comece a gerenciar seus produtos hoje"}</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            {!isLogin && (
              <div className="form-group animate-fadeIn">
                <label className="form-label">Nome Completo</label>
                <div className="input-with-icon">
                  <User size={18} className="input-icon" />
                  <input
                    name="full_name"
                    type="text"
                    className="form-input"
                    placeholder="Seu nome completo"
                    required={!isLogin}
                  />
                </div>
              </div>
            )}
            <div className="form-group">
              <label className="form-label">E-mail</label>
              <div className="input-with-icon">
                <Mail size={18} className="input-icon" />
                <input
                  name="email"
                  type="email"
                  className="form-input"
                  placeholder="seu@email.com"
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Senha</label>
              <div className="input-with-icon relative">
                <Lock size={18} className="input-icon" />
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  className="form-input pr-12"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  className="absolute right-4 icon-btn"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {message && (
              <div className={`auth-message ${message.type}`}>
                {message.text}
              </div>
            )}

            <button type="submit" className="btn-primary login-submit" disabled={loading}>
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  {isLogin ? "Entrar" : "Cadastrar"}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <div className="login-footer">
            <p>
              {isLogin ? "Não tem uma conta?" : "Já tem uma conta?"}{" "}
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="auth-toggle"
              >
                {isLogin ? "Criar conta" : "Fazer login"}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
