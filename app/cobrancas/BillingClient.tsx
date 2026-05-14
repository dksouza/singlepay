"use client";

import { useState } from "react";
import { CreditCard, Check, Loader2, Zap, Shield, Crown, AlertCircle, ChevronRight, Settings2, Calendar, DollarSign, ShieldCheck, Plus, Sparkles, ArrowUpRight } from "lucide-react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { updatePlan, createSetupIntent } from "../actions/billingActions";
import { Header } from "../components/Header";

const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = stripeKey ? loadStripe(stripeKey) : null;

function SetupForm({ onComplete }: { onComplete: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    const { clientSecret } = await createSetupIntent();

    const { error } = await stripe.confirmCardSetup(clientSecret!, {
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

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label className="form-label text-xs uppercase tracking-widest opacity-70">Dados do Cartão</label>
        <div className="form-input focus-within:ring-1 focus-within:ring-accent focus-within:border-accent">
          <CardElement options={{
            style: {
              base: {
                fontSize: '15px',
                color: 'var(--text-primary)',
                fontFamily: 'Inter, sans-serif',
                '::placeholder': { color: 'var(--text-secondary)' },
              },
            },
          }} />
        </div>
        <div className="flex items-center gap-2 mt-1">
          <ShieldCheck size={14} className="text-emerald-500" />
          <span className="text-[11px] text-secondary">Pagamento seguro processado via Stripe.</span>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || !stripe}
        className="btn-primary w-full py-4 justify-center"
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
  const { profile, totalUnbilled, plans } = initialData;
  const [isAddingCard, setIsAddingCard] = useState(false);

  const handleUpdatePlan = async (id: string) => {
    if (profile.plan_id === id) return;
    setLoadingPlan(id);
    try {
      await updatePlan(id as any);
      window.location.reload();
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="animate-in fade-in duration-500 pb-32">
      <Header />

      {/* Header com espaçamento otimizado */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
        <div className="space-y-3">
          <h2 className="text-4xl font-bold tracking-tight">Minha Assinatura</h2>
          <p className="text-secondary text-base font-medium opacity-70 max-w-xl">Gerencie seu plano e visualize o acumulado de taxas operacionais.</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="px-4 py-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl flex items-center gap-3 shadow-sm">
            <Shield size={16} className="text-emerald-500" />
            <span className="text-xs font-bold text-secondary uppercase tracking-widest">Conta Protegida</span>
          </div>
        </div>
      </div>

      {/* Summary Row com cards mais limpos */}
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
          <div className="mt-auto pt-6 border-t border-[var(--border-color)] flex items-center justify-between text-[11px] font-bold text-secondary">
            <span className="uppercase tracking-wider">Próximo Débito</span>
            <span className="text-primary">{new Date(profile.next_billing_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>
          </div>
        </div>

        <div className="card hover:border-emerald-500\/20 transition-all">
          <div className="flex items-center justify-between mb-8">
            <div className="text-accent">
              <CreditCard size={24} strokeWidth={2.5} />
            </div>
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-secondary opacity-40 mb-1">Pagamento</p>
          <p className="text-sm font-medium mb-8 text-secondary leading-relaxed">
            {profile.stripe_customer_id ? "Cartão verificado e ativo." : "Configure um cartão para evitar pausas."}
          </p>
          <button
            onClick={() => setIsAddingCard(!isAddingCard)}
            className="mt-auto btn-primary py-2.5 justify-center text-[10px] font-black uppercase tracking-widest"
          >
            {profile.stripe_customer_id ? "Atualizar Cartão" : "Configurar Agora"}
          </button>
        </div>
      </div>

      {isAddingCard && (
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

      <div className="nav-divider mb-16"></div>

      {/* Pricing Section - Commented out for now
      <div className="space-y-20 mb-10 pb-20">
        <div className="text-center space-y-4 mb-8">
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
                  onClick={() => handleUpdatePlan(id)}
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
      */}

      {/* Spacer explícito */}
      <div className="h-20 w-full"></div>

      {profile.is_admin && (
        <div className="mt-40 block">
          <div className="p-8 card border-[var(--border-color)] bg-[var(--bg-card)] flex flex-col md:flex-row items-center gap-6 mb-16">
            <ShieldCheck size={32} className="text-accent" />
            <div className="flex-1">
              <h4 className="font-bold mb-1">Acesso Administrativo</h4>
              <p className="text-secondary text-sm">Sua conta é isenta de taxas de plataforma. O faturamento está desativado.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
