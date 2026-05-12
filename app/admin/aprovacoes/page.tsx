"use client";

export const runtime = 'edge';
export const dynamic = 'force-dynamic';


import { useEffect, useState } from "react";
import { UserCheck, UserX, Clock, Search, AlertCircle, ShieldCheck } from "lucide-react";
import { getPendingUsers, approveUser, rejectUser } from "../../actions/adminActions";
import { useLoading } from "../../context/LoadingContext";
import { Header } from "../../components/Header";

export default function AdminApprovalsPage() {
  const [users, setUsers] = useState<any[]>([]);
  const { setIsLoading } = useLoading();
  const [error, setError] = useState<string | null>(null);

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
      
      <div className="flex flex-responsive justify-between items-center mb-8">
        <div>
          <h2 className="text-2xl font-bold">Gestão de Usuários</h2>
          <p className="text-secondary text-sm">Gerencie o acesso dos usuários à plataforma</p>
        </div>
      </div>

      <div className="nav-divider" style={{ marginBottom: "32px" }}></div>

      <div className="table-container">
        <table className="premium-table">
          <thead>
            <tr>
              <th>Usuário</th>
              <th>Data de Cadastro</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: '80px', textAlign: 'center' }}>
                  <div className="flex flex-col items-center gap-4 text-secondary">
                    <ShieldCheck size={48} style={{ opacity: 0.2 }} />
                    <p className="font-medium">Nenhum usuário cadastrado no momento.</p>
                  </div>
                </td>
              </tr>
            ) : (
              users.map((user) => (
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
                    <div className="flex justify-end gap-2">
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
          </tbody>
        </table>
      </div>
    </>
  );
}
