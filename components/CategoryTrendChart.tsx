import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Components';
import { useTransactions } from '../context/TransactionContext';

// Palette matches CategoryPieChart, plus a gray for "Outros"
const PALETTE = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];
const OTHER_COLOR = '#94a3b8';

export const CategoryTrendChart: React.FC = () => {
  const { transactions } = useTransactions();

  const { data, keys } = useMemo(() => {
    // 1. Filter Expenses only
    const expenses = transactions.filter(t => t.type === 'expense');
    
    if (expenses.length === 0) return { data: [], keys: [] };

    // 2. Identify Top 5 Categories Global
    const categoryTotals: Record<string, number> = {};
    expenses.forEach(t => {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    });

    const topCategories = Object.entries(categoryTotals)
      .sort(([, a], [, b]) => b - a) // Descending amount
      .slice(0, 5)
      .map(([cat]) => cat);

    // 3. Group by Month (YYYY-MM)
    const monthlyGroups: Record<string, Record<string, number>> = {};

    expenses.forEach(t => {
      // Use YYYY-MM for sorting key
      const dateKey = t.date.substring(0, 7); 
      
      if (!monthlyGroups[dateKey]) {
        monthlyGroups[dateKey] = { total: 0 };
      }

      // Determine category bucket (Specific or 'Outros')
      const catKey = topCategories.includes(t.category) ? t.category : 'Outros';
      
      monthlyGroups[dateKey][catKey] = (monthlyGroups[dateKey][catKey] || 0) + t.amount;
      monthlyGroups[dateKey].total += t.amount; // track total for sorting if needed
    });

    // 4. Format for Recharts
    // Need to sort months chronologically
    const sortedMonths = Object.keys(monthlyGroups).sort();
    
    // Generate the final data array
    const chartData = sortedMonths.map(monthKey => {
      const [year, month] = monthKey.split('-');
      // Format display name: "Jan/24"
      const dateObj = new Date(parseInt(year), parseInt(month) - 1, 1);
      const name = dateObj.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });

      return {
        name,
        _dateKey: monthKey, // hidden sort key if needed
        ...monthlyGroups[monthKey]
      };
    });

    // Keys for the Area Chart (Top 5 + Outros)
    // We add 'Outros' only if it exists in the data
    const hasOutros = expenses.some(t => !topCategories.includes(t.category));
    const finalKeys = hasOutros ? [...topCategories, 'Outros'] : topCategories;

    return { data: chartData, keys: finalKeys };
  }, [transactions]);

  const formatCurrency = (val: number) => `R$${val.toFixed(0)}`;

  return (
    <Card className="h-full w-full">
      <CardHeader>
        <CardTitle>Evolução de Gastos por Categoria</CardTitle>
        <p className="text-sm text-muted-foreground">Tendência mensal das Top 5 categorias</p>
      </CardHeader>
      <CardContent className="pl-0">
        <div className="h-[350px] w-full">
          {data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  {keys.map((key, index) => {
                    const color = key === 'Outros' ? OTHER_COLOR : PALETTE[index % PALETTE.length];
                    return (
                      <linearGradient key={key} id={`color-${key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.8}/>
                        <stop offset="95%" stopColor={color} stopOpacity={0.1}/>
                      </linearGradient>
                    );
                  })}
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#888888" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                />
                <YAxis 
                  stroke="#888888" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={formatCurrency}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Legend iconType="circle" />
                
                {keys.map((key, index) => {
                   const color = key === 'Outros' ? OTHER_COLOR : PALETTE[index % PALETTE.length];
                   return (
                    <Area 
                      key={key}
                      type="monotone" 
                      dataKey={key} 
                      stackId="1" 
                      stroke={color} 
                      fill={`url(#color-${key})`} 
                    />
                   );
                })}
              </AreaChart>
            </ResponsiveContainer>
          ) : (
             <div className="flex h-full items-center justify-center text-muted-foreground">
               Sem dados suficientes para análise de tendência.
             </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};