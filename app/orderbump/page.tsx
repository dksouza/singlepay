"use client";

export const runtime = 'edge';
export const dynamic = 'force-dynamic';
export const dynamic = 'force-dynamic';

import { Header } from "../components/Header";
import { Zap, Plus, Search } from "lucide-react";
import { useState } from "react";

export default function OrderbumpPage() {
  return (
    <>
      <Header />
      
      <div className="top-bar">
        <div>
          <h1 className="page-title">Orderbump</h1>
          <p className="text-secondary text-sm">Ofereça produtos complementares no checkout</p>
        </div>
        
        <div className="top-bar-actions">
          <button className="btn-primary flex items-center gap-2">
            <Plus size={18} />
            <span>Criar Orderbump</span>
          </button>
        </div>
      </div>

      <div className="empty-state-container mt-12">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4 text-gray-400">
          <Zap size={32} />
        </div>
        <h2 className="text-xl font-bold mb-2">Nenhum Orderbump criado</h2>
        <p className="text-secondary max-w-sm">
          Aumente seu ticket médio oferecendo ofertas extras diretamente na página de pagamento.
        </p>
      </div>
    </>
  );
}
