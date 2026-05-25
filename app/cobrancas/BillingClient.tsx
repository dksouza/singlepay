"use client";

import { useState, useEffect } from "react";
import { CreditCard, Check, Loader2, Zap, Shield, Crown, AlertCircle, ChevronRight, Settings2, Calendar, DollarSign, ShieldCheck, Plus, Sparkles, ArrowUpRight } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { updatePlan, createSetupIntent, processManualBilling } from "../actions/billingActions";
import { Header } from "../components/Header";

const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripeKey ? loadStripe(stripeKey) : null;

function SetupForm({ onComplete }: { onComplete: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    // Check current theme on mount
    const currentTheme = document.documentElement.getAttribute("data-theme") as "dark" | "light" || "dark";
    setTheme(currentTheme);

    // Watch for theme changes dynamically
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "data-theme") {
          const newTheme = document.documentElement.getAttribute("data-theme") as "dark" | "light";
          setTheme(newTheme || "dark");
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => observer.disconnect();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    const result = await createSetupIntent();
    
    if (result.error) {
      setMessage(result.error);
      setLoading(false);
      return;
    }

    const { error } = await stripe.confirmCardSetup(result.clientSecret!, {
      payment_method: {
        card: elements.getElement(CardElement)!,
      },
    });

    if (error) {
      setMessage(error.message || "Erro na verificação do cartão.");
      setLoading(false);
    } else {
      setMessage("Método de pagamento validado!");
      setLoading(false);
      onComplete();
    }
  };

  const cardTextColor = theme === "dark" ? "#ffffff" : "#0f172a";
  const cardPlaceholderColor = theme === "dark" ? "#a1a1aa" : "#475569";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label className="form-label text-xs uppercase tracking-widest opacity-70">Dados do Cartão</label>
        <div className="form-input focus-within:ring-1 focus-within:ring-accent focus-within:border-accent">
          <CardElement options={{
            hidePostalCode: true,
            style: {
              base: {
                fontSize: '15px',
                color: cardTextColor,
                fontFamily: 'Inter, sans-serif',
                '::placeholder': { color: cardPlaceholderColor },
              },
            },
          }} />
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || !stripe}
        className="btn-primary py-4 justify-center"
        style={{ alignSelf: 'flex-start' }}
      >
        {loading ? <Loader2 className="animate-spin" size={18} /> : "Vincular Cartão de Crédito"}
      </button>

      {message && (
        <div className={`p-4 rounded-xl text-xs font-bold text-center ${message.includes("validado") ? "bg-emerald-500\/10 text-emerald-500 border border-emerald-500\/20" : "bg-rose-500\/10 text-rose-500 border border-rose-500\/20"}`}>
          {message}
        </div>
      )}
    </form>
  );
}

