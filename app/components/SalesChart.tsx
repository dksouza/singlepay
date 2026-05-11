"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell
} from "recharts";
import { BarChart3 } from "lucide-react";

interface SalesChartProps {
  data: { date: string; BRL: number; USD: number; EUR: number }[];
}

export function SalesChart({ data }: SalesChartProps) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) return <div style={{ height: '350px' }} />;

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center px-6">
        <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6 text-gray-200" style={{ border: '2px dashed #f1f5f9' }}>
          <BarChart3 size={48} strokeWidth={1.5} />
        </div>
        <p className="text-secondary font-bold text-lg">Nenhum faturamento ainda</p>
        <p className="text-sm text-gray-400 mt-2 max-w-[280px]">
          As vendas aprovadas e o desempenho do seu negócio serão exibidos aqui em tempo real.
        </p>
      </div>
    );
  }

  // Pre-process data
  const chartData = data;

  const formatCurrency = (val: number) => {
    return val > 0 ? val.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : "0";
  };

  return (
    <div style={{ width: '100%', height: '350px', position: 'relative' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 10, bottom: 10 }}
          barGap={8}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            vertical={false}
            stroke="rgba(255,255,255,0.08)"
          />
          <XAxis
            dataKey="date"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            dy={10}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            tickFormatter={(value) => value.toLocaleString('pt-BR')}
            width={40}
          />
          <Tooltip
            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
            contentStyle={{
              backgroundColor: '#1e293b',
              borderColor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              fontSize: '12px',
              color: '#fff',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
              border: 'none'
            }}
            formatter={(value: number, name: any) => {
              const code = name.toString().includes("BRL") ? "BRL" : name.toString().includes("USD") ? "USD" : "EUR";
              return [formatCurrency(value), code];
            }}
          />
          <Legend
            verticalAlign="top"
            align="right"
            iconType="circle"
            wrapperStyle={{ paddingBottom: '30px', fontSize: '12px' }}
          />
          <Bar
            dataKey="BRL"
            name="Vendas BRL"
            fill="#10b981"
            radius={[4, 4, 0, 0]}
            barSize={20}
          />
          <Bar
            dataKey="USD"
            name="Vendas USD"
            fill="#8b5cf6"
            radius={[4, 4, 0, 0]}
            barSize={20}
          />
          <Bar
            dataKey="EUR"
            name="Vendas EUR"
            fill="#f59e0b"
            radius={[4, 4, 0, 0]}
            barSize={20}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
