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
    creditCard: "Cartão de Crédito"
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
    creditCard: "Credit Card"
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
    creditCard: "Tarjeta de Crédito"
  }
};

export function getLanguage(): Language {
  if (typeof window === 'undefined') return 'pt';
  const lang = navigator.language || (navigator as any).userLanguage;
  if (lang.startsWith('en')) return 'en';
  if (lang.startsWith('es')) return 'es';
  return 'pt';
}