export default function BillingClient({ initialData }: { initialData: any }) {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const { profile, totalUnbilled, plans, cardDetails, billingHistory } = initialData;
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [planToConfirm, setPlanToConfirm] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [isPaying, setIsPaying] = useState(false);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  const handleManualPayment = async () => {
    setIsPaying(true);
    setToast(null);
    try {
      await processManualBilling();
      setToast({ message: "Pagamento efetuado com sucesso!", type: 'success' });
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err: any) {
      console.error(err);
      setToast({ message: err.message || "Falha ao processar pagamento.", type: 'error' });
      setTimeout(() => setToast(null), 4000);
    } finally {
      setIsPaying(false);
    }
  };

  const handleUpdatePlan = async (id: string) => {
    if (profile.plan_id === id) return;
    setLoadingPlan(id);
    setUpdateError(null);
    try {
      await updatePlan(id as any);
      window.location.reload();
    } catch (err: any) {
      console.error(err);
      setUpdateError(err.message || "Ocorreu um erro ao atualizar seu plano. Por favor, tente novamente.");
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="animate-in fade-in duration-500 pb-32">
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          padding: '16px 24px',
          borderRadius: '12px',
          backgroundColor: toast.type === 'success' ? 'rgba(34, 197, 94, 0.95)' : 'rgba(239, 68, 68, 0.95)',
          color: '#ffffff',
          fontWeight: 'bold',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          animation: 'slideInRight 0.3s ease-out',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          {toast.type === 'success' ? <Check size={20} strokeWidth={3} /> : <AlertCircle size={20} strokeWidth={3} />}
          <span>{toast.message}</span>
        </div>
      )}
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
      
      <Header />

      {/* Header com espaçamento otimizado */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
        <div className="space-y-3">
          <h2 className="text-4xl font-bold tracking-tight">
            {profile?.is_admin ? "Histórico Geral de Cobranças" : "Minha Assinatura"}
          </h2>
          <p className="text-secondary text-base font-medium opacity-70 max-w-xl">
            {profile?.is_admin 
              ? "Visualize e acompanhe o histórico de faturamento de todos os usuários da plataforma."
              : "Gerencie seu plano e visualize o acumulado de taxas operacionais."}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl flex items-center gap-3 shadow-sm">
            <Shield size={16} className="text-emerald-500" />
            <span className="text-xs font-bold text-secondary uppercase tracking-widest">
              {profile?.is_admin ? "Acesso Administrativo" : "Conta Protegida"}
            </span>
          </div>
        </div>
      </div>

      {/* Summary Row com cards mais limpos */}
      {!profile?.is_admin && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
        <div className="card hover:border-accent\/20 transition-all">
          <div className="flex items-center justify-between mb-8">
            <div className="text-accent">
              <Crown size={24} strokeWidth={2.5} />
            </div>
            <div className="status-tag status-active">
              Ativo
            </div>
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-secondary opacity-40 mb-1">Plano Atual</p>
          <h3 className="text-2xl font-bold capitalize mb-8">
            {plans[profile.plan_id]?.name || profile.plan_id}
          </h3>
          <div className="mt-auto pt-6 border-t border-[var(--border-color)] flex items-center justify-between">
            <span className="text-[11px] font-bold text-secondary uppercase tracking-wider">Sua Taxa</span>
            <span className="text-xl font-bold text-accent">{profile.fee_percentage}%</span>
          </div>
        </div>

        <div className="card hover:border-blue-500\/20 transition-all">
          <div className="flex items-center justify-between mb-8">
            <div className="text-accent">
              <DollarSign size={24} strokeWidth={2.5} />
            </div>
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-secondary opacity-40 mb-1">Taxas Acumuladas</p>
          <h3 className="text-3xl font-bold mb-8 tracking-tight">
            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalUnbilled)}
          </h3>
          <div className="mt-auto pt-6 border-t border-[var(--border-color)] flex flex-col gap-4">
            <div className="flex items-center justify-between text-[11px] font-bold text-secondary">
              <span className="uppercase tracking-wider">Próximo Débito</span>
              <span className="text-primary">{new Date(profile.next_billing_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>
            </div>

            {(totalUnbilled > 0 || profile.billing_failed_attempts > 0) && (
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleManualPayment}
                  disabled={isPaying || !cardDetails}
                  className="w-full btn-primary py-2 justify-center text-xs"
                  style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', border: 'none' }}
                >
                  {isPaying ? <Loader2 className="animate-spin" size={14} /> : "Efetuar pagamento agora"}
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="card hover:border-emerald-500\/20 transition-all flex flex-col justify-between">
          <div className="flex items-center justify-between mb-6">
            <div className="text-accent">
              <CreditCard size={24} strokeWidth={2.5} />
            </div>
            {cardDetails && (
              <span className="status-tag status-active bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[9px] font-bold uppercase tracking-wider">
                Cadastrado
              </span>
            )}
          </div>
          
          <p className="text-[10px] font-black uppercase tracking-widest text-secondary opacity-40 mb-3">Método de Pagamento</p>
          
          <div className="flex-1 mb-6 flex flex-col justify-center">
            {cardDetails ? (
              <div style={{
                background: 'linear-gradient(135deg, #18181b 0%, #09090b 100%)',
                color: '#ffffff',
                padding: '20px',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
                height: '115px'
              }}>
                {/* Background subtle glowing effect */}
                <div style={{
                  position: 'absolute',
                  top: '-24px',
                  right: '-24px',
                  width: '64px',
                  height: '64px',
                  background: 'var(--accent)',
                  opacity: 0.15,
                  borderRadius: '50%',
                  filter: 'blur(20px)',
                  pointerEvents: 'none'
                }} />
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', color: '#a1a1aa' }}>
                    {cardDetails.brand}
                  </span>
                  <div style={{ background: 'rgba(255, 255, 255, 0.08)', color: '#d4d4d8', padding: '2px 8px', borderRadius: '4px', fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Automático
                  </div>
                </div>
                
                <div style={{ marginTop: '12px' }}>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', letterSpacing: '2px', color: '#f4f4f5', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ color: '#71717a', fontSize: '12px' }}>•••• •••• ••••</span>
                    <span>{cardDetails.last4}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '9px', color: '#71717a', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '6px' }}>
                    <span>Validade</span>
                    <span>{String(cardDetails.expMonth).padStart(2, '0')}/{String(cardDetails.expYear).slice(-2)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm font-medium text-secondary leading-relaxed">
                {profile.stripe_customer_id ? "Cartão verificado e ativo." : "Configure um cartão para evitar pausas no faturamento."}
              </p>
            )}
          </div>
          
          <button
            onClick={() => setIsAddingCard(!isAddingCard)}
            className="mt-auto btn-primary py-2.5 justify-center text-[10px] font-black uppercase tracking-widest"
            style={{ alignSelf: 'flex-start' }}
          >
            {cardDetails ? "Atualizar Cartão" : "Configurar Agora"}
          </button>
        </div>
      </div>
      )}

      {!profile?.is_admin && isAddingCard && (
        <div className="max-w-2xl mx-auto mb-20 animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="card border-accent\/30 shadow-2xl">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold">Novo Método de Pagamento</h3>
              <button onClick={() => setIsAddingCard(false)} className="text-secondary hover:text-primary">
                <Plus size={24} className="rotate-45" />
              </button>
            </div>
            <Elements stripe={stripePromise}>
              <SetupForm onComplete={() => {
                setTimeout(() => setIsAddingCard(false), 1500);
                window.location.reload();
              }} />
            </Elements>
          </div>
        </div>
      )}

      {!profile?.is_admin && <div className="nav-divider mb-16"></div>}

      {/* Pricing Section */}
      {!profile?.is_admin && (
        <div className="space-y-20 mb-10 pb-20">
        <div style={{ textAlign: 'center' }} className="space-y-4 mb-8">
          <h3 className="text-4xl font-bold tracking-tight">Selecione seu Plano</h3>
          <p className="text-secondary font-medium max-w-xl mx-auto">Otimize suas taxas operacionais conforme o volume das suas vendas.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          {Object.entries(plans).map(([id, plan]: [string, any]) => {
            const isCurrent = profile.plan_id === id;

            return (
              <div
                key={id}
                className={`flex flex-col p-10 card relative transition-all duration-300 ${isCurrent ? 'border-accent/40 bg-accent/5 ring-1 ring-accent/20' : 'hover:border-accent/20'
                  }`}
              >
                <div className="mb-10">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="text-accent">
                      {id === 'standard' && <Zap size={24} strokeWidth={2.5} />}
                      {id === 'pro' && <Shield size={24} strokeWidth={2.5} />}
                      {id === 'elite' && <Crown size={24} strokeWidth={2.5} />}
                    </div>
                    <h3 className="text-2xl font-bold capitalize">{plan.name}</h3>
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-4xl font-bold text-primary">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(plan.price).split(',')[0]}
                    </span>
                    <span className="text-secondary text-xs font-bold uppercase tracking-widest opacity-40">/ mês</span>
                  </div>
                </div>

                <div className="space-y-8 mb-12 flex-1">
                  <div className="flex items-center justify-between py-4 border-[var(--border-color)] border-y">
                    <span className="text-xs font-bold text-secondary uppercase tracking-widest opacity-60">Taxa por venda</span>
                    <span className="text-2xl font-bold text-accent">{plan.fee}%</span>
                  </div>

                  <div className="space-y-4 px-1">
                    {[
                      'Ciclo de 15 dias',
                      'Saques Ilimitados',
                      'Checkout Otimizado',
                      id === 'standard' ? 'Suporte Ticket' : id === 'pro' ? 'Suporte Prioritário' : 'Gerente de Contas'
                    ].map((feat, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm text-secondary">
                        <Check size={16} className="text-accent flex-shrink-0" strokeWidth={3} />
                        <span className="font-medium tracking-tight">{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setUpdateError(null);
                    setPlanToConfirm(id);
                  }}
                  disabled={isCurrent || loadingPlan === id}
                  className={`w-full py-4 rounded-xl text-sm font-bold transition-all ${isCurrent
                    ? 'bg-transparent text-emerald-500 border border-emerald-500/30 cursor-default'
                    : 'btn-primary shadow-lg shadow-accent/20'
                    }`}
                >
                  {loadingPlan === id ? <Loader2 className="animate-spin mx-auto" size={18} /> : isCurrent ? "Seu Plano Atual" : "Ativar Plano"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
      )}

      {!profile?.is_admin && <div className="nav-divider mb-16"></div>}

      {/* Histórico de Faturamento */}
      <div className="space-y-6">
        <div className="space-y-2">
          <h3 className="text-2xl font-bold tracking-tight">
            {profile?.is_admin ? "Histórico de Faturamento Geral" : "Histórico de Faturamento"}
          </h3>
          <p className="text-secondary text-sm font-medium opacity-70">
            {profile?.is_admin 
              ? "Acompanhe todas as cobranças de taxas de plataforma de todos os vendedores."
              : "Acompanhe todas as cobranças de taxas de plataforma realizadas em sua conta."}
          </p>
        </div>

        <div 
          className="card border-[var(--border-color)] bg-[var(--bg-card)]"
          style={{ padding: (!billingHistory || billingHistory.length === 0) ? '48px 24px' : 0, overflow: 'hidden' }}
        >
          {(!billingHistory || billingHistory.length === 0) ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              gap: '16px',
              width: '100%'
            }}>
              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-color)',
                borderRadius: '50%',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-secondary)',
                opacity: 0.8
              }}>
                <Calendar size={28} strokeWidth={2} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <p className="text-primary font-bold text-base" style={{ margin: 0 }}>Sem histórico de cobranças</p>
                <p className="text-secondary text-sm font-medium opacity-65" style={{ margin: 0 }}>Nenhuma taxa de plataforma foi faturada em sua conta até o momento.</p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-color)', opacity: 0.7 }}>
                    <th style={{ padding: '16px 24px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-secondary)' }}>Data</th>
                    {profile?.is_admin && (
                      <th style={{ padding: '16px 24px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-secondary)' }}>Vendedor</th>
                    )}
                    <th style={{ padding: '16px 24px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-secondary)' }}>Descrição</th>
                    <th style={{ padding: '16px 24px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-secondary)' }}>Valor</th>
                    <th style={{ padding: '16px 24px', fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-secondary)' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {billingHistory.map((item: any) => {
                    const formattedDate = new Date(item.created_at).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    });
                    
                    const isSuccess = item.status === 'succeeded';
                    
                    return (
                      <tr 
                        key={item.id} 
                        style={{ 
                          borderBottom: '1px solid var(--border-color)', 
                          transition: 'background-color 0.2s ease',
                          cursor: 'default'
                        }}
                        className="hover:bg-[var(--bg-card-hover)]"
                      >
                        <td style={{ padding: '20px 24px', fontSize: '14px', fontWeight: '600' }}>
                          {formattedDate}
                        </td>
                        {profile?.is_admin && (
                          <td style={{ padding: '20px 24px', fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '500' }}>
                            {item.profiles?.email || 'N/A'}
                          </td>
                        )}
                        <td style={{ padding: '20px 24px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                          {isSuccess ? 'Taxas de plataforma' : (item.error_message || 'Falha no processamento da taxa')}
                        </td>
                        <td style={{ padding: '20px 24px', fontSize: '14px', fontWeight: '700', color: isSuccess ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.amount)}
                        </td>
                        <td style={{ padding: '20px 24px' }}>
                          <span 
                            className={`status-tag ${isSuccess ? 'status-active' : 'status-inactive'}`}
                            style={{ 
                              display: 'inline-flex', 
                              alignItems: 'center', 
                              gap: '6px',
                              padding: '6px 12px',
                              borderRadius: '20px',
                              fontSize: '11px',
                              fontWeight: 'bold',
                              border: isSuccess ? '1px solid rgba(34, 197, 94, 0.15)' : '1px solid rgba(239, 68, 68, 0.15)'
                            }}
                          >
                            {isSuccess ? (
                              <>
                                <Check size={12} strokeWidth={3} />
                                Pago
                              </>
                            ) : (
                              <>
                                <AlertCircle size={12} strokeWidth={3} />
                                Recusado
                              </>
                            )}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Spacer explícito */}
      <div className="h-20 w-full"></div>



      {/* Modal de Confirmação de Plano */}
      {planToConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '24px'
        }}>
          <div 
            className="card border-[var(--border-color)] bg-[var(--bg-card)]"
            style={{
              width: '100%',
              maxWidth: '480px',
              padding: '32px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px',
              borderRadius: '24px'
            }}
          >
            {/* Header com Ícone e Título */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-color)',
                borderRadius: '16px',
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-primary)'
              }}>
                {planToConfirm === 'standard' && <Zap size={24} className="text-amber-500" strokeWidth={2.5} />}
                {planToConfirm === 'pro' && <Shield size={24} className="text-blue-500" strokeWidth={2.5} />}
                {planToConfirm === 'elite' && <Crown size={24} className="text-emerald-500" strokeWidth={2.5} />}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <h3 className="text-xl font-bold tracking-tight" style={{ margin: 0 }}>Confirmar Novo Plano</h3>
                <p className="text-secondary text-xs font-semibold uppercase tracking-widest opacity-60" style={{ margin: 0 }}>
                  Plano {plans[planToConfirm]?.name}
                </p>
              </div>
            </div>

            {/* Comparativo de Plano e Taxa */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.01)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="text-secondary text-sm font-semibold">Mensalidade</span>
                <span className="text-primary font-bold text-base">
                  {plans[planToConfirm]?.price > 0 ? (
                    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(plans[planToConfirm]?.price)
                  ) : (
                    "Grátis"
                  )}
                </span>
              </div>
              <div style={{ height: '1px', background: 'var(--border-color)', width: '100%' }}></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="text-secondary text-sm font-semibold">Taxa por venda</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="text-secondary text-sm font-medium line-through opacity-50">
                    {profile.fee_percentage}%
                  </span>
                  <ChevronRight size={14} className="text-secondary opacity-40" />
                  <span className="text-accent font-bold text-base">
                    {plans[planToConfirm]?.fee}%
                  </span>
                </div>
              </div>
            </div>

            {/* Mensagem Explicativa */}
            <p className="text-secondary text-sm font-medium leading-relaxed opacity-80" style={{ margin: 0 }}>
              {plans[planToConfirm]?.price > 0 ? (
                cardDetails ? (
                  `Ao confirmar, o valor da primeira mensalidade de ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(plans[planToConfirm]?.price)} será cobrado imediatamente no seu cartão de final ${cardDetails.last4}.`
                ) : (
                  "Você precisará ter um cartão cadastrado para ativar este plano. O valor da mensalidade será cobrado imediatamente."
                )
              ) : (
                "Ao confirmar, você retornará para a taxa operacional padrão de 4.9% por venda. Não haverá cobrança de mensalidade."
              )}
            </p>

            {/* Feedback de Erro */}
            {updateError && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '12px',
                padding: '12px 16px',
                color: '#f87171',
                fontSize: '13px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'start',
                gap: '10px'
              }}>
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{updateError}</span>
              </div>
            )}

            {/* Ações */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button
                onClick={() => { setPlanToConfirm(null); setUpdateError(null); }}
                disabled={loadingPlan !== null}
                className="btn-secondary"
                style={{ flex: 1, padding: '14px 20px', borderRadius: '12px', fontSize: '14px', fontWeight: 'bold', justifyContent: 'center' }}
              >
                Cancelar
              </button>
              <button
                onClick={() => handleUpdatePlan(planToConfirm)}
                disabled={loadingPlan !== null}
                className="btn-primary"
                style={{ flex: 1, padding: '14px 20px', borderRadius: '12px', fontSize: '14px', fontWeight: 'bold', justifyContent: 'center' }}
              >
                {loadingPlan ? <Loader2 className="animate-spin" size={18} /> : "Confirmar e Ativar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
