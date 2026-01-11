import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Components';
import { useTransactions } from '../context/TransactionContext';
import { BudgetProgress } from './BudgetProgress';
import { BalanceTrendChart } from './BalanceTrendChart';

export const ChartsSection: React.FC = () => {
  const { monthlyData } = useTransactions();

  const formatCurrency = (val: number) => `R$${val}`;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
      
      {/* 1. Balance Trend Chart (New) - Half Desktop */}
      <BalanceTrendChart />

      {/* 2. Bar Chart (Existing) - Half Desktop */}
      <Card className="col-span-4">
        <CardHeader>
          <CardTitle>Receitas vs Despesas</CardTitle>
          <p className="text-sm text-muted-foreground">Comparativo mensal</p>
        </CardHeader>
        <CardContent className="pl-2">
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
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
                  cursor={{ fill: 'hsl(var(--muted))', opacity: 0.3 }}
                  formatter={(value: number, name: string) => [formatCurrency(value), name === 'income' ? 'Receita' : 'Despesa']}
                />
                <Bar dataKey="income" name="Receita" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Despesa" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* 3. Monthly Budgets - Full Width Bottom */}
      <div className="col-span-4 lg:col-span-7">
         <BudgetProgress />
      </div>
    </div>
  );
};