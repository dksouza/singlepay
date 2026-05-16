import { createClient } from "@/lib/supabase/server";

interface WebhookPayload {
  event: string;
  createdAt: string;
  customer: {
    name: string;
    email: string;
    document?: string | null;
    phone?: string | null;
    ip?: string | null;
  };
  payment: {
    id: string;
    method: string;
    paymentMethod: string;
    gateway: string;
    status: string;
    amount: number;
    currency: string;
    pixCode?: string | null;
  };
  product: {
    id: string;
    type: string;
    title: string;
  };
  products: Array<{
    id: string;
    type: string;
    title: string;
    price: number;
  }>;
  webhook: {
    id: string;
    businessId: string;
    events: string[];
  };
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  utm_content?: string | null;
  utm_term?: string | null;
  src?: string | null;
  sck?: string | null;
  customerIp?: string | null;
}

/**
 * Triggers all relevant webhooks for a given sale and event
 */
export async function triggerWebhooks(saleId: string, eventName: string) {
  try {
    const supabase = await createClient();

    // 1. Fetch sale data with product and user info
    const { data: sale, error: saleError } = await supabase
      .from("sales")
      .select(`
        *,
        products:product_id (id, name),
        user_id
      `)
      .eq("id", saleId)
      .single();

    if (saleError || !sale) {
      console.error("Webhook Error: Sale not found", saleId);
      return;
    }

    // 2. Find all active webhooks for this user that match the event
    // Note: eventName from UI is pix_paid, but payload uses pix.paid. We'll normalize.
    const normalizedEvent = eventName.replace(".", "_"); // e.g. pix.paid -> pix_paid
    
    const { data: webhooks, error: webhooksError } = await supabase
      .from("webhooks")
      .select("*")
      .eq("user_id", sale.user_id)
      .contains("events", [normalizedEvent]);

    if (webhooksError || !webhooks || webhooks.length === 0) {
      return; // No webhooks interested in this event
    }

    // 3. Filter webhooks by product_ids (Strict: must have product selected)
    const activeWebhooks = webhooks.filter(w => {
      if (!w.product_ids || w.product_ids.length === 0) return false;
      return w.product_ids.includes(sale.product_id);
    });

    if (activeWebhooks.length === 0) return;

    // 4. Prepare the base payload (optimized for the specified format)
    // We map dot notation for the event in the payload
    const dotEvent = eventName.includes(".") ? eventName : eventName.replace("_", ".");

    const basePayload = {
      event: dotEvent,
      createdAt: new Date().toISOString(),
      customer: {
        name: sale.customer_name,
        email: sale.customer_email,
        document: sale.customer_document || null,
        phone: sale.customer_phone || null,
        ip: sale.customer_ip || null
      },
      payment: {
        id: sale.id,
        method: dotEvent,
        paymentMethod: sale.payment_method || (dotEvent.startsWith("pix") ? "pix" : "card"),
        gateway: sale.gateway || "stripe",
        status: sale.status,
        amount: sale.amount / 100, // Convert cents to decimal
        currency: sale.currency || "BRL",
        pixCode: sale.pix_code || null
      },
      product: {
        id: sale.product_id,
        type: "main",
        title: sale.products?.name || "Produto"
      },
      products: [
        {
          id: sale.product_id,
          type: "main",
          title: sale.products?.name || "Produto",
          price: sale.amount
        }
        // TODO: Add orderbumps if they exist in the sale record
      ],
      utm_source: sale.utm_source || null,
      utm_medium: sale.utm_medium || null,
      utm_campaign: sale.utm_campaign || null,
      utm_content: sale.utm_content || null,
      utm_term: sale.utm_term || null,
      src: sale.src || null,
      sck: sale.sck || null,
      customerIp: sale.customer_ip || null
    };

    // 5. Send to each webhook
    for (const webhook of activeWebhooks) {
      const payload: WebhookPayload = {
        ...basePayload,
        webhook: {
          id: webhook.id,
          businessId: webhook.user_id,
          events: webhook.events
        }
      };

      // Fire and forget (don't await to avoid blocking)
      sendWebhookRequest(webhook.url, payload, webhook.secret);
    }

  } catch (err) {
    console.error("Error triggering webhooks:", err);
  }
}

async function generateSignature(payload: any, secret: string) {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const data = encoder.encode(JSON.stringify(payload));

  const cryptoLib = typeof crypto !== 'undefined' ? crypto : (await import('crypto')).webcrypto;
  
  const key = await cryptoLib.subtle.importKey(
    'raw', 
    keyData, 
    { name: 'HMAC', hash: 'SHA-256' }, 
    false, 
    ['sign']
  );

  const signatureBuffer = await cryptoLib.subtle.sign('HMAC', key, data);
  const signatureArray = Array.from(new Uint8Array(signatureBuffer));
  return signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function sendWebhookRequest(url: string, payload: any, secret?: string) {
  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": "SinglePay-Webhook/1.0"
    };

    // If secret exists, add HMAC signature for security
    if (secret) {
      headers["X-SinglePay-Signature"] = await generateSignature(payload, secret);
    }

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.warn(`Webhook failed for ${url}: ${response.status} ${response.statusText}`);
    }
  } catch (err) {
    console.error(`Error sending webhook to ${url}:`, err);
  }
}
