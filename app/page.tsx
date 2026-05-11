"use client";

import {
  DollarSign,
  ShoppingCart,
  CreditCard,
  ShoppingBag,
  RotateCcw,
  Package,
  Loader2,
  BarChart3
} from "lucide-react";
import { Header } from "./components/Header";
import { Card } from "./components/Card";
import { useState, useEffect } from "react";
import { useLoading } from "./context/LoadingContext";
import { SalesChart } from "./components/SalesChart";

export const runtime = 'edge';
export const dynamic = 'force-dynamic';
export const dynamic = 'force-dynamic';

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
      const response = await fetch(`/api/dashboard?period=${period}`);
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
        <div style={{ gridColumn: "span 4" }}>
          <Card
            title="Vendas BRL"
            value={formatCurrency(data?.totalSalesValueBRL || 0, "BRL")}
            subtext={`Pendentes: ${formatCurrency(data?.pendingSalesValueBRL || 0, "BRL")}`}
            icon={<DollarSign size={16} />}
            className="card-green"
          />
        </div>
        <div style={{ gridColumn: "span 4" }}>
          <Card
            title="Vendas USD"
            value={formatCurrency(data?.totalSalesValueUSD || 0, "USD")}
            subtext={`Pendentes: ${formatCurrency(data?.pendingSalesValueUSD || 0, "USD")}`}
            icon={<DollarSign size={16} />}
            className="card-blue"
          />
        </div>
        <div style={{ gridColumn: "span 4" }}>
          <Card
            title="Vendas EUR"
            value={formatCurrency(data?.totalSalesValueEUR || 0, "EUR")}
            subtext={`Pendentes: ${formatCurrency(data?.pendingSalesValueEUR || 0, "EUR")}`}
            icon={<DollarSign size={16} />}
            className="card-orange"
          />
        </div>

        {/* Row 2 - Stats Cards (4 cards, 3 cols each) */}
        <div style={{ gridColumn: "span 3" }}>
          <Card
            title="Qtd Vendas"
            value={data?.totalSalesCount?.toString() || "0"}
            subtext={`Ticket médio: ${formatCurrency(data?.averageTicket || 0)}`}
            icon={<ShoppingCart size={16} />}
          />
        </div>

        <div style={{ gridColumn: "span 3" }}>
          <Card
            title="Abandono de carrinho"
            value={data?.abandonedCount?.toString() || "0"}
            icon={<ShoppingBag size={16} />}
          />
        </div>

        <div style={{ gridColumn: "span 3" }}>
          <Card
            title="Reembolso"
            value="R$ 0,00"
            subtext="0 pedido(s)"
            icon={<RotateCcw size={16} />}
          />
        </div>

        <div style={{ gridColumn: "span 3" }}>
          <Card
            title="Produtos"
            value={data?.productsCount?.toString() || "0"}
            subtext={`${data?.checkoutsCount || 0} links de checkout`}
            icon={<Package size={16} />}
          />
        </div>

        {/* Row 3 - Sales Performance Chart (Full Width) */}
        <div style={{ gridColumn: "span 12" }}>
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

