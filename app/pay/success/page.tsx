"use client";

export const runtime = 'edge';
export const dynamic = 'force-dynamic';
export const dynamic = 'force-dynamic';

import { CheckCircle2, ChevronRight, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { updateSaleStatus } from "../../actions/paymentActions";
import { useEffect } from "react";

function SuccessContent() {
  const searchParams = useSearchParams();
  const paymentIntentId = searchParams.get("payment_intent");
  const status = searchParams.get("redirect_status");

  useEffect(() => {
    if (paymentIntentId && status === "succeeded") {
      updateSaleStatus(paymentIntentId, "succeeded");
    }
  }, [paymentIntentId, status]);

  return (
    <div className="public-checkout-bg">
      <div className="checkout-page-container text-center py-12">
        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-8 text-emerald-600">
          <CheckCircle2 size={40} />
        </div>
        
        <h1 className="text-3xl font-bold mb-4">Pagamento Confirmado!</h1>
        <p className="text-secondary text-lg mb-10 max-w-sm mx-auto leading-relaxed">
          Sua compra foi processada com sucesso. Você receberá os detalhes por e-mail em instantes.
        </p>

        <div className="nav-divider mb-10 opacity-50"></div>

        <Link href="/" className="btn-primary inline-flex mx-auto px-8 py-4 gap-3 text-lg">
          <LayoutDashboard size={20} />
          <span>Voltar para o Dashboard</span>
          <ChevronRight size={20} />
        </Link>

        {paymentIntentId && (
          <p className="mt-8 text-xs text-gray-400">
            ID da Transação: {paymentIntentId}
          </p>
        )}
      </div>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div className="public-checkout-bg flex items-center justify-center">Carregando...</div>}>
      <SuccessContent />
    </Suspense>
  );
}
