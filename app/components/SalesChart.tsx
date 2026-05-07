"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LabelList
} from "recharts";
import { BarChart3 } from "lucide-react";

interface SalesChartProps {
  data: { date: string; BRL: number; USD: number; EUR: number }[];
}

export function SalesChart({ data }: SalesChartProps) {
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

  // Pre-process data to ensure it's always an array with at least 2 points
  const chartData = data.length === 1 
    ? [
        { ...data[0], date: 'Início', BRL: 0, USD: 0, EUR: 0 },
        data[0]
      ] 
    : data;

  const formatCurrency = (val: number) => {
    return val > 0 ? val.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : "0";
  };

  return (
    <div style={{ width: '100%', height: '350px', position: 'relative' }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 30, right: 30, left: 10, bottom: 10 }}
        >
          <defs>
            <linearGradient id="colorBRL" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorUSD" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorEUR" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid 
            strokeDasharray="3 3" 
            vertical={false} 
            stroke="rgba(255,255,255,0.15)" 
          />
          <XAxis 
            dataKey="date" 
            axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
            tickLine={false}
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            dy={10}
          />
          <YAxis 
            axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
            tickLine={false}
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            tickFormatter={(value) => value.toLocaleString('pt-BR')}
            width={40}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#1e293b', 
              borderColor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              fontSize: '12px',
              color: '#fff',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)'
            }}
            formatter={(value: number) => [formatCurrency(value), '']}
          />
          <Legend 
            verticalAlign="top" 
            align="right"
            iconType="circle"
            wrapperStyle={{ paddingBottom: '30px', fontSize: '12px' }}
          />
          <Area 
            type="monotone" 
            dataKey="BRL" 
            name="Vendas BRL"
            stroke="#10b981" 
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorBRL)"
            dot={{ r: 5, fill: '#0f172a', strokeWidth: 2, stroke: '#10b981' }}
            activeDot={{ r: 7 }}
          >
            <LabelList dataKey="BRL" position="top" offset={15} fill="#10b981" fontSize={10} formatter={(v: any) => v > 0 ? v.toLocaleString('pt-BR') : ''} />
          </Area>
          <Area 
            type="monotone" 
            dataKey="USD" 
            name="Vendas USD"
            stroke="#8b5cf6" 
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorUSD)"
            dot={{ r: 5, fill: '#0f172a', strokeWidth: 2, stroke: '#8b5cf6' }}
            activeDot={{ r: 7 }}
          >
             <LabelList dataKey="USD" position="top" offset={15} fill="#8b5cf6" fontSize={10} formatter={(v: any) => v > 0 ? v.toLocaleString('pt-BR') : ''} />
          </Area>
          <Area 
            type="monotone" 
            dataKey="EUR" 
            name="Vendas EUR"
            stroke="#f59e0b" 
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#colorEUR)"
            dot={{ r: 5, fill: '#0f172a', strokeWidth: 2, stroke: '#f59e0b' }}
            activeDot={{ r: 7 }}
          >
             <LabelList dataKey="EUR" position="top" offset={15} fill="#f59e0b" fontSize={10} formatter={(v: any) => v > 0 ? v.toLocaleString('pt-BR') : ''} />
          </Area>
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
