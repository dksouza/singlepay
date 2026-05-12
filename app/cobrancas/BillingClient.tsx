"use client";

import { useState } from "react";
import { CreditCard, Check, Loader2, Zap, Shield, Crown, AlertCircle, ChevronRight, Settings2, Calendar, DollarSign, ShieldCheck, Plus } from "lucide-react";
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
      setMessage(error.message || "Ocorreu um erro ao salvar o cartão.");
      setLoading(false);
    } else {
      setMessage("Cartão salvo com sucesso!");
      setLoading(false);
      onComplete();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label className="text-[10px] font-black text-secondary uppercase tracking-widest ml-1">Detalhes do Cartão</label>
        <div className="p-5 bg-input rounded-2xl border border-white/5 shadow-inner focus-within:border-accent transition-colors">
          <CardElement options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#ffffff',
                fontFamily: 'Inter, sans-serif',
                '::placeholder': { color: '#71717a' },
              },
              invalid: {
                color: '#ef4444',
              },
            },
          }} />
        </div>
      </div>

      <div className="flex items-center gap-3 p-3 bg-accent/5 rounded-xl border border-accent/10 mb-2">
        <ShieldCheck className="text-accent" size={18} />
        <p className="text-[10px] font-bold text-secondary leading-tight">
          Suas informações de pagamento são processadas de forma segura via <span className="text-accent">Stripe</span>.
        </p>
      </div>

      <button
        type="submit"
        disabled={loading || !stripe}
        className="btn-primary w-full py-4 flex items-center justify-center gap-3"
      >
        {loading ? <Loader2 className="animate-spin" size={20} /> : <><CreditCard size={18} /> Confirmar Cartão</>}
      </button>

      {message && (
        <div className={`p-4 rounded-xl text-xs font-black text-center ${message.includes("sucesso") ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20" : "bg-rose-500/10 text-rose-500 border border-rose-500/20"}`}>
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
    <>
      <Header />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-10 px-1">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-primary">Faturamento</h2>
          <p className="text-secondary text-sm font-medium mt-1">Gerencie seu plano, taxas e métodos de pagamento.</p>
        </div>
        <div className="flex items-center gap-3">
          {!stripeKey && (
            <div className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-2xl text-[10px] font-black uppercase tracking-widest">
              <AlertCircle size={14} /> Chave Stripe Ausente
            </div>
          )}
          <div className="flex items-center gap-2 px-4 py-2 bg-card text-secondary border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm">
            <ShieldCheck size={14} className="text-accent" /> Ambiente Seguro
          </div>
        </div>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {/* Active Plan Card */}
        <div className="card relative overflow-hidden p-6 group transition-all duration-300 hover:shadow-lg">
          <div className="absolute top-4 right-4 z-20">
            <div className="px-3 py-1 bg-accent/10 rounded-full border border-accent/20">
              <span className="text-[10px] font-black text-accent uppercase tracking-widest">Ativo</span>
            </div>
          </div>

          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-accent/10 flex items-center justify-center text-accent ring-1 ring-accent/20">
              <Crown size={22} />
            </div>
            <div>
              <span className="text-[10px] font-black text-secondary uppercase tracking-widest opacity-60">Plano Atual</span>
              <h3 className="text-xl font-black capitalize text-primary leading-tight">
                {plans[profile.plan_id]?.name || profile.plan_id}
              </h3>
            </div>
          </div>

          <div>
            <p className="text-[11px] font-bold text-secondary mb-1">Sua taxa fixa</p>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-accent">{profile.fee_percentage}%</span>
              <span className="text-[10px] font-bold text-secondary">por venda</span>
            </div>
          </div>
        </div>

        {/* Pending Fees Card */}
        <div className="card relative overflow-hidden p-6 group transition-all duration-300 hover:shadow-lg">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500 ring-1 ring-blue-500/20">
              <DollarSign size={22} />
            </div>
            <div>
              <span className="text-[10px] font-black text-secondary uppercase tracking-widest opacity-60">Taxas Acumuladas</span>
              <h3 className="text-xl font-black text-primary leading-tight">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalUnbilled)}
              </h3>
            </div>
          </div>

          <div className="mt-auto">
            <div className="flex items-center gap-2 text-secondary mb-3">
              <Calendar size={14} className="text-blue-500" />
              <span className="text-[11px] font-bold">Próximo fechamento</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-black text-primary">
                {new Date(profile.next_billing_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}
              </span>
              <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Automático</span>
            </div>
          </div>
        </div>

        {/* Payment Method Card */}
        <div className="card relative overflow-hidden p-6 group transition-all duration-300 hover:shadow-lg">
          <div className="flex items-center gap-4 mb-6">
            <div className={`w-12 h-12 rounded-2xl ${profile.stripe_customer_id ? 'bg-emerald-500/10 text-emerald-500 ring-emerald-500/20' : 'bg-rose-500/10 text-rose-500 ring-rose-500/20'} flex items-center justify-center ring-1`}>
              <CreditCard size={22} />
            </div>
            <div>
              <span className="text-[10px] font-black text-secondary uppercase tracking-widest opacity-60">Pagamento</span>
              <h3 className={`text-xl font-black leading-tight ${profile.stripe_customer_id ? 'text-emerald-500' : 'text-rose-500'}`}>
                {profile.stripe_customer_id ? "Cartão Verificado" : "Pendente"}
              </h3>
            </div>
          </div>

          <div className="mt-auto">
            <p className="text-[11px] font-bold text-secondary mb-4 leading-relaxed opacity-80">
              {profile.stripe_customer_id
                ? "Método de pagamento configurado com segurança via Stripe."
                : "Configure um cartão para manter o processamento de vendas ativo."}
            </p>
            <button
              onClick={() => setIsAddingCard(!isAddingCard)}
              className={`w-full py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${profile.stripe_customer_id
                  ? 'bg-card text-primary border border-white/10 hover:bg-zinc-800'
                  : 'bg-accent text-white hover:bg-accent-hover shadow-lg shadow-accent/20'
                }`}
            >
              {profile.stripe_customer_id ? <><Settings2 size={14} /> Atualizar</> : <><Plus size={14} /> Configurar Agora</>}
            </button>
          </div>
        </div>
      </div>

      {isAddingCard && (
        <div className="max-w-2xl mx-auto mb-16 card p-10 border-accent/20 relative animate-in fade-in zoom-in duration-500">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h3 className="text-xl font-black text-primary mb-1">Configurar Cartão</h3>
              <p className="text-secondary text-xs">As taxas serão cobradas automaticamente neste cartão.</p>
            </div>
            <button onClick={() => setIsAddingCard(false)} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-secondary hover:text-white transition-colors">
              <Plus size={20} className="rotate-45" />
            </button>
          </div>
          <Elements stripe={stripePromise}>
            <SetupForm onComplete={() => {
              setTimeout(() => setIsAddingCard(false), 2000);
              window.location.reload();
            }} />
          </Elements>
        </div>
      )}

      {/* Plans Comparison */}
      <div className="flex flex-col items-center mb-12">
        <h3 className="text-3xl font-black mb-3 tracking-tight text-center">Planos e Taxas</h3>
        <p className="text-secondary text-sm font-medium text-center max-w-md">Escolha o plano ideal para o seu volume de vendas.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20 px-1">
        {Object.entries(plans).map(([id, plan]: [string, any]) => {
          const isCurrent = profile.plan_id === id;
          const isPro = id === 'pro';
          const isElite = id === 'elite';

          return (
            <div
              key={id}
              className={`flex flex-col p-10 rounded-[40px] card relative overflow-hidden transition-all duration-500 ${isCurrent ? 'border-accent shadow-xl ring-1 ring-accent/20' : ''
                } ${isElite ? 'md:scale-105 z-10' : ''}`}
            >
              {isPro && !isCurrent && (
                <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20">
                  <div className="px-4 py-1 bg-accent rounded-full">
                    <span className="text-[10px] font-black text-white uppercase tracking-widest">Mais Popular</span>
                  </div>
                </div>
              )}

              {isCurrent && (
                <div className="absolute top-6 right-8 z-20">
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full text-[10px] font-black uppercase tracking-widest">
                    <Check size={12} strokeWidth={3} /> Atual
                  </div>
                </div>
              )}

              <div className="mb-8">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white mb-6 ${id === 'standard' ? 'bg-blue-600' :
                    id === 'pro' ? 'bg-purple-600' :
                      'bg-amber-600'
                  }`}>
                  {id === 'standard' && <Zap size={28} strokeWidth={2.5} />}
                  {id === 'pro' && <Shield size={28} strokeWidth={2.5} />}
                  {id === 'elite' && <Crown size={28} strokeWidth={2.5} />}
                </div>
                <h3 className="text-2xl font-black mb-1 capitalize text-primary">{plan.name}</h3>
                <p className="text-secondary text-[11px] font-bold uppercase tracking-widest opacity-60">
                  Taxa de {plan.fee}%
                </p>
              </div>

              <div className="flex items-baseline gap-1 mb-10">
                <span className="text-4xl font-black text-primary tracking-tighter">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(plan.price)}
                </span>
                <span className="text-secondary font-black text-sm opacity-60">/mês</span>
              </div>

              <div className="space-y-4 mb-12 flex-1">
                {[
                  { text: 'Ciclo de 15 dias', enabled: true },
                  { text: 'Checkout ilimitado', enabled: true },
                  { text: id === 'standard' ? 'Suporte Padrão' : id === 'pro' ? 'Suporte Prioritário' : 'Suporte VIP 24h', enabled: true },
                  { text: 'Relatórios Avançados', enabled: isPro || isElite },
                  { text: 'Gerente de Contas', enabled: isElite }
                ].map((feat, i) => (
                  <div key={i} className={`flex items-center gap-3 ${feat.enabled ? 'opacity-100' : 'opacity-30'}`}>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${feat.enabled ? 'bg-emerald-500/10 text-emerald-500' : 'bg-secondary/10 text-secondary'}`}>
                      <Check size={12} strokeWidth={3.5} />
                    </div>
                    <span className="text-[13px] font-bold text-primary/80">{feat.text}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => handleUpdatePlan(id)}
                disabled={isCurrent || loadingPlan === id}
                className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${isCurrent
                    ? 'bg-zinc-800 text-zinc-500 cursor-default border border-white/5'
                    : 'btn-primary'
                  }`}
              >
                {loadingPlan === id ? <Loader2 className="animate-spin" size={20} /> : isCurrent ? "Plano Atual" : "Selecionar Plano"}
              </button>
            </div>
          );
        })}
      </div>

      {profile.is_admin && (
        <div className="mt-8 p-10 rounded-[40px] bg-blue-500/5 border border-blue-500/10 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden group">
          <div className="absolute -right-8 -bottom-8 text-blue-500/5 rotate-12">
            <ShieldCheck size={200} />
          </div>
          <div className="w-20 h-20 bg-blue-500/10 rounded-[24px] flex items-center justify-center text-blue-500 shadow-inner">
            <ShieldCheck size={40} strokeWidth={2.5} />
          </div>
          <div className="flex-1 text-center md:text-left z-10">
            <h4 className="font-black text-blue-500 uppercase tracking-widest text-sm mb-2">Privilégio Administrativo Ativo</h4>
            <p className="text-secondary text-sm max-w-3xl leading-relaxed font-medium">
              Como administrador, sua conta está isenta de taxas. Aproveite todos os recursos sem custos.
            </p>
          </div>
        </div>
      )}

      {/* Security Footer */}
      <div className="mt-20 py-10 border-t border-white/10 flex flex-col items-center gap-6 opacity-60">
        <div className="flex items-center gap-8">
          <Shield size={24} className="text-secondary" />
          <CreditCard size={24} className="text-secondary" />
          <Zap size={24} className="text-secondary" />
        </div>
        <div className="text-center">
          <p className="text-[10px] font-black text-secondary uppercase tracking-[0.3em] mb-2">Pagamento Seguro via Stripe</p>
          <p className="text-[9px] text-secondary/60 max-w-sm">
            Processamento seguindo os padrões PCI-DSS.
          </p>
        </div>
      </div>
    </>
  );
}
