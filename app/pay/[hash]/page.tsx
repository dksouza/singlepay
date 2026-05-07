import { notFound } from "next/navigation";
import { createPaymentIntent } from "../../actions/paymentActions";
import CheckoutPageClient from "./CheckoutPageClient";

interface PageProps {
  params: Promise<{ hash: string }>;
}

export default async function PublicCheckoutPage({ params }: PageProps) {
  const { hash } = await params;

  // Verify checkout and get basic info
  const paymentData = await createPaymentIntent(hash);

  if (paymentData.error) {
    if (paymentData.error === "Checkout não encontrado") {
      notFound();
    }

    return (
      <div className="public-checkout-bg">
        <div className="checkout-page-container text-center">
          <h1 className="text-xl font-bold mb-4">Checkout Indisponível</h1>
          <p className="text-secondary">{paymentData.error}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: 'white', minHeight: '100vh', position: 'relative' }}>
      {/* Initial Server-side Loading */}
      <div id="server-loading" style={{ 
        position: 'fixed', 
        inset: 0, 
        zIndex: 9999, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        backgroundColor: 'white' 
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '4px solid #f3f4f6',
          borderTop: '4px solid #3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}} />
      </div>

      <CheckoutPageClient 
        hash={hash}
        initialProduct={paymentData.product}
        initialCheckout={paymentData.checkout}
        publishableKey={paymentData.publishableKey!}
      />
    </div>
  );
}

