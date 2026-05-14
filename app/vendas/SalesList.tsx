"use client";

import { useState, useEffect } from "react";
import { 
  Search, 
  Filter, 
  Calendar, 
  CreditCard, 
  User, 
  Mail,
  MoreVertical,
  CheckCircle2,
  Clock,
  AlertCircle,
  Package,
  ChevronRight,
  RefreshCcw
} from "lucide-react";
import { Header } from "../components/Header";
import { useLoading } from "../context/LoadingContext";

export default function SalesList({ initialSales }: { initialSales: any[] }) {
  const [sales, setSales] = useState(initialSales);
  const [filter, setFilter] = useState<"all" | "succeeded">("all");
  const { isLoading, setIsLoading } = useLoading();

  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/sales");
      const result = await response.json();
      
      // Small delay for premium feel
      await new Promise(resolve => setTimeout(resolve, 800));
      
      if (!result.error) {
        setSales(result);
      } else {
        console.error("Sales fetch error:", result.error);
      }
    } catch (err) {
      console.error("Failed to fetch sales:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredSales = filter === "all" 
    ? sales 
    : sales.filter(s => s.status === "succeeded");

  // Pagination logic
  const totalPages = Math.ceil(filteredSales.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedSales = filteredSales.slice(startIndex, startIndex + itemsPerPage);

  const formatCurrency = (value: number, currency = "BRL") => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: currency,
    }).format(value);
  };

  const getStatusTag = (status: string) => {
    switch (status) {
      case "succeeded":
        return (
          <div className="sale-status-tag status-succeeded">
            <CheckCircle2 size={12} />
            Aprovado
          </div>
        );
      case "pending":
        return (
          <div className="sale-status-tag status-pending">
            <Clock size={12} />
            Pendente
          </div>
        );
      case "refused":
        return (
          <div className="sale-status-tag status-refused" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
            <AlertCircle size={12} />
            Recusado
          </div>
        );
      default:
        return (
          <div className="sale-status-tag" style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
            <AlertCircle size={12} />
            {status}
          </div>
        );
    }
  };

  return (
    <>
      <Header />

      <div className="flex flex-responsive justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold">Relatório de Vendas</h2>
          <p className="text-secondary text-sm">Visualize e gerencie todas as suas transações</p>
        </div>
        <div className="flex gap-3">
          <button 
            className="btn-secondary w-full-mobile flex items-center justify-center gap-2" 
            onClick={fetchData} 
            disabled={isLoading}
          >
            <RefreshCcw size={16} className={isLoading ? "animate-spin" : ""} />
            {isLoading ? "Atualizando..." : "Atualizar"}
          </button>
        </div>
      </div>

      <div className="nav-divider" style={{ marginBottom: "32px" }}></div>

      {/* Filters Area */}
      <div className="flex flex-responsive justify-between items-center gap-4 mb-8">
        <div className="tabs-container" style={{ margin: 0, width: '100%' }}>
          <button 
            className={`tab-item ${filter === "all" ? "active" : ""}`}
            onClick={() => { setFilter("all"); setCurrentPage(1); }}
          >
            Tudo
          </button>
          <button 
            className={`tab-item ${filter === "succeeded" ? "active" : ""}`}
            onClick={() => { setFilter("succeeded"); setCurrentPage(1); }}
          >
            Aprovadas
          </button>
        </div>

        <div className="search-container-responsive" style={{ position: 'relative', width: '100%' }}>
          <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input 
            type="text" 
            placeholder="Buscar venda ou cliente..." 
            className="form-input" 
            style={{ paddingLeft: '44px', width: '100%' }}
          />
        </div>
      </div>

      {/* Table Container - Premium Design */}
      <div className="table-container">
        <table className="premium-table">
          <thead>
            <tr>
              <th>Informações da Venda</th>
              <th>Cliente</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Valor Líquido</th>
              <th style={{ width: '60px' }}></th>
            </tr>
          </thead>
          <tbody>
            {paginatedSales.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '60px', textAlign: 'center' }}>
                  <div className="flex flex-col items-center gap-4 text-secondary">
                    <AlertCircle size={48} style={{ opacity: 0.2 }} />
                    <p className="font-medium">Nenhuma venda encontrada para este filtro.</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedSales.map((sale) => (
                <tr key={sale.id}>
                  <td>
                    <div className="flex items-center gap-4">
                      <div className="product-icon-box">
                        <Package size={20} />
                      </div>
                      <div className="flex flex-col gap-1">
                        <span className="font-bold text-primary">{sale.products?.name || "Produto Removido"}</span>
                        <div className="flex items-center gap-1.5 text-[11px] text-secondary">
                          <Calendar size={12} style={{ opacity: 0.6 }} />
                          {new Date(sale.created_at).toLocaleDateString("pt-BR", { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="flex flex-col">
                      <span className="font-semibold text-sm text-primary">{sale.customer_name || "Cliente Desconhecido"}</span>
                      <span className="text-[11px] text-secondary">{sale.customer_email || "N/A"}</span>
                    </div>
                  </td>
                  <td>
                    {getStatusTag(sale.status)}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="flex flex-col items-end">
                      <span className="sale-value" style={{ color: sale.status === 'succeeded' ? '#10b981' : 'var(--text-primary)' }}>
                        {formatCurrency(sale.amount, sale.currency)}
                      </span>
                      <span className="text-[10px] text-secondary uppercase font-bold tracking-wider opacity-60">Stripe</span>
                    </div>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="icon-btn">
                      <MoreVertical size={18} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        
        {/* Pagination Footer - Refined Design */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center p-6 border-top" style={{ backgroundColor: 'var(--bg-card)', borderTop: '1px solid var(--border-color)' }}>
            <div className="text-[13px] font-medium text-secondary">
              Mostrando <span className="text-primary font-bold">{startIndex + 1}</span> a <span className="text-primary font-bold">{Math.min(startIndex + itemsPerPage, filteredSales.length)}</span> de <span className="text-primary font-bold">{filteredSales.length}</span> resultados
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                className="icon-btn-pagination" 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
                title="Anterior"
              >
                <ChevronRight size={18} style={{ transform: 'rotate(180deg)' }} />
              </button>
              
              <div className="flex items-center gap-1.5 mx-2">
                {Array.from({ length: totalPages }).map((_, i) => {
                  // Only show current, first, last, and neighbors if many pages
                  const isVisible = totalPages <= 7 || i === 0 || i === totalPages - 1 || Math.abs(i - (currentPage - 1)) <= 1;
                  
                  if (!isVisible) {
                    if (i === 1 || i === totalPages - 2) return <span key={i} className="px-1 text-secondary opacity-50">...</span>;
                    return null;
                  }

                  return (
                    <button
                      key={i}
                      className={`pagination-number ${currentPage === i + 1 ? 'active' : ''}`}
                      onClick={() => setCurrentPage(i + 1)}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>

              <button 
                className="icon-btn-pagination" 
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => prev + 1)}
                title="Próximo"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
