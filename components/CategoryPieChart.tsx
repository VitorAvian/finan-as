import React from 'react';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Components';
import { useTransactions } from '../context/TransactionContext';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

export const CategoryPieChart: React.FC = () => {
  const { categoryData } = useTransactions();

  const formatCurrency = (val: number) => `R$${val}`;

  return (
    <Card className="w-full h-full">
      <CardHeader>
        <CardTitle>Despesas por Categoria</CardTitle>
        <p className="text-sm text-muted-foreground">Distribuição de gastos</p>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                   contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                   formatter={(value: number) => formatCurrency(value)}
                />
                <Legend 
                  layout="horizontal" 
                  verticalAlign="bottom" 
                  align="center"
                  iconType="circle"
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              Sem dados de despesas
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};