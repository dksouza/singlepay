"use client";

export const runtime = 'edge';
export const dynamic = 'force-dynamic';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from "react";
import { Header } from "../components/Header";
import { Layers, Puzzle, ShieldCheck, CheckCircle2, ChevronRight, Settings2 } from "lucide-react";
import { StripeConfigModal } from "../components/StripeConfigModal";
import { getStripeConfig } from "../actions/integrationActions";
import { getUtmifyConfig } from "../actions/utmifyActions";
import { useLoading } from "../context/LoadingContext";
import { UtmifyConfigModal } from "../components/UtmifyConfigModal";

export default function IntegracoesPage() {
  const [activeTab, setActiveTab] = useState<"gateway" | "aplicacoes">("gateway");
  const [isStripeModalOpen, setIsStripeModalOpen] = useState(false);
  const [isUtmifyModalOpen, setIsUtmifyModalOpen] = useState(false);
  const [stripeConfig, setStripeConfig] = useState<any>(null);
  const [utmifyConfig, setUtmifyConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { setIsLoading } = useLoading();

  const fetchConfigs = async () => {
    setLoading(true);
    setIsLoading(true);
    const [stripe, utmify] = await Promise.all([
      getStripeConfig(),
      getUtmifyConfig()
    ]);
    setStripeConfig(stripe);
    setUtmifyConfig(utmify);
    setLoading(false);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  return (
    <>
      <Header />

      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold">Integrações</h2>
          <p className="text-secondary text-sm">Conecte sua conta com outras ferramentas e gateways</p>
        </div>
      </div>

      <div className="tabs-container">
        <button 
          className={`tab-item ${activeTab === "gateway" ? "active" : ""}`}
          onClick={() => setActiveTab("gateway")}
        >
          Gateways
        </button>
        <button 
          className={`tab-item ${activeTab === "aplicacoes" ? "active" : ""}`}
          onClick={() => setActiveTab("aplicacoes")}
        >
          Aplicações
        </button>
      </div>

      {activeTab === "gateway" ? (
        <div className="product-grid">
          <div className="checkout-card" style={{ cursor: 'pointer' }} onClick={() => setIsStripeModalOpen(true)}>
            <div className="flex justify-between items-start mb-6">
              <div className="w-12 h-12 bg-[#635BFF] rounded-xl flex items-center justify-center text-white">
                <ShieldCheck size={24} />
              </div>
              {stripeConfig?.secret_key ? (
                <div 
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider"
                  style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)' }}
                >
                  <CheckCircle2 size={12} style={{ color: '#10b981' }} />
                  Conectado
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-full text-[11px] font-bold uppercase tracking-wider">
                  Desconectado
                </div>
              )}
            </div>
            
            <h3 className="text-lg font-bold mb-2">Stripe</h3>
            <p className="text-sm text-secondary mb-6 leading-relaxed">
              Aceite cartões de crédito, Apple Pay e Google Pay com a infraestrutura da Stripe.
            </p>

            <div className="checkout-footer-premium">
              <span className="text-xs font-semibold text-accent flex items-center gap-1">
                Configurar Gateway <ChevronRight size={14} />
              </span>
              <div className="action-btn-premium">
                <Settings2 size={18} />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="product-grid">
          <div className="checkout-card" style={{ cursor: 'pointer' }} onClick={() => setIsUtmifyModalOpen(true)}>
            <div className="flex justify-between items-start mb-6">
              <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
                <Puzzle size={24} />
              </div>
              {utmifyConfig?.api_token ? (
                <div 
                  className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider"
                  style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)' }}
                >
                  <CheckCircle2 size={12} style={{ color: '#10b981' }} />
                  Conectado
                </div>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-full text-[11px] font-bold uppercase tracking-wider">
                  Desconectado
                </div>
              )}
            </div>
            
            <h3 className="text-lg font-bold mb-2">Utmify</h3>
            <p className="text-sm text-secondary mb-6 leading-relaxed">
              Rastreie suas vendas e otimize suas campanhas enviando dados de conversão para a Utmify.
            </p>

            <div className="checkout-footer-premium">
              <span className="text-xs font-semibold text-accent flex items-center gap-1">
                Configurar Utmify <ChevronRight size={14} />
              </span>
              <div className="action-btn-premium">
                <Settings2 size={18} />
              </div>
            </div>
          </div>
        </div>
      )}

      <StripeConfigModal 
        isOpen={isStripeModalOpen}
        onClose={() => setIsStripeModalOpen(false)}
        onSuccess={fetchConfigs}
        initialData={stripeConfig}
      />

      <UtmifyConfigModal
        isOpen={isUtmifyModalOpen}
        onClose={() => setIsUtmifyModalOpen(false)}
        onSuccess={fetchConfigs}
        initialData={utmifyConfig}
      />
    </>
  );
}
