"use client";

export const runtime = 'edge';
export const dynamic = 'force-dynamic';


import { useEffect, useState } from "react";
import { UserCheck, UserX, Clock, Search, AlertCircle, ShieldCheck, Eye, CreditCard, DollarSign, X, Edit2, Check } from "lucide-react";
import { getPendingUsers, approveUser, rejectUser, getUserDetailsForAdmin, updateUserFee } from "../../actions/adminActions";
import { useLoading } from "../../context/LoadingContext";
import { Header } from "../../components/Header";

export default function AdminApprovalsPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const { setIsLoading } = useLoading();
  const [error, setError] = useState<string | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUserDetails, setSelectedUserDetails] = useState<any>(null);
  const [editingFee, setEditingFee] = useState(false);
  const [feeValue, setFeeValue] = useState("");

  const loadUsers = async () => {
    setIsLoading(true);
    const result = await getPendingUsers();
    if (result.error) {
      setError(result.error);
    } else {
      setUsers(result.users || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleApprove = async (id: string) => {
    setIsLoading(true);
    const result = await approveUser(id);
    if (result.success) {
      loadUsers();
    }
    setIsLoading(false);
  };

  const handleReject = async (id: string) => {
    setIsLoading(true);
    const result = await rejectUser(id);
    if (result.success) {
      loadUsers();
    }
    setIsLoading(false);
  };

  const handleViewDetails = async (id: string) => {
    setIsLoading(true);
    setEditingFee(false);
    const result = await getUserDetailsForAdmin(id);
    if (result.success) {
      setSelectedUserDetails(result.details);
      setFeeValue(result.details.profile.fee_percentage?.toString() || "4.9");
      setIsModalOpen(true);
    } else {
      alert(result.error || "Erro ao carregar detalhes do usuário");
    }
    setIsLoading(false);
  };

  const handleSaveFee = async () => {
    if (!selectedUserDetails) return;
    setIsLoading(true);
    const parsedFee = parseFloat(feeValue);
    if (isNaN(parsedFee) || parsedFee < 0 || parsedFee > 100) {
      alert("Taxa inválida.");
      setIsLoading(false);
      return;
    }
    
    const result = await updateUserFee(selectedUserDetails.profile.id, parsedFee);
    if (result.success) {
      setSelectedUserDetails({
        ...selectedUserDetails,
        profile: {
          ...selectedUserDetails.profile,
          fee_percentage: parsedFee
        }
      });
      setEditingFee(false);
    } else {
      alert(result.error || "Erro ao atualizar taxa");
    }
    setIsLoading(false);
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-center">
        <AlertCircle size={48} className="text-red-500 mb-4" />
        <h1 className="text-xl font-bold mb-2">Erro de Acesso</h1>
        <p className="text-secondary">{error}</p>
      </div>
    );
  }

  return (
    <>
      <Header />
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold">Gestão de Usuários</h2>
          <p className="text-secondary text-sm">Gerencie o acesso dos usuários à plataforma</p>
        </div>
        
        <div className="input-with-icon" style={{ display: 'flex', alignItems: 'center', position: 'relative', width: '320px', maxWidth: '100%' }}>
          <Search size={18} className="input-icon" />
          <input
            type="text"
            className="form-input"
            placeholder="Buscar por nome ou e-mail..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="table-container">
        <table className="premium-table">
          <thead>
            <tr>
              <th>Usuário</th>
              <th>Data de Cadastro</th>
              <th>Plano</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '80px', textAlign: 'center' }}>
                  <div className="flex flex-col items-center gap-4 text-secondary">
                    <ShieldCheck size={48} style={{ opacity: 0.2 }} />
                    <p className="font-medium">Nenhum usuário cadastrado no momento.</p>
                  </div>
                </td>
              </tr>
            ) : (
              users
                .filter(user => {
                  if (!searchQuery) return true;
                  const lowerQuery = searchQuery.toLowerCase();
                  const nameMatch = user.full_name?.toLowerCase().includes(lowerQuery);
                  const emailMatch = user.email?.toLowerCase().includes(lowerQuery);
                  return nameMatch || emailMatch;
                })
                .map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="flex flex-col">
                      <span className="font-bold text-primary">{user.full_name || user.email}</span>
                      {user.full_name && <span className="text-[12px] text-secondary">{user.email}</span>}
                      <span className="text-[10px] text-secondary uppercase tracking-widest font-bold mt-1">ID: {user.id.slice(0,8)}</span>
                    </div>
                  </td>
                  <td>
                    <div className="flex items-center gap-2 text-sm text-secondary">
                      <Clock size={14} />
                      {new Date(user.created_at).toLocaleDateString("pt-BR", { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>
                  <td>
                    <span className="px-2 py-1 bg-white/5 border border-[var(--border-color)] rounded-md text-xs font-bold text-primary">
                      {user.plan_id ? user.plan_id.charAt(0).toUpperCase() + user.plan_id.slice(1) : 'Standard'} ({user.fee_percentage || 4.9}%)
                    </span>
                  </td>
                  <td>
                    {user.status === 'approved' ? (
                      <div className="sale-status-tag status-paid">
                        <UserCheck size={12} />
                        Aprovado
                      </div>
                    ) : user.status === 'blocked' ? (
                      <div className="sale-status-tag status-cancelled">
                        <UserX size={12} />
                        Bloqueado
                      </div>
                    ) : (
                      <div className="sale-status-tag status-pending">
                        <Clock size={12} />
                        Pendente
                      </div>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => handleViewDetails(user.id)}
                        className="btn-secondary flex items-center justify-center p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        title="Ver Detalhes"
                      >
                        <Eye size={18} />
                      </button>
                      {(user.status === 'pending' || user.status === 'blocked') && (
                        <button 
                          onClick={() => handleApprove(user.id)}
                          className="btn-success flex items-center gap-2"
                          style={{ padding: '8px 16px', fontSize: '13px' }}
                        >
                          <UserCheck size={16} />
                          Aprovar
                        </button>
                      )}
                      {user.status !== 'blocked' && (
                        <button 
                          onClick={() => handleReject(user.id)}
                          className="btn-danger flex items-center gap-2"
                          style={{ padding: '8px 16px', fontSize: '13px' }}
                        >
                          <UserX size={16} />
                          {user.status === 'approved' ? 'Bloquear' : 'Recusar'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
            
            {users.length > 0 && users.filter(user => {
              if (!searchQuery) return true;
              const lowerQuery = searchQuery.toLowerCase();
              const nameMatch = user.full_name?.toLowerCase().includes(lowerQuery);
              const emailMatch = user.email?.toLowerCase().includes(lowerQuery);
              return nameMatch || emailMatch;
            }).length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: '60px', textAlign: 'center' }}>
                  <div className="flex flex-col items-center gap-4 text-secondary">
                    <Search size={48} style={{ opacity: 0.2 }} />
                    <p className="font-medium">Nenhum usuário encontrado para "{searchQuery}"</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* User Details Modal */}
      {isModalOpen && selectedUserDetails && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-container" style={{ padding: 0 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px', borderBottom: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <UserCheck color="var(--primary)" size={24} /> Detalhes do Usuário
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
              >
                <X size={24} />
              </button>
            </div>
            
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', overflowY: 'auto', maxHeight: 'calc(90vh - 140px)' }}>
              {/* Basic Info */}
              <div style={{ backgroundColor: 'var(--bg-main)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>Informações Básicas</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Nome Completo</p>
                    <p style={{ fontWeight: '500', fontSize: '0.875rem' }}>{selectedUserDetails.profile.full_name || "Não informado"}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>E-mail</p>
                    <p style={{ fontWeight: '500', fontSize: '0.875rem', wordBreak: 'break-all' }}>{selectedUserDetails.profile.email}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Telefone</p>
                    <p style={{ fontWeight: '500', fontSize: '0.875rem' }}>{selectedUserDetails.profile.phone || "Não informado"}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Status da Conta</p>
                    <p style={{ fontWeight: '500', fontSize: '0.875rem', textTransform: 'capitalize' }}>
                      {selectedUserDetails.profile.status === "approved" ? "Aprovado" : selectedUserDetails.profile.status === "pending" ? "Pendente" : "Bloqueado"}
                    </p>
                  </div>
                  <div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Plano Atual</p>
                    <p style={{ fontWeight: '500', fontSize: '0.875rem' }}>
                      <span className="px-2 py-0.5 bg-white/5 border border-[var(--border-color)] rounded text-primary">
                        {selectedUserDetails.profile.plan_id ? selectedUserDetails.profile.plan_id.charAt(0).toUpperCase() + selectedUserDetails.profile.plan_id.slice(1) : 'Standard'} ({selectedUserDetails.profile.fee_percentage || 4.9}%)
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Billing Info */}
              <div style={{ backgroundColor: 'var(--bg-main)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                <h4 style={{ fontSize: '0.875rem', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '16px' }}>Situação Financeira</h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', borderRadius: '8px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: selectedUserDetails.hasCard ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: selectedUserDetails.hasCard ? '#22c55e' : '#ef4444' }}>
                        <CreditCard size={20} />
                      </div>
                      <div>
                        <p style={{ fontSize: '0.875rem', fontWeight: 'bold' }}>Cartão de Crédito</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {selectedUserDetails.hasCard 
                            ? `Cadastrado (${selectedUserDetails.cardBrand} final ${selectedUserDetails.cardLast4})` 
                            : "Não cadastrado"}
                        </p>
                      </div>
                    </div>
                    {selectedUserDetails.hasCard ? (
                      <span style={{ padding: '4px 8px', backgroundColor: 'rgba(34, 197, 94, 0.2)', color: '#22c55e', fontSize: '0.75rem', fontWeight: 'bold', borderRadius: '4px' }}>OK</span>
                    ) : (
                      <span style={{ padding: '4px 8px', backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', fontSize: '0.75rem', fontWeight: 'bold', borderRadius: '4px' }}>Pendente</span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', borderRadius: '8px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: 'rgba(139, 92, 246, 0.1)', color: 'var(--primary)' }}>
                        <DollarSign size={20} />
                      </div>
                      <div>
                        <p style={{ fontSize: '0.875rem', fontWeight: 'bold' }}>Taxa da Plataforma</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          Taxa aplicada sobre vendas
                        </p>
                      </div>
                    </div>
                    <div>
                      {editingFee ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input 
                            type="number" 
                            step="0.1"
                            className="form-input" 
                            style={{ width: '80px', padding: '6px 8px', fontSize: '14px' }}
                            value={feeValue}
                            onChange={(e) => setFeeValue(e.target.value)}
                          />
                          <button onClick={handleSaveFee} className="btn-success" style={{ padding: '6px', borderRadius: '6px' }}>
                            <Check size={16} />
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--primary)' }}>
                            {selectedUserDetails.profile.fee_percentage || 4.9}%
                          </span>
                          <button onClick={() => setEditingFee(true)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                            <Edit2 size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', borderRadius: '8px', backgroundColor: 'var(--bg-card)', border: '1px solid var(--border-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ padding: '8px', borderRadius: '8px', backgroundColor: selectedUserDetails.isInadimplente ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)', color: selectedUserDetails.isInadimplente ? '#ef4444' : '#22c55e' }}>
                        <DollarSign size={20} />
                      </div>
                      <div>
                        <p style={{ fontSize: '0.875rem', fontWeight: 'bold' }}>Taxas da Plataforma</p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {selectedUserDetails.isInadimplente 
                            ? "Pagamento falhou (inadimplente)" 
                            : "Em dias"}
                        </p>
                      </div>
                    </div>
                    {selectedUserDetails.isInadimplente ? (
                      <span style={{ padding: '4px 8px', backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#ef4444', fontSize: '0.75rem', fontWeight: 'bold', borderRadius: '4px' }}>Irregular</span>
                    ) : (
                      <span style={{ padding: '4px 8px', backgroundColor: 'rgba(34, 197, 94, 0.2)', color: '#22c55e', fontSize: '0.75rem', fontWeight: 'bold', borderRadius: '4px' }}>OK</span>
                    )}
                  </div>
                  
                  <div style={{ marginTop: '8px', textAlign: 'right' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      Taxas pendentes de faturamento: <span style={{ fontWeight: 'bold', color: 'var(--text-primary)' }}>{(selectedUserDetails.pendingFees).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-main)', display: 'flex', justifyContent: 'flex-end', borderBottomLeftRadius: '24px', borderBottomRightRadius: '24px' }}>
              <button 
                onClick={() => setIsModalOpen(false)}
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
