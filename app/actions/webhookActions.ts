"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getWebhooks() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("webhooks")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching webhooks:", error);
    return [];
  }

  return data;
}

export async function createWebhook(data: {
  name: string;
  url: string;
  secret?: string;
  product_ids: string[];
  events: string[];
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { error } = await supabase
    .from("webhooks")
    .insert([{
      user_id: user.id,
      ...data
    }]);

  if (error) {
    console.error("Error creating webhook:", error);
    return { error: error.message };
  }

  revalidatePath("/integracoes");
  return { success: true };
}

export async function deleteWebhook(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { error } = await supabase
    .from("webhooks")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error deleting webhook:", error);
    return { error: error.message };
  }

  revalidatePath("/integracoes");
  return { success: true };
}

export async function updateWebhook(id: string, data: {
  name: string;
  url: string;
  secret?: string;
  product_ids: string[];
  events: string[];
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  const { error } = await supabase
    .from("webhooks")
    .update(data)
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    console.error("Error updating webhook:", error);
    return { error: error.message };
  }

  revalidatePath("/integracoes");
  return { success: true };
}

export async function testWebhook(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Não autenticado" };

  // 1. Get webhook details
  const { data: webhook, error } = await supabase
    .from("webhooks")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !webhook) return { error: "Webhook não encontrado" };

  // 2. Prepare mock payload (matching the user's requested format)
  const mockPayload = {
    event: "card.paid",
    createdAt: new Date().toISOString(),
    customer: {
      name: "João Silva (Teste)",
      email: "teste@example.com",
      document: "12345678901",
      phone: "5511999999999",
      ip: "127.0.0.1"
    },
    payment: {
      id: "test_" + Math.random().toString(36).substr(2, 9),
      method: "card.paid",
      paymentMethod: "card",
      gateway: "singlepay_test",
      status: "paid",
      amount: 97.00,
      currency: "BRL"
    },
    product: {
      id: "test_product_123",
      type: "main",
      title: "Produto de Teste"
    },
    products: [
      {
        id: "test_product_123",
        type: "main",
        title: "Produto de Teste",
        price: 9700
      }
    ],
    webhook: {
      id: webhook.id,
      businessId: webhook.user_id,
      events: webhook.events
    },
    utm_source: "teste",
    utm_medium: "webhook",
    utm_campaign: "validacao",
    utm_content: null,
    utm_term: null,
    src: "src_teste_123",
    sck: "sck_teste_456",
    customerIp: "127.0.0.1"
  };

  // 3. Send request with enhanced reliability
  try {
    let targetUrl = webhook.url.trim();
    
    // Auto-fix missing protocol
    if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
      targetUrl = 'https://' + targetUrl;
    }

    console.log(`[TEST] Sending webhook to: ${targetUrl}`);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "User-Agent": "SinglePay-Test/1.0",
      "Accept": "application/json"
    };

    if (webhook.secret) {
      const encoder = new TextEncoder();
      const keyData = encoder.encode(webhook.secret);
      const data = encoder.encode(JSON.stringify(mockPayload));
      const cryptoLib = globalThis.crypto;
      
      const key = await cryptoLib.subtle.importKey(
        'raw', 
        keyData, 
        { name: 'HMAC', hash: 'SHA-256' }, 
        false, 
        ['sign']
      );

      const signatureBuffer = await cryptoLib.subtle.sign('HMAC', key, data);
      const signatureArray = Array.from(new Uint8Array(signatureBuffer));
      const signature = signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');
      headers["X-SinglePay-Signature"] = signature;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

    const response = await fetch(targetUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(mockPayload),
      signal: controller.signal,
      cache: 'no-store'
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      return { 
        success: true, 
        status: response.status,
        message: `Conectado com sucesso à URL: ${targetUrl}` 
      };
    } else {
      const errorText = await response.text().catch(() => "Sem corpo de erro");
      return { error: `URL alcançada, mas seu servidor retornou erro ${response.status}. Resposta: ${errorText.substring(0, 30)}` };
    }
  } catch (err: any) {
    console.error("[TEST] Network Error:", err);
    if (err.name === 'AbortError') return { error: `Timeout: A URL ${webhook.url} demorou mais de 15s para responder.` };
    return { error: `Não foi possível alcançar a URL ${webhook.url}. Verifique se ela está correta e online. Erro: ${err.message}` };
  }
}
