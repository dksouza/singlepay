"use client";

import { useEffect, useState } from "react";
import { Clock, CheckCircle2, LogOut, Mail, ShieldAlert } from "lucide-react";
import { createClient } from "../../lib/supabase/client";
import { signOut } from "../actions/authActions";

export default function PendingApprovalPage() {
  const [email, setEmail] = useState<string>("");
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setEmail(user.email || "");
      }
    };
    getUser();
  }, []);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f8fafc',
      padding: '24px',
      fontFamily: 'inherit'
    }}>
      <div style={{
        maxWidth: '480px',
        width: '100%',
        backgroundColor: '#ffffff',
        borderRadius: '32px',
        padding: '40px',
        boxShadow: '0 20px 50px rgba(0,0,0,0.05)',
        border: '1px solid #f1f5f9',
        textAlign: 'center'
      }}>

        <div style={{
          width: '80px',
          height: '80px',
          backgroundColor: '#fffbeb',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 32px',
          color: '#f59e0b'
        }}>
          <Clock size={40} strokeWidth={1.5} />
        </div>

        <h1 style={{ fontSize: '28px', fontWeight: '900', color: '#0f172a', marginBottom: '16px' }}>
          Conta em análise
        </h1>

        <p style={{ color: '#64748b', lineHeight: '1.6', marginBottom: '40px', fontSize: '15px' }}>
          Sua conta está sendo analisada pela nossa equipe. Você receberá um e-mail de confirmação assim que ela for aprovada.
        </p>

        {/* Info Box */}
        <div style={{
          backgroundColor: '#f8fafc',
          borderRadius: '16px',
          padding: '24px',
          border: '1px solid #f1f5f9',
          marginBottom: '32px',
          textAlign: 'left'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: '#94a3b8',
            fontSize: '11px',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginBottom: '8px'
          }}>
            <Mail size={14} />
            E-mail Cadastrado
          </div>
          <p style={{ color: '#1e293b', fontWeight: 'bold', fontSize: '18px', wordBreak: 'break-all', margin: 0 }}>
            {email || "carregando..."}
          </p>
        </div>

        {/* Steps */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '40px', textAlign: 'left', padding: '0 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <CheckCircle2 size={24} color="#10b981" />
            <span style={{ color: '#1e293b', fontWeight: '500', fontSize: '15px' }}>Conta criada com sucesso</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <CheckCircle2 size={24} color="#10b981" />
            <span style={{ color: '#1e293b', fontWeight: '500', fontSize: '15px' }}>E-mail confirmado</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#fef3c7', display: 'flex', alignItems: 'center', justify_content: 'center', color: '#d97706' }}>
              <Clock size={16} />
            </div>
            <span style={{ color: '#d97706', fontWeight: 'bold', fontSize: '15px' }}>Aguardando aprovação do admin</span>
          </div>
        </div>

        <button
          onClick={() => signOut()}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            backgroundColor: '#ffffff',
            color: '#475569',
            fontWeight: 'bold',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <LogOut size={18} />
          Sair da conta
        </button>

        <p style={{ fontSize: '13px', color: '#94a3b8', marginTop: '32px' }}>
          Dúvidas? Entre em contato pelo suporte.
        </p>
      </div>
    </div>
  );
}
