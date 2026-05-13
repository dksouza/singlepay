/**
 * Mail Utility using Resend API
 */

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: EmailOptions) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.error('[MAIL] Error: RESEND_API_KEY not found in environment variables.');
    return { success: false, error: 'Missing API Key' };
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: 'SinglePay <onboarding@singlepay.com.br>',
        to: [to],
        subject: subject,
        html: html,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[MAIL] Resend API Error Response:', JSON.stringify(data, null, 2));
      return { success: false, error: data };
    }

    console.log('[MAIL] Email sent successfully via Resend!', data.id);
    return { success: true, data };
  } catch (error) {
    console.error('[MAIL] Exception:', error);
    return { success: false, error };
  }
}

/**
 * Send Order Confirmation Email (Localized)
 */
export async function sendOrderConfirmationEmail(sale: any, product: any, lang: string = 'pt') {
  const name = sale.customer_name || 'Cliente';
  const productName = product.name;
  const accessLink = product.delivery_link || 'https://app.singlepay.com.br';

  const translations: Record<string, { subject: string; body: string; button: string }> = {
    pt: {
      subject: `SinglePay | Compra aprovada! O acesso ao seu produto ${productName} chegou!`,
      body: `Parabéns pela compra, ${name}!<br/><br/>Para acessar seu produto <strong>${productName}</strong>, basta utilizar o botão abaixo ou acessar diretamente o link colando no navegador:`,
      button: 'Acessar Produto'
    },
    en: {
      subject: `SinglePay | Purchase approved! Your access to ${productName} is here!`,
      body: `Congratulations on your purchase, ${name}!<br/><br/>To access your product <strong>${productName}</strong>, simply click the button below or copy and paste the link into your browser:`,
      button: 'Access Product'
    },
    es: {
      subject: `SinglePay | ¡Compra aprobada! ¡Ya tienes acceso a tu producto ${productName}!`,
      body: `¡Felicitaciones por tu compra, ${name}!<br/><br/>Para acceder a tu producto <strong>${productName}</strong>, solo tienes que usar el botón de abajo o acceder directamente al enlace pegándolo en tu navegador:`,
      button: 'Acceder al Producto'
    }
  };

  const t = translations[lang] || translations.pt;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
      <h2 style="color: #8b5cf6;">${t.subject}</h2>
      <p style="color: #333; line-height: 1.6;">${t.body}</p>
      
      <div style="margin: 30px 0; text-align: center;">
        <a href="${accessLink}" style="background-color: #8b5cf6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
          ${t.button}
        </a>
      </div>
      
      <p style="color: #666; font-size: 14px;">
        Link direto: <a href="${accessLink}" style="color: #8b5cf6;">${accessLink}</a>
      </p>
      
      <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
      
      <p style="color: #999; font-size: 12px; text-align: center;">
        SinglePay - Sua plataforma de pagamentos globais.
      </p>
    </div>
  `;

  return sendEmail({
    to: sale.customer_email,
    subject: t.subject,
    html: html
  });
}
