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
  AlertTriangle,
  Calendar as CalendarIcon
} from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DateRange } from "react-day-picker";
import Link from "next/link";
import { Header } from "./components/Header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { useLoading } from "./context/LoadingContext";
import { SalesChart } from "./components/SalesChart";


export default function Home() {
  const [data, setData] = useState<any>(null);
  const { setIsLoading } = useLoading();
  const [period, setPeriod] = useState("today");
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

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
            onClick={() => { setPeriod(tab.id); setIsDatePickerOpen(false); }}
          >
            {tab.label}
          </button>
        ))}

        <div style={{ position: 'relative' }}>
          <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
            <PopoverTrigger 
              className={`tab-item flex items-center gap-2 ${period.startsWith('custom_') ? 'active' : ''}`}
            >
              <CalendarIcon size={14} />
              {dateRange?.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })} -{" "}
                    {format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}
                  </>
                ) : (
                  format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })
                )
              ) : (
                <span>Período</span>
              )}
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-[var(--bg-card)] border border-[var(--border-color)] shadow-2xl rounded-xl z-50" align="end">
              <Calendar
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
                locale={ptBR}
              />
              <div className="flex justify-end gap-2 p-3 border-t border-[var(--border-color)]">
                <button 
                  className="px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors !bg-transparent !border-none !shadow-none"
                  onClick={() => {
                    setDateRange(undefined);
                    setIsDatePickerOpen(false);
                  }}
                >
                  Limpar
                </button>
                <button 
                  className="px-3 py-1.5 text-xs font-bold bg-[var(--accent)] text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 !border-none !shadow-none"
                  disabled={!dateRange?.from || !dateRange?.to}
                  onClick={() => {
                    if (dateRange?.from && dateRange?.to) {
                      const start = format(dateRange.from, "yyyy-MM-dd");
                      const end = format(dateRange.to, "yyyy-MM-dd");
                      setPeriod(`custom_${start}_${end}`);
                      setIsDatePickerOpen(false);
                    }
                  }}
                >
                  Aplicar
                </button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Dashboard Grid - Tailwind + Shadcn */}
      <section className="grid grid-cols-1 md:grid-cols-12 gap-6 w-full mt-8">
        {/* Row 1 - Currency Cards (3 cards, 4 cols each) */}
        <div className="col-span-1 md:col-span-4 flex flex-col">
          <Card className="bg-card border-none ring-0 h-full w-full" style={{ borderLeft: '4px solid #84cc16' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Vendas BRL</CardTitle>
              <div className="p-2 bg-lime-500/10 rounded-lg text-lime-500">
                <DollarSign size={16} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(data?.totalSalesValueBRL || 0, "BRL")}</div>
              <p className="text-xs text-muted-foreground mt-1">Pendentes: {formatCurrency(data?.pendingSalesValueBRL || 0, "BRL")}</p>
            </CardContent>
          </Card>
        </div>
        <div className="col-span-1 md:col-span-4 flex flex-col">
          <Card className="bg-card border-none ring-0 h-full w-full" style={{ borderLeft: '4px solid #3b82f6' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Vendas USD</CardTitle>
              <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500">
                <DollarSign size={16} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(data?.totalSalesValueUSD || 0, "USD")}</div>
              <p className="text-xs text-muted-foreground mt-1">Pendentes: {formatCurrency(data?.pendingSalesValueUSD || 0, "USD")}</p>
            </CardContent>
          </Card>
        </div>
        <div className="col-span-1 md:col-span-4 flex flex-col">
          <Card className="bg-card border-none ring-0 h-full w-full" style={{ borderLeft: '4px solid #f97316' }}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Vendas EUR</CardTitle>
              <div className="p-2 bg-orange-500/10 rounded-lg text-orange-500">
                <DollarSign size={16} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(data?.totalSalesValueEUR || 0, "EUR")}</div>
              <p className="text-xs text-muted-foreground mt-1">Pendentes: {formatCurrency(data?.pendingSalesValueEUR || 0, "EUR")}</p>
            </CardContent>
          </Card>
        </div>

        {/* Row 2 - Stats Cards (4 cards, 3 cols each) */}
        <div className="col-span-1 md:col-span-3 flex flex-col">
          <Card className="bg-card border-none ring-0 h-full w-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Qtd Vendas</CardTitle>
              <ShoppingCart size={16} className="text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data?.totalSalesCount?.toString() || "0"}</div>
              <p className="text-xs text-muted-foreground mt-1">Ticket médio: {formatCurrency(data?.averageTicket || 0)}</p>
            </CardContent>
          </Card>
        </div>

        <div className="col-span-1 md:col-span-3 flex flex-col">
          <Card className="bg-card border-none ring-0 h-full w-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Abandono de carrinho</CardTitle>
              <ShoppingBag size={16} className="text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data?.abandonedCount?.toString() || "0"}</div>
            </CardContent>
          </Card>
        </div>

        <div className="col-span-1 md:col-span-3 flex flex-col">
          <Card className="bg-card border-none ring-0 h-full w-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Reembolso</CardTitle>
              <RotateCcw size={16} className="text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R$ 0,00</div>
              <p className="text-xs text-muted-foreground mt-1">0 pedido(s)</p>
            </CardContent>
          </Card>
        </div>

        <div className="col-span-1 md:col-span-3 flex flex-col">
          <Card className="bg-card border-none ring-0 h-full w-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Produtos</CardTitle>
              <Package size={16} className="text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data?.productsCount?.toString() || "0"}</div>
              <p className="text-xs text-muted-foreground mt-1">{data?.checkoutsCount || 0} links de checkout</p>
            </CardContent>
          </Card>
        </div>

        {/* Row 3 - Sales Performance Chart (Full Width) */}
        <div className="col-span-1 md:col-span-12 flex flex-col">
          <Card className="bg-card border-none ring-0 h-full w-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-sm font-medium text-muted-foreground">Desempenho de Vendas (Aprovadas)</CardTitle>
              <BarChart3 size={16} className="text-muted-foreground" />
            </CardHeader>
            <CardContent className="py-6 h-full min-h-[350px]">
              <SalesChart data={data?.chartData} />
            </CardContent>
          </Card>
        </div>
      </section>
    </>
  );
}

