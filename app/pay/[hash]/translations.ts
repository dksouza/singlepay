export type Language = 'pt' | 'en' | 'es';

export const translations = {
  pt: {
    fullName: "Nome Completo",
    fullNamePlaceholder: "Seu nome completo",
    email: "E-mail*",
    emailPlaceholder: "seu@email.com",
    phone: "Telefone",
    phonePlaceholder: "Celular",
    cardNumber: "Número do cartão",
    expiryDate: "Data de expiração",
    cvc: "Código de segurança",
    buyNow: "Comprar Agora",
    securePayment: "Pagamento 100% seguro",
    checkoutUnavailable: "Checkout Indisponível",
    checkoutUnavailableDesc: "O checkout está indisponível no momento. Por favor, tente novamente mais tarde ou entre em contato com o suporte.",
    termsText: "Ao finalizar sua compra, você concorda com os Termos de Uso e Política de Privacidade.",
    secureCheckout: "Iniciando Checkout Seguro",
    encryptionText: "Criptografia de 256 bits ativada",
    errorLoading: "Erro ao carregar o checkout.",
    processing: "Processando...",
    creditCard: "Cartão de Crédito",
    loadingPhrases: [
      "Processando seu pagamento...",
      "Validando dados do cartão...",
      "Sincronizando com a operadora...",
      "Quase lá! Finalizando transação...",
      "Segurança verificada! Concluindo..."
    ],
    exitModalTitle: "ESPERE! NÃO VÁ EMBORA! 😱",
    exitModalTextPre: "Liberei um ",
    exitModalTextBold: "desconto especial",
    exitModalTextPost: " apenas pelos próximos 5 minutos para você.",
    exitModalButton: "QUERO MEU DESCONTO",
    exitModalNo: "Não, prefiro pagar o valor cheio",
    securePaymentFooter: "Pagamento 100% Seguro & Criptografado",
    guaranteeText: "Garantia de 7 Dias com Reembolso Total",
    trustPrivacy: "Privacidade",
    trustPrivacyDesc: "Sua informação 100% segura",
    trustSecure: "Compra segura",
    trustSecureDesc: "Ambiente seguro e autenticado",
    trustContent: "Conteúdo aprovado",
    trustContentDesc: "100% revisado e aprovado"
  },
  en: {
    fullName: "Full Name",
    fullNamePlaceholder: "Your full name",
    email: "Email*",
    emailPlaceholder: "your@email.com",
    phone: "Phone Number",
    phonePlaceholder: "Phone",
    cardNumber: "Card number",
    expiryDate: "Expiration date",
    cvc: "Security code (CVC)",
    buyNow: "Buy Now",
    securePayment: "100% Secure Payment",
    checkoutUnavailable: "Checkout Unavailable",
    checkoutUnavailableDesc: "Checkout is currently unavailable. Please try again later or contact support.",
    termsText: "By completing your purchase, you agree to our Terms of Use and Privacy Policy.",
    secureCheckout: "Starting Secure Checkout",
    encryptionText: "256-bit encryption enabled",
    errorLoading: "Error loading checkout.",
    processing: "Processing...",
    creditCard: "Credit Card",
    loadingPhrases: [
      "Processing your payment...",
      "Validating card details...",
      "Syncing with provider...",
      "Almost there! Finalizing...",
      "Security verified! Completing..."
    ],
    exitModalTitle: "WAIT! DON'T LEAVE! 😱",
    exitModalTextPre: "I've released a ",
    exitModalTextBold: "special discount",
    exitModalTextPost: " just for the next 5 minutes for you.",
    exitModalButton: "I WANT MY DISCOUNT",
    exitModalNo: "No, I'd rather pay the full price",
    securePaymentFooter: "100% Secure & Encrypted Payment",
    guaranteeText: "7-Day Money Back Guarantee",
    trustPrivacy: "Privacy",
    trustPrivacyDesc: "Your information is 100% secure",
    trustSecure: "Secure Purchase",
    trustSecureDesc: "Safe and authenticated environment",
    trustContent: "Approved Content",
    trustContentDesc: "100% reviewed and approved"
  },
  es: {
    fullName: "Nombre Completo",
    fullNamePlaceholder: "Tu nombre completo",
    email: "Correo electrónico*",
    emailPlaceholder: "tu@email.com",
    phone: "Teléfono",
    phonePlaceholder: "Celular",
    cardNumber: "Número de tarjeta",
    expiryDate: "Fecha de caducidad",
    cvc: "Código de seguridad (CVC)",
    buyNow: "Comprar Ahora",
    securePayment: "Pago 100% seguro",
    checkoutUnavailable: "Checkout No Disponible",
    checkoutUnavailableDesc: "El proceso de pago no está disponible en este momento. Por favor, inténtelo de nuevo más tarde o póngase en contacto con el soporte.",
    termsText: "Al completar tu compra, aceptas los Términos de Uso e Política de Privacidad.",
    secureCheckout: "Iniciando Pago Seguro",
    encryptionText: "Cifrado de 256 bits activado",
    errorLoading: "Error ao carregar el pago.",
    processing: "Procesando...",
    creditCard: "Tarjeta de Crédito",
    loadingPhrases: [
      "Procesando su pago...",
      "Validando datos de la tarjeta...",
      "Sincronizando con el proveedor...",
      "¡Casi listo! Finalizando...",
      "¡Seguridad verificada! Completando..."
    ],
    exitModalTitle: "¡ESPERA! ¡NO TE VAYAS! 😱",
    exitModalTextPre: "He liberado un ",
    exitModalTextBold: "descuento especial",
    exitModalTextPost: " solo por los próximos 5 minutos para ti.",
    exitModalButton: "¡QUIERO MI DESCUENTO",
    exitModalNo: "No, prefiero pagar el precio total",
    securePaymentFooter: "Pago 100% Seguro y Cifrado",
    guaranteeText: "Garantía de Devolución de 7 Días",
    trustPrivacy: "Privacidad",
    trustPrivacyDesc: "Tu información 100% segura",
    trustSecure: "Compra segura",
    trustSecureDesc: "Ambiente seguro y autenticado",
    trustContent: "Contenido aprobado",
    trustContentDesc: "100% revisado y aprobado"
  }
};

export function getLanguage(): Language {
  if (typeof window === 'undefined') return 'pt';
  
  // 1. Check URL query parameter (e.g., ?lang=en)
  const urlParams = new URLSearchParams(window.location.search);
  const langParam = urlParams.get('lang');
  if (langParam === 'en') return 'en';
  if (langParam === 'es') return 'es';
  if (langParam === 'pt') return 'pt';

  // 2. Fallback to browser language
  const lang = navigator.language || (navigator as any).userLanguage;
  if (lang.startsWith('en')) return 'en';
  if (lang.startsWith('es')) return 'es';
  return 'pt';
}
