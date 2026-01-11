import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Components';
import { useTransactions } from '../context/TransactionContext';

export const IncomeExpenseChart: React.FC = () => {
  const { monthlyData } = useTransactions();

  const formatCurrency = (val: number) => `R$${val}`;

  return (
    <Card className="h-full">
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
  );
};