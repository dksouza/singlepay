"use client";

import { Header } from "../components/Header";
import { Layers, Plus } from "lucide-react";
import { useState } from "react";

export default function UpsellPage() {
  return (
    <>
      <Header />
      
      <div className="top-bar">
        <div>
          <h1 className="page-title">Upsell</h1>
          <p className="text-secondary text-sm">Crie fluxos de vendas após o pagamento</p>
        </div>
        
        <div className="top-bar-actions">
          <button className="btn-primary flex items-center gap-2">
            <Plus size={18} />
            <span>Criar Upsell</span>
          </button>
        </div>
      </div>

      <div className="empty-state-container mt-12">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400">
          <Layers size={32} />
        </div>
        <h2 className="text-xl font-bold mb-2">Nenhum Upsell criado</h2>
        <p className="text-secondary max-w-sm">
          Aumente sua conversão oferecendo novas ofertas imediatamente após a aprovação do pagamento inicial.
        </p>
      </div>
    </>
  );
}
