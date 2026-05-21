"use client";

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import {
  DollarSign,
  ShoppingCart,
  CreditCard,
  ShoppingBag,
  RotateCcw,
  Package,
  Loader2,
  BarChart3,
  AlertTriangle
} from "lucide-react";
import Link from "next/link";
import { Header } from "./components/Header";
import { Card } from "./components/Card";
import { useState, useEffect } from "react";
import { useLoading } from "./context/LoadingContext";
import { SalesChart } from "./components/SalesChart";


export default function Home() {
  const [data, setData] = useState<any>(null);
  const { setIsLoading } = useLoading();
  const [period, setPeriod] = useState("today");

  useEffect(() => {
    fetchData();
  }, [period]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/dashboard?period=${period}`, { cache: 'no-store' });
      const result = await response.json();

      // Artificial delay to show the nice premium spinner
      await new Promise(resolve => setTimeout(resolve, 800));

      if (!result.error) {
        setData(result);
      } else {
        console.error("Dashboard error:", result.error);
      }
    } catch (err) {
      console.error("Failed to fetch dashboard data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number, currency = "BRL") => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: currency,
    }).format(value);
  };

  if (!data) {
    return (
      <>
        <Header />
        <div className="flex items-center justify-center h-[60vh]">
          {/* This part will be covered by the global overlay, but we keep a spacer */}
        </div>
      </>
    );
  }

  return (
    <>
      <Header />

      {data?.hasValidCard === false && !data?.isBlockedByBilling && (
        <div className="billing-alert-container">
          {/* Subtle background glow effect */}
          <div className="billing-alert-glow top-right"></div>
          <div className="billing-alert-glow bottom-left"></div>
          
          <div className="billing-alert-content w-full justify-between">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {/* Premium Icon Container */}
              <div className="billing-alert-icon-wrapper">
                <CreditCard size={24} />
                <span className="billing-alert-ping">
                  <span className="billing-alert-ping-circle1"></span>
                  <span className="billing-alert-ping-circle2"></span>
                </span>
              </div>
              
              {/* Typography */}
              <div className="billing-alert-text">
                <h3>Ação Necessária: Adicione um Cartão de Crédito</h3>
                <p>
                  Para habilitar vendas, gerenciar produtos e utilizar a plataforma sem interrupções, você precisa vincular um método de pagamento válido. 
                </p>
              </div>
            </div>
            
            {/* Call to action */}
            <Link 
              href="/cobrancas" 
              className="billing-alert-button mt-4 sm:mt-0"
            >
              <span>Regularizar Agora</span>
              {/* Button shine effect */}
              <div className="billing-alert-button-shimmer"></div>
            </Link>
          </div>
        </div>
      )}

      {data?.isBlockedByBilling && (
        <div className="billing-alert-container" style={{ borderColor: 'rgba(239, 68, 68, 0.3)', background: 'linear-gradient(90deg, rgba(239, 68, 68, 0.05) 0%, rgba(20, 20, 20, 0.95) 100%)' }}>
          {/* Red background glow effect */}
          <div className="billing-alert-glow top-right" style={{ background: 'radial-gradient(circle, rgba(239, 68, 68, 0.15) 0%, rgba(0,0,0,0) 70%)' }}></div>
          <div className="billing-alert-glow bottom-left" style={{ background: 'radial-gradient(circle, rgba(239, 68, 68, 0.15) 0%, rgba(0,0,0,0) 70%)' }}></div>
          
          <div className="billing-alert-content w-full justify-between">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {/* Premium Icon Container (Red) */}
              <div className="billing-alert-icon-wrapper" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                <AlertTriangle size={24} />
                <span className="billing-alert-ping">
                  <span className="billing-alert-ping-circle1" style={{ border: '1px solid rgba(239, 68, 68, 0.5)' }}></span>
                  <span className="billing-alert-ping-circle2" style={{ backgroundColor: 'rgba(239, 68, 68, 0.2)' }}></span>
                </span>
              </div>
              
              {/* Typography */}
              <div className="billing-alert-text">
                <h3 style={{ color: '#ef4444' }}>Acesso Bloqueado: Falha no Pagamento</h3>
                <p>
                  Sua conta está temporariamente bloqueada para novas vendas. Detectamos 3 tentativas falhas de cobrança. Por favor, regularize sua situação acessando o menu de Cobranças.
                </p>
              </div>
            </div>
            
            {/* Call to action */}
            <Link 
              href="/cobrancas" 
              className="billing-alert-button mt-4 sm:mt-0"
              style={{ background: 'linear-gradient(135deg, #ef4444, #dc2626)', boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)' }}
            >
              <span>Ir para Cobranças</span>
              {/* Button shine effect */}
              <div className="billing-alert-button-shimmer"></div>
            </Link>
          </div>
        </div>
      )}

      {data?.billingFailedAttempts > 0 && !data?.isBlockedByBilling && (
        <div className="billing-alert-container" style={{ borderColor: 'rgba(245, 158, 11, 0.3)', background: 'linear-gradient(90deg, rgba(245, 158, 11, 0.05) 0%, rgba(20, 20, 20, 0.95) 100%)' }}>
          <div className="billing-alert-glow top-right" style={{ background: 'radial-gradient(circle, rgba(245, 158, 11, 0.15) 0%, rgba(0,0,0,0) 70%)' }}></div>
          <div className="billing-alert-glow bottom-left" style={{ background: 'radial-gradient(circle, rgba(245, 158, 11, 0.15) 0%, rgba(0,0,0,0) 70%)' }}></div>
          
          <div className="billing-alert-content w-full justify-between">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="billing-alert-icon-wrapper" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                <AlertTriangle size={24} />
                <span className="billing-alert-ping">
                  <span className="billing-alert-ping-circle1" style={{ border: '1px solid rgba(245, 158, 11, 0.5)' }}></span>
                  <span className="billing-alert-ping-circle2" style={{ backgroundColor: 'rgba(245, 158, 11, 0.2)' }}></span>
                </span>
              </div>
              
              <div className="billing-alert-text">
                <h3 style={{ color: '#f59e0b' }}>Atenção: Falha no Pagamento</h3>
                <p>
                  Tentamos cobrar a sua fatura, mas o pagamento falhou ({data.billingFailedAttempts} tentativa{data.billingFailedAttempts > 1 ? 's' : ''}). No 3º dia de falha, sua conta será bloqueada.
                </p>
              </div>
            </div>
            
            <Link 
              href="/cobrancas" 
              className="billing-alert-button mt-4 sm:mt-0"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', boxShadow: '0 4px 15px rgba(245, 158, 11, 0.3)' }}
            >
              <span>Regularizar</span>
              <div className="billing-alert-button-shimmer"></div>
            </Link>
          </div>
        </div>
      )}

      {/* Time Tabs */}
      <div className="tabs-container">
        {[
          { id: "today", label: "Hoje" },
          { id: "yesterday", label: "Ontem" },
          { id: "7days", label: "7 dias" },
          { id: "month", label: "Mês" },
          { id: "year", label: "Ano" },
          { id: "total", label: "Total" },
        ].map((tab) => (
          <button
            key={tab.id}
            className={`tab-item ${period === tab.id ? "active" : ""}`}
            onClick={() => setPeriod(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Dashboard Grid - 12 Column System */}
      <section className="dashboard-grid">
        {/* Row 1 - Currency Cards (3 cards, 4 cols each) */}
        <div className="col-span-4">
          <Card
            title="Vendas BRL"
            value={formatCurrency(data?.totalSalesValueBRL || 0, "BRL")}
            subtext={`Pendentes: ${formatCurrency(data?.pendingSalesValueBRL || 0, "BRL")}`}
            icon={<DollarSign size={16} />}
            className="card-green"
          />
        </div>
        <div className="col-span-4">
          <Card
            title="Vendas USD"
            value={formatCurrency(data?.totalSalesValueUSD || 0, "USD")}
            subtext={`Pendentes: ${formatCurrency(data?.pendingSalesValueUSD || 0, "USD")}`}
            icon={<DollarSign size={16} />}
            className="card-blue"
          />
        </div>
        <div className="col-span-4">
          <Card
            title="Vendas EUR"
            value={formatCurrency(data?.totalSalesValueEUR || 0, "EUR")}
            subtext={`Pendentes: ${formatCurrency(data?.pendingSalesValueEUR || 0, "EUR")}`}
            icon={<DollarSign size={16} />}
            className="card-orange"
          />
        </div>

        {/* Row 2 - Stats Cards (4 cards, 3 cols each) */}
        <div className="col-span-3">
          <Card
            title="Qtd Vendas"
            value={data?.totalSalesCount?.toString() || "0"}
            subtext={`Ticket médio: ${formatCurrency(data?.averageTicket || 0)}`}
            icon={<ShoppingCart size={16} />}
          />
        </div>

        <div className="col-span-3">
          <Card
            title="Abandono de carrinho"
            value={data?.abandonedCount?.toString() || "0"}
            icon={<ShoppingBag size={16} />}
          />
        </div>

        <div className="col-span-3">
          <Card
            title="Reembolso"
            value="R$ 0,00"
            subtext="0 pedido(s)"
            icon={<RotateCcw size={16} />}
          />
        </div>

        <div className="col-span-3">
          <Card
            title="Produtos"
            value={data?.productsCount?.toString() || "0"}
            subtext={`${data?.checkoutsCount || 0} links de checkout`}
            icon={<Package size={16} />}
          />
        </div>

        {/* Row 3 - Sales Performance Chart (Full Width) */}
        <div className="col-span-12">
          <Card
            title="Desempenho de Vendas (Aprovadas)"
            value=""
            icon={<BarChart3 size={16} />}
          >
            <div className="py-6 h-full min-h-[350px]">
              <SalesChart data={data?.chartData} />
            </div>
          </Card>
        </div>
      </section>
    </>
  );
}

