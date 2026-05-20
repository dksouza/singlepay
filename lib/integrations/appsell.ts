/**
 * AppSell Integration Utility
 */

export interface AppSellPayload {
  email: string;
  product_id: string;
  status: 'approved' | 'refund';
  name?: string;
  phone?: string | null;
  send_email?: boolean;
}

export async function sendToAppSell(payload: AppSellPayload, apiToken: string) {
  try {
    const response = await fetch('https://appsell.ai/api/v1/access/manage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiToken}`
      },
      body: JSON.stringify(payload)
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }

    if (!response.ok) {
      console.error('AppSell API Error:', data);
      return { success: false, error: data };
    }

    return { success: true, data };
  } catch (error) {
    console.error('AppSell Integration Exception:', error);
    return { success: false, error };
  }
}
