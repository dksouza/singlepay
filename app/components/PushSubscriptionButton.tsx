"use client";

import { useState, useEffect } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export function PushSubscriptionButton() {
  const [status, setStatus] = useState<"loading" | "unsupported" | "denied" | "subscribed" | "unsubscribed">("loading");
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    checkSubscriptionStatus();
  }, []);

  async function checkSubscriptionStatus() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }

    const permission = Notification.permission;
    if (permission === "denied") {
      setStatus("denied");
      return;
    }

    try {
      // getRegistration() returns undefined immediately if no SW registered (doesn't block)
      const registration = await navigator.serviceWorker.getRegistration("/sw.js");
      if (!registration) {
        setStatus("unsubscribed");
        return;
      }
      const subscription = await registration.pushManager.getSubscription();
      setStatus(subscription ? "subscribed" : "unsubscribed");
    } catch {
      setStatus("unsubscribed");
    }
  }

  async function handleSubscribe() {
    setIsProcessing(true);
    try {
      // 1. Register Service Worker
      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      // 2. Request permission
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus("denied");
        return;
      }

      // 3. Subscribe to push
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });

      // 4. Save to backend
      const subJson = subscription.toJSON();
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: subJson.endpoint,
          keys: subJson.keys,
        }),
      });

      if (res.ok) {
        setStatus("subscribed");
      }
    } catch (err) {
      console.error("[PUSH] Subscribe error:", err);
    } finally {
      setIsProcessing(false);
    }
  }

  async function handleUnsubscribe() {
    setIsProcessing(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Remove from backend
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });

        // Unsubscribe from browser
        await subscription.unsubscribe();
      }

      setStatus("unsubscribed");
    } catch (err) {
      console.error("[PUSH] Unsubscribe error:", err);
    } finally {
      setIsProcessing(false);
    }
  }

  if (status === "loading") {
    return (
      <button
        className="icon-btn"
        title="Verificando notificações..."
        disabled
        style={{ opacity: 0.5 }}
      >
        <Loader2 size={18} className="animate-spin" />
      </button>
    );
  }

  if (status === "unsupported") return null;

  if (status === "denied") {
    return (
      <button
        className="icon-btn"
        title="Notificações bloqueadas. Habilite nas configurações do navegador."
        style={{ opacity: 0.4, cursor: "not-allowed" }}
      >
        <BellOff size={18} />
      </button>
    );
  }

  if (status === "subscribed") {
    return (
      <button
        className="icon-btn"
        title="Notificações de venda ativas — clique para desativar"
        onClick={handleUnsubscribe}
        disabled={isProcessing}
        style={{ color: "var(--accent)", position: "relative" }}
      >
        {isProcessing ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <>
            <Bell size={18} />
            {/* Green dot indicator */}
            <span
              style={{
                position: "absolute",
                top: "4px",
                right: "4px",
                width: "7px",
                height: "7px",
                backgroundColor: "#22c55e",
                borderRadius: "50%",
                border: "1.5px solid var(--bg-card)",
              }}
            />
          </>
        )}
      </button>
    );
  }

  // unsubscribed
  return (
    <button
      className="icon-btn"
      title="Ativar notificações de venda"
      onClick={handleSubscribe}
      disabled={isProcessing}
      style={{ color: "var(--text-secondary)" }}
    >
      {isProcessing ? (
        <Loader2 size={18} className="animate-spin" />
      ) : (
        <Bell size={18} />
      )}
    </button>
  );
}
