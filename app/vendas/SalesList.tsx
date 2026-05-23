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
  RefreshCcw,
  SlidersHorizontal,
  Activity,
  Check,
  X,
  Phone,
  Tag,
  MapPin,
  FileText,
  Link
} from "lucide-react";
import { Header } from "../components/Header";
import { useLoading } from "../context/LoadingContext";
import { resendAccessEmail, resendRecoveryEmail } from "../actions/paymentActions";

export default function SalesList({ initialSales }: { initialSales: any[] }) {
  const [sales, setSales] = useState(initialSales);
  const [filters, setFilters] = useState({
    status: "all",
    type: "all",
    startDate: "",
    endDate: ""
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [selectedSale, setSelectedSale] = useState<any | null>(null);
  const { isLoading, setIsLoading } = useLoading();

  useEffect(() => {
    // Close dropdown on click outside
    const handleClickOutside = () => {
      setActiveMenuId(null);
      setIsFilterOpen(false);
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const handleResendAccess = async (saleId: string) => {
    setActiveMenuId(null);
    setIsLoading(true);
    try {
      const result = await resendAccessEmail(saleId);
      if (result.success) {
        alert("Acesso enviado com sucesso para o cliente!");
      } else {
        alert("Erro: " + result.error);
      }
    } catch (err) {
      alert("Erro técnico ao tentar enviar o e-mail.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendRecovery = async (saleId: string) => {
    setActiveMenuId(null);
    setIsLoading(true);
    try {
      const result = await resendRecoveryEmail(saleId);
      if (result.success) {
        alert("E-mail de recuperação enviado com sucesso!");
      } else {
        alert("Erro: " + result.error);
      }
    } catch (err) {
      alert("Erro técnico ao tentar enviar a recuperação.");
    } finally {
      setIsLoading(false);
    }
  };

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

  const filteredSales = sales.filter((s: any) => {
    // Text Search
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      const matchesName = s.customer_name?.toLowerCase().includes(query);
      const matchesEmail = s.customer_email?.toLowerCase().includes(query);
      const matchesId = s.id?.toLowerCase().includes(query);
      if (!matchesName && !matchesEmail && !matchesId) return false;
    }

    // Status
    if (filters.status !== "all" && s.status !== filters.status) return false;
    
    // Type
    if (filters.type === "subscription" && !s.stripe_subscription_id) return false;
    if (filters.type === "one_time" && s.stripe_subscription_id) return false;
    
    // Date
    if (filters.startDate) {
      if (new Date(s.created_at) < new Date(filters.startDate + "T00:00:00")) return false;
    }
    if (filters.endDate) {
      if (new Date(s.created_at) > new Date(filters.endDate + "T23:59:59")) return false;
    }
    
    return true;
  });

  const activeFiltersCount = 
    (filters.status !== "all" ? 1 : 0) + 
    (filters.type !== "all" ? 1 : 0) + 
    (filters.startDate || filters.endDate ? 1 : 0);

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
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
        <div className="tabs-container" style={{ margin: 0, minWidth: 'max-content' }}>
          <button 
            className={`tab-item ${filters.status === "all" ? "active" : ""}`}
            onClick={() => { setFilters({...filters, status: "all"}); setCurrentPage(1); }}
          >
            Tudo
          </button>
          <button 
            className={`tab-item ${filters.status === "succeeded" ? "active" : ""}`}
            onClick={() => { setFilters({...filters, status: "succeeded"}); setCurrentPage(1); }}
          >
            Aprovadas
          </button>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="search-container-responsive" style={{ position: 'relative', flex: 1, minWidth: '280px' }}>
            <Search size={18} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input 
              type="text" 
              placeholder="Buscar venda ou cliente..." 
              className="form-input" 
              style={{ paddingLeft: '44px', width: '100%' }}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          
          <div style={{ position: 'relative' }}>
            <button 
              className="flex items-center gap-2 form-input hover:bg-[var(--bg-card-hover)] transition-all" 
              style={{ width: 'auto', whiteSpace: 'nowrap', backgroundColor: 'var(--bg-card)', cursor: 'pointer' }}
              onClick={(e) => {
                e.stopPropagation();
                setIsFilterOpen(!isFilterOpen);
                setActiveMenuId(null);
              }}
            >
              <SlidersHorizontal size={16} className="text-secondary" />
              <span>Filtrar</span>
              {activeFiltersCount > 0 && (
                <span className="flex items-center justify-center bg-green-500 text-white rounded-full text-[11px] font-bold" style={{ width: '18px', height: '18px', marginLeft: '4px' }}>
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {isFilterOpen && (
              <div 
                className="dropdown-menu animate-in fade-in zoom-in duration-200" 
                style={{ 
                  position: 'absolute', 
                  right: '0', 
                  top: 'calc(100% + 12px)', 
                  zIndex: 100, 
                  backgroundColor: 'var(--bg-card)', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '24px', 
                  boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
                  width: '340px',
                  padding: '24px'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center mb-6 pb-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
                  <h3 className="text-[15px] font-bold" style={{ color: 'var(--text-primary)' }}>Filtros Avançados</h3>
                  <button onClick={() => setIsFilterOpen(false)} className="transition-colors hover:opacity-70" style={{ color: 'var(--text-secondary)' }}>
                    <X size={18} />
                  </button>
                </div>

                {/* Status Column */}
                <div className="mb-6">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>Status da Transação</h4>
                  <div className="flex flex-col gap-2">
                    {[
                      { id: "all", label: "Todas as transações", icon: Activity },
                      { id: "succeeded", label: "Aprovadas", icon: CheckCircle2 },
                      { id: "pending", label: "Pendentes", icon: Clock },
                      { id: "refused", label: "Recusadas", icon: AlertCircle }
                    ].map(opt => (
                      <button 
                        key={opt.id}
                        className="flex items-center justify-between p-3 rounded-xl transition-all border text-left"
                        style={{
                          backgroundColor: filters.status === opt.id ? 'var(--bg-card)' : 'transparent',
                          borderColor: filters.status === opt.id ? 'var(--accent)' : 'var(--border-color)',
                          boxShadow: filters.status === opt.id ? '0 0 0 1px var(--accent)' : 'none'
                        }}
                        onMouseEnter={(e) => {
                          if (filters.status !== opt.id) {
                            e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (filters.status !== opt.id) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }
                        }}
                        onClick={() => { setFilters({...filters, status: opt.id}); setCurrentPage(1); }}
                      >
                        <div className="flex items-center gap-3">
                          <opt.icon 
                            size={16} 
                            style={{ color: filters.status === opt.id ? 'var(--accent)' : 'var(--text-secondary)' }} 
                          />
                          <span 
                            className="text-[13px] font-medium transition-colors" 
                            style={{ color: filters.status === opt.id ? 'var(--text-primary)' : 'var(--text-secondary)' }}
                          >
                            {opt.label}
                          </span>
                        </div>
                        {filters.status === opt.id && (
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--accent)' }}></div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tipo Column */}
                <div className="mb-6">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>Modalidade</h4>
                  <div className="flex gap-2 p-1.5 rounded-[14px]" style={{ backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)' }}>
                    {[
                      { id: "all", label: "Todas" },
                      { id: "subscription", label: "Assinatura" },
                      { id: "one_time", label: "Único" }
                    ].map(opt => (
                      <button 
                        key={opt.id}
                        className="flex-1 py-2 px-2 rounded-[10px] text-[12px] font-medium transition-all"
                        style={{
                          backgroundColor: filters.type === opt.id ? 'var(--bg-card)' : 'transparent',
                          color: filters.type === opt.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                          boxShadow: filters.type === opt.id ? '0 2px 5px rgba(0,0,0,0.2)' : 'none',
                          border: filters.type === opt.id ? '1px solid var(--border-color)' : '1px solid transparent'
                        }}
                        onClick={() => { setFilters({...filters, type: opt.id}); setCurrentPage(1); }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Data Column */}
                <div className="mb-2">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>Período</h4>
                  <div className="flex gap-3">
                    <div className="flex-1 flex flex-col gap-1.5">
                      <label className="text-[10px] font-medium uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>De</label>
                      <input 
                        type="date" 
                        className="form-input" 
                        style={{ padding: '9px 12px', fontSize: '13px', backgroundColor: 'var(--bg-main)', width: '100%', borderColor: 'var(--border-color)', borderRadius: '12px' }}
                        value={filters.startDate}
                        onChange={(e) => { setFilters({...filters, startDate: e.target.value}); setCurrentPage(1); }}
                      />
                    </div>
                    <div className="flex-1 flex flex-col gap-1.5">
                      <label className="text-[10px] font-medium uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>Até</label>
                      <input 
                        type="date" 
                        className="form-input" 
                        style={{ padding: '9px 12px', fontSize: '13px', backgroundColor: 'var(--bg-main)', width: '100%', borderColor: 'var(--border-color)', borderRadius: '12px' }}
                        value={filters.endDate}
                        onChange={(e) => { setFilters({...filters, endDate: e.target.value}); setCurrentPage(1); }}
                      />
                    </div>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="flex gap-3 pt-6 mt-6 border-t" style={{ borderColor: 'var(--border-color)' }}>
                  <button 
                    className="flex-1 text-[13px] font-bold py-2.5 rounded-xl transition-all border"
                    style={{ backgroundColor: 'transparent', borderColor: 'var(--border-color)', color: 'var(--text-secondary)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.backgroundColor = 'var(--bg-main)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.backgroundColor = 'transparent'; }}
                    onClick={() => { setFilters({ status: "all", type: "all", startDate: "", endDate: "" }); setCurrentPage(1); setIsFilterOpen(false); }}
                  >
                    Limpar
                  </button>
                  <button 
                    className="flex-1 text-[13px] font-bold py-2.5 rounded-xl transition-all"
                    style={{ backgroundColor: 'var(--accent)', color: '#fff' }}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                    onClick={() => setIsFilterOpen(false)}
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            )}
          </div>
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
                  <td style={{ textAlign: 'right', position: 'relative' }}>
                    <button 
                      className="icon-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveMenuId(activeMenuId === sale.id ? null : sale.id);
                      }}
                    >
                      <MoreVertical size={18} />
                    </button>

                    {activeMenuId === sale.id && (
                      <div className="dropdown-menu animate-in fade-in zoom-in duration-200" style={{ 
                        position: 'absolute', 
                        right: '0', 
                        top: 'calc(100% + 8px)', 
                        zIndex: 999, 
                        backgroundColor: 'var(--bg-card)', 
                        border: '1px solid var(--border-color)', 
                        borderRadius: '12px', 
                        boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                        minWidth: '180px'
                      }}>
                        {/* Seta do Menu */}
                        <div style={{
                          position: 'absolute',
                          top: '-6px',
                          right: '12px',
                          width: '10px',
                          height: '10px',
                          backgroundColor: 'var(--bg-card)',
                          borderTop: '1px solid var(--border-color)',
                          borderLeft: '1px solid var(--border-color)',
                          transform: 'rotate(45deg)',
                          zIndex: 1
                        }}></div>
                        
                        {/* Conteúdo do Menu */}
                        <div style={{
                          position: 'relative',
                          zIndex: 2,
                          backgroundColor: 'var(--bg-card)',
                          borderRadius: '11px',
                          overflow: 'hidden',
                          display: 'flex',
                          flexDirection: 'column'
                        }}>
                        {sale.status === 'succeeded' && (
                          <button 
                            className="dropdown-item"
                            onClick={() => handleResendAccess(sale.id)}
                            style={{
                              width: '100%',
                              padding: '12px 16px',
                              textAlign: 'left',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              fontSize: '13px',
                              fontWeight: '600',
                              color: 'var(--text-primary)',
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              transition: 'background 0.2s'
                            }}
                            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)')}
                            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                          >
                            <Mail size={16} className="text-accent" />
                            Reenviar acesso
                          </button>
                        )}
                        {(sale.status === 'refused' || (sale.status === 'pending' && sale.customer_email)) && (
                          <button 
                            className="dropdown-item"
                            onClick={() => handleResendRecovery(sale.id)}
                            style={{
                              width: '100%',
                              padding: '12px 16px',
                              textAlign: 'left',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              fontSize: '13px',
                              fontWeight: '600',
                              color: 'var(--text-primary)',
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              transition: 'background 0.2s'
                            }}
                            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)')}
                            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                          >
                            <RefreshCcw size={16} className="text-amber-500" />
                            Reenviar Oferta
                          </button>
                        )}
                        <div style={{ height: '1px', backgroundColor: 'var(--border-color)', margin: '4px 0' }}></div>
                        <button 
                          className="dropdown-item"
                          onClick={() => {
                            setSelectedSale(sale);
                            setActiveMenuId(null);
                          }}
                          style={{
                            width: '100%',
                            padding: '12px 16px',
                            textAlign: 'left',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            fontSize: '13px',
                            fontWeight: '600',
                            color: 'var(--text-secondary)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'color 0.2s, background 0.2s',
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.color = 'var(--text-primary)';
                            e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.color = 'var(--text-secondary)';
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                        >
                          Ver detalhes
                        </button>
                        </div>
                      </div>
                    )}
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

      {/* Modal Ver Detalhes (Estilo Padronizado) */}
      {selectedSale && (
        <div className="modal-overlay" onClick={() => setSelectedSale(null)}>
          <div className="modal-container" style={{ padding: 0, width: '100%', maxWidth: '700px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px', borderBottom: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
                <FileText color="var(--primary)" size={24} /> Detalhes da Transação
              </h3>
              <button 
                onClick={() => setSelectedSale(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', transition: 'opacity 0.2s' }}
                onMouseOver={e => e.currentTarget.style.opacity = '0.7'}
                onMouseOut={e => e.currentTarget.style.opacity = '1'}
              >
                <X size={24} />
              </button>
            </div>
            
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', overflowY: 'auto', maxHeight: 'calc(90vh - 140px)' }}>
              
              {/* Resumo */}
              <div style={{ backgroundColor: 'var(--bg-main)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Status da Venda</h4>
                  {getStatusTag(selectedSale.status)}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <h4 style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Valor Líquido</h4>
                  <p style={{ fontSize: '1.5rem', fontWeight: 'bold', color: selectedSale.status === 'succeeded' ? '#10b981' : 'var(--text-primary)', margin: 0 }}>
                    {formatCurrency(selectedSale.amount, selectedSale.currency)}
                  </p>
                </div>
              </div>

              {/* Informações do Cliente */}
              <div style={{ backgroundColor: 'var(--bg-main)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <User size={16} /> Dados do Cliente
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Nome Completo</p>
                    <p style={{ fontWeight: '500', fontSize: '0.875rem', color: 'var(--text-primary)' }}>{selectedSale.customer_name || "Não informado"}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>E-mail</p>
                    <p style={{ fontWeight: '500', fontSize: '0.875rem', color: 'var(--text-primary)', wordBreak: 'break-all' }}>{selectedSale.customer_email || "Não informado"}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Telefone</p>
                    <p style={{ fontWeight: '500', fontSize: '0.875rem', color: 'var(--text-primary)' }}>{selectedSale.customer_phone || "Não informado"}</p>
                  </div>
                </div>
              </div>

              {/* Informações da Compra */}
              <div style={{ backgroundColor: 'var(--bg-main)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Package size={16} /> Dados da Transação
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Produto Adquirido</p>
                    <p style={{ fontWeight: '500', fontSize: '0.875rem', color: 'var(--text-primary)' }}>{selectedSale.products?.name || "Produto Removido"}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Data e Hora</p>
                    <p style={{ fontWeight: '500', fontSize: '0.875rem', color: 'var(--text-primary)' }}>{new Date(selectedSale.created_at).toLocaleString('pt-BR')}</p>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>ID Stripe (Payment Intent)</p>
                    <p style={{ fontWeight: '500', fontSize: '0.875rem', color: 'var(--text-primary)', wordBreak: 'break-all', fontFamily: 'monospace', padding: '8px', backgroundColor: 'var(--bg-card)', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                      {selectedSale.stripe_payment_intent_id || "Não gerado"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Rastreamento (se existir) */}
              {(selectedSale.src || selectedSale.sck || selectedSale.utm_source || selectedSale.utm_campaign) && (
                <div style={{ backgroundColor: 'var(--bg-main)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <h4 style={{ fontSize: '0.875rem', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <MapPin size={16} /> Rastreamento (UTMs)
                  </h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                    {selectedSale.src && (
                      <div style={{ backgroundColor: 'var(--bg-card)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '2px' }}>SRC</p>
                        <p style={{ fontSize: '0.875rem', fontWeight: '500', color: 'var(--text-primary)' }}>{selectedSale.src}</p>
                      </div>
                    )}
                    {selectedSale.sck && (
                      <div style={{ backgroundColor: 'var(--bg-card)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '2px' }}>SCK</p>
                        <p style={{ fontSize: '0.875rem', fontWeight: '500', color: 'var(--text-primary)' }}>{selectedSale.sck}</p>
                      </div>
                    )}
                    {selectedSale.utm_source && (
                      <div style={{ backgroundColor: 'var(--bg-card)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '2px' }}>Source</p>
                        <p style={{ fontSize: '0.875rem', fontWeight: '500', color: 'var(--text-primary)' }}>{selectedSale.utm_source}</p>
                      </div>
                    )}
                    {selectedSale.utm_campaign && (
                      <div style={{ backgroundColor: 'var(--bg-card)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '2px' }}>Campaign</p>
                        <p style={{ fontSize: '0.875rem', fontWeight: '500', color: 'var(--text-primary)' }}>{selectedSale.utm_campaign}</p>
                      </div>
                    )}
                    {selectedSale.utm_medium && (
                      <div style={{ backgroundColor: 'var(--bg-card)', padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: '2px' }}>Medium</p>
                        <p style={{ fontSize: '0.875rem', fontWeight: '500', color: 'var(--text-primary)' }}>{selectedSale.utm_medium}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
            
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', display: 'flex', justifyContent: 'flex-end', borderBottomLeftRadius: '24px', borderBottomRightRadius: '24px' }}>
              <button 
                onClick={() => setSelectedSale(null)}
                className="btn-primary"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
