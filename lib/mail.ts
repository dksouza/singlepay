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

/**
 * Resend Access Email with specific text
 */
export async function sendResendAccessEmail(sale: any, product: any, lang: string = 'pt') {
  const productName = product.name;
  const accessLink = product.delivery_link || 'https://app.singlepay.com.br';

  const translations: Record<string, { subject: string; body: string; button: string; footer: string }> = {
    pt: {
      subject: "Seu acesso chegou",
      body: "Estamos enviado seu acesso, para acessar seu produto, clique abaixo e aproveite da melhor forma. Obrigado!",
      button: "Acessar Produto",
      footer: "Sua plataforma de pagamentos globais."
    },
    en: {
      subject: "Your access has arrived",
      body: "We are sending your access. To access your product, click below and enjoy. Thank you!",
      button: "Access Product",
      footer: "Your global payment platform."
    },
    es: {
      subject: "Tu acceso ha llegado",
      body: "Estamos enviando tu acceso. Para acceder a tu producto, haz clic abajo y disfruta. ¡Gracias!",
      button: "Acceder al Producto",
      footer: "Tu plataforma de pagos globales."
    }
  };

  const t = translations[lang] || translations.pt;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #f0f0f0; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #8b5cf6; margin: 0; font-size: 24px;">${t.subject}</h1>
      </div>
      
      <p style="color: #4b5563; line-height: 1.8; font-size: 16px; margin-bottom: 30px;">
        ${t.body}
      </p>
      
      <div style="margin: 40px 0; text-align: center;">
        <a href="${accessLink}" style="background-color: #8b5cf6; color: white; padding: 16px 32px; text-decoration: none; border-radius: 12px; font-weight: bold; display: inline-block; font-size: 16px; box-shadow: 0 10px 15px -3px rgba(139, 92, 246, 0.3);">
          ${t.button}
        </a>
      </div>
      
      <p style="color: #9ca3af; font-size: 13px; text-align: center; margin-top: 40px; border-top: 1px solid #f3f4f6; padding-top: 20px;">
        SinglePay - ${t.footer}
      </p>
    </div>
  `;

  return sendEmail({
    to: sale.customer_email,
    subject: t.subject,
    html: html
  });
}

/**
 * Recovery Email for Refused/Abandoned Cart
 */
export async function sendRecoveryEmail(sale: any, product: any, checkoutHash: string, lang: string = 'pt') {
  const name = sale.customer_name || 'Amigo(a)';
  const productName = product.name;
  const checkoutLink = `https://app.singlepay.com.br/pay/${checkoutHash}`;

  const translations: Record<string, { subject: string; greeting: string; body1: string; body2: string; button: string; signOff: string }> = {
    pt: {
      subject: "Deu tudo certo com o seu pedido?",
      greeting: `Olá, ${name}.`,
      body1: `Notei que você deixou o <strong>${productName}</strong> no carrinho.`,
      body2: "Estou passando para avisar que a reserva do seu item expira em breve e não consigo garantir o preço atual por muito tempo devido à alta demanda.",
      button: "Garantir meu Produto agora",
      signOff: "Te vejo lá dentro!"
    },
    en: {
      subject: "Is everything okay with your order?",
      greeting: `Hi, ${name}.`,
      body1: `I noticed you left <strong>${productName}</strong> in your cart.`,
      body2: "I'm reaching out to let you know that your item reservation expires soon and I can't guarantee the current price for long due to high demand.",
      button: "Secure my Product now",
      signOff: "See you inside!"
    },
    es: {
      subject: "¿Todo bien con tu pedido?",
      greeting: `Hola, ${name}.`,
      body1: `Noté que dejaste <strong>${productName}</strong> en el carrito.`,
      body2: "Te escribo para avisarte que la reserva de tu artículo expira pronto e no puedo garantizar el precio actual por mucho tiempo debido a la alta demanda.",
      button: "Asegurar mi Producto ahora",
      signOff: "¡Te veo dentro!"
    }
  };

  const t = translations[lang] || translations.pt;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; border: 1px solid #f3f4f6; border-radius: 24px; background-color: #ffffff;">
      <h2 style="color: #1f2937; font-size: 20px; margin-bottom: 24px;">${t.greeting}</h2>
      
      <p style="color: #4b5563; line-height: 1.8; font-size: 16px; margin-bottom: 20px;">
        ${t.body1}
      </p>
      
      <p style="color: #4b5563; line-height: 1.8; font-size: 16px; margin-bottom: 32px;">
        ${t.body2}
      </p>
      
      <div style="margin: 40px 0; text-align: center;">
        <a href="${checkoutLink}" style="background-color: #f59e0b; color: white; padding: 18px 36px; text-decoration: none; border-radius: 14px; font-weight: 800; display: inline-block; font-size: 16px; text-transform: uppercase; letter-spacing: 0.05em; box-shadow: 0 10px 20px -5px rgba(245, 158, 11, 0.4);">
          ${t.button}
        </a>
      </div>
      
      <p style="color: #1f2937; font-weight: bold; font-size: 16px; margin-top: 32px;">
        ${t.signOff}
      </p>
      
      <div style="margin-top: 48px; padding-top: 24px; border-top: 1px solid #f3f4f6; text-align: center;">
        <p style="color: #9ca3af; font-size: 12px; font-weight: 500; letter-spacing: 0.1em; text-transform: uppercase;">
          SinglePay
        </p>
      </div>
    </div>
  `;

  return sendEmail({
    to: sale.customer_email,
    subject: t.subject,
    html: html
  });
}
