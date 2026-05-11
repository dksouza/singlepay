/**
 * Utmify Integration Utility
 * Based on integracao-api-utmify.pdf documentation
 */

export interface UtmifyPayload {
  orderId: string;
  platform: string;
  paymentMethod: 'credit_card' | 'boleto' | 'pix' | 'paypal' | 'free_price';
  status: 'waiting_payment' | 'paid' | 'refused' | 'refunded' | 'chargedback';
  createdAt: string; // YYYY-MM-DD HH:MM:SS (UTC)
  approvedDate: string | null;
  refundedAt: string | null;
  customer: {
    name: string;
    email: string;
    phone: string | null;
    document: string | null;
    country?: string;
    ip?: string;
  };
  products: Array<{
    id: string;
    name: string;
    planId: string | null;
    planName: string | null;
    quantity: number;
    priceInCents: number;
  }>;
  trackingParameters: {
    src: string | null;
    sck: string | null;
    utm_source: string | null;
    utm_campaign: string | null;
    utm_medium: string | null;
    utm_content: string | null;
    utm_term: string | null;
  };
  commission: {
    totalPriceInCents: number;
    gatewayFeeInCents: number;
    userCommissionInCents: number;
    currency?: string;
  };
  isTest?: boolean;
}

export async function sendToUtmify(payload: UtmifyPayload, apiToken: string) {
  try {
    const response = await fetch('https://api.utmify.com.br/api-credentials/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-token': apiToken
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error('Utmify API Error:', data);
      return { success: false, error: data };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Utmify Integration Exception:', error);
    return { success: false, error };
  }
}

/**
 * Format date to YYYY-MM-DD HH:MM:SS for Utmify
 */
export function formatUtmifyDate(date: Date): string {
  return date.toISOString().replace('T', ' ').substring(0, 19);
}
