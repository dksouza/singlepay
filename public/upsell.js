(function () {
    // Determine the API base URL (current domain or hardcoded)
    const API_BASE = window.location.origin;

    async function initUpsell() {
        const container = document.querySelector('[data-singlepay-upsell]');
        if (!container) return;

        const strategyId = container.getAttribute('data-singlepay-upsell');
        if (!strategyId) return;

        try {
            const response = await fetch(`${API_BASE}/api/upsell/strategy/${strategyId}`);
            if (!response.ok) throw new Error('Strategy not found');
            const strategy = await response.json();

            // 1. Try to find existing buttons on the page
            const customAccept = document.querySelector('[data-sp-accept="true"]');
            const customDecline = document.querySelector('[data-sp-decline="true"]');

            if (customAccept && customDecline) {
                attachEvents(customAccept, customDecline, strategy);
            } else {
                // 2. Render default buttons if not found
                renderDefaultButtons(container, strategy);
            }

            // 3. Handle inactive strategy (Skip)
            if (strategy.is_active === false) {
                console.log('SinglePay Upsell: Strategy is inactive, skipping...');
                const declineBtn = customDecline || container.querySelector('#sp-decline');
                if (declineBtn) {
                    declineBtn.click();
                } else {
                    // Fallback redirect
                    const params = new URLSearchParams(window.location.search);
                    const pi = params.get('pi') || sessionStorage.getItem('singlepay_last_pi');
                    const nextUrl = new URL(strategy.decline_url || '/thank-you', window.location.origin);
                    if (pi) nextUrl.searchParams.set('pi', pi);
                    window.location.href = nextUrl.toString();
                }
            }
        } catch (err) {
            console.error('SinglePay Upsell Error:', err);
        }
    }

    function renderDefaultButtons(container, strategy) {
        const { accept_text, accept_bg_color, accept_text_color, decline_text } = strategy;

        container.innerHTML = `
            <div id="sp-upsell-wrapper" style="font-family: sans-serif; text-align: center; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="display: flex; flex-direction: column; align-items: center; gap: 20px;">
                    <button id="sp-accept" style="width: 100%; max-width: 500px; background-color: ${accept_bg_color}; color: ${accept_text_color}; padding: 18px; border-radius: 8px; border: none; font-weight: 700; font-size: 18px; cursor: pointer; transition: all 0.2s;">
                        ${accept_text}
                    </button>
                    
                    <button id="sp-decline" style="background: none; border: none; color: #1a1a1a; text-decoration: underline; font-size: 14px; cursor: pointer; font-weight: 500; opacity: 0.8; transition: opacity 0.2s;">
                        ${decline_text}
                    </button>
                </div>
            </div>
        `;

        attachEvents(container.querySelector('#sp-accept'), container.querySelector('#sp-decline'), strategy);
    }

    function attachEvents(acceptBtn, declineBtn, strategy) {
        // Hover effects for default buttons
        if (acceptBtn.id === 'sp-accept') {
            acceptBtn.addEventListener('mouseover', () => acceptBtn.style.opacity = '0.9');
            acceptBtn.addEventListener('mouseout', () => acceptBtn.style.opacity = '1');
            declineBtn.addEventListener('mouseover', () => declineBtn.style.opacity = '0.9');
            declineBtn.addEventListener('mouseout', () => declineBtn.style.opacity = '1');
        }

        const params = new URLSearchParams(window.location.search);
        let pi = params.get('pi');

        if (pi) {
            // Salva na sessão e limpa a URL para ficar esteticamente melhor
            sessionStorage.setItem('singlepay_last_pi', pi);
            const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + window.location.hash;
            window.history.replaceState({ path: cleanUrl }, '', cleanUrl);
        } else {
            // Tenta recuperar da sessão caso já tenha passado por uma página anterior
            pi = sessionStorage.getItem('singlepay_last_pi');
        }

        acceptBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const originalText = acceptBtn.innerText;
            acceptBtn.disabled = true;
            acceptBtn.innerText = "Processando...";

            if (!pi) {
                alert('Erro: ID da transação anterior não encontrado na URL (?pi=...)');
                acceptBtn.disabled = false;
                acceptBtn.innerText = originalText;
                return;
            }

            try {
                const res = await fetch(`${API_BASE}/api/upsell/purchase`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ strategy_id: strategy.id, previous_pi: pi })
                });

                const data = await res.json();
                if (data.success) {
                    // Propaga o novo PI (ou o atual) para a próxima página do funil
                    const nextUrl = new URL(strategy.accept_url || '/thank-you', window.location.origin);
                    nextUrl.searchParams.set('pi', data.pi || pi);
                    window.location.href = nextUrl.toString();
                } else {
                    alert('Erro ao processar a compra do upsell. Verifique o console.');
                    acceptBtn.disabled = false;
                    acceptBtn.innerText = originalText;
                }
            } catch (err) {
                alert('Erro de conexão. Verifique sua internet.');
                acceptBtn.disabled = false;
                acceptBtn.innerText = originalText;
            }
        });

        declineBtn.addEventListener('click', (e) => {
            e.preventDefault();
            // Propaga o PI atual mesmo em caso de recusa
            const nextUrl = new URL(strategy.decline_url || '/thank-you', window.location.origin);
            nextUrl.searchParams.set('pi', pi);
            window.location.href = nextUrl.toString();
        });
    }

    // Initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initUpsell);
    } else {
        initUpsell();
    }
})();
