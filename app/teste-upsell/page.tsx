"use client";

export const runtime = 'edge';
export const dynamic = 'force-dynamic';
export const dynamic = 'force-dynamic';

export default function TesteUpsell() {
  return (
    <div style={{ 
      backgroundColor: '#09090b', 
      color: 'white', 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      fontFamily: 'sans-serif',
      padding: '20px'
    }}>
      <div style={{ maxWidth: '600px', width: '100%', textAlign: 'center' }}>
        <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>Página de Teste - Upsell One Click</h1>
        <p style={{ color: '#a1a1aa', fontSize: '14px', marginBottom: '40px' }}>
          Use esta página para validar sua integração. Siga as instruções nos comentários do código fonte.
        </p>

        {/* 
            ================================================================
            PASSO 1: COLE O SCRIPT ABAIXO NO SEU EDITOR (DENTRO DA TAG HEAD)
            <script src="https://api.singlepay.com.br/upsell.js" defer async></script>
            ================================================================
        */}

        <div style={{ 
          border: '2px dashed rgba(255,255,255,0.1)', 
          borderRadius: '20px', 
          padding: '60px 20px',
          backgroundColor: 'rgba(255,255,255,0.02)'
        }}>
          <p style={{ color: '#71717a', fontSize: '13px', marginBottom: '24px' }}>
            &darr; A DIV DA ESTRATÉGIA DEVE SER COLOCADA ABAIXO &darr;
          </p>

          {/* 
              ================================================================
              PASSO 2: COLE A SUA DIV DE ESTRATÉGIA ABAIXO:
              Exemplo: <div data-singlepay-upsell="ID-DA-SUA-ESTRATEGIA"></div>
              ================================================================
          */}
          
          <div style={{ color: '#3f3f46', fontStyle: 'italic', fontSize: '12px' }}>
            (O conteúdo do Upsell aparecerá aqui após você inserir a div e o script)
          </div>
        </div>

        <div style={{ marginTop: '40px' }}>
          <a 
            href="/produtos" 
            style={{ 
              color: '#8b5cf6', 
              textDecoration: 'none', 
              fontSize: '14px',
              fontWeight: '600'
            }}
          >
            &larr; Voltar para o Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
