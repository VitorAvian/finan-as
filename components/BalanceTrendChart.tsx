import React, { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Components';
import { useTransactions } from '../context/TransactionContext';
import { TrendingUp } from 'lucide-react';

export const BalanceTrendChart: React.FC = () => {
  const { transactions } = useTransactions();

  const data = useMemo(() => {
    if (transactions.length === 0) return [];

    // 1. Sort transactions chronologically
    const sortedTx = [...transactions].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // 2. Calculate cumulative balance for entire history
    let currentBalance = 0;
    const historyMap = new Map<string, number>();

    sortedTx.forEach(t => {
      currentBalance += t.type === 'income' ? t.amount : -t.amount;
      // Store/Overwrite the balance for this specific date (end of day balance)
      historyMap.set(t.date, currentBalance);
    });

    // 3. Fill in gaps and filter for the last 6 months
    const result = [];
    const today = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(today.getMonth() - 6);

    // Create array of dates from first transaction (or 6 months ago) to today
    let pointerDate = new Date(sortedTx[0].date);
    if (pointerDate > sixMonthsAgo) pointerDate = new Date(sortedTx[0].date);
    else pointerDate = sixMonthsAgo;

    let lastKnownBalance = 0;
    
    // Find initial balance before the window if needed
    for (const [dateStr, bal] of historyMap.entries()) {
        if (new Date(dateStr) < pointerDate) {
            lastKnownBalance = bal;
        }
    }

    while (pointerDate <= today) {
      const dateStr = pointerDate.toISOString().split('T')[0];
      
      // Update balance if changed on this day, otherwise keep previous
      if (historyMap.has(dateStr)) {
        lastKnownBalance = historyMap.get(dateStr)!;
      }

      result.push({
        date: dateStr,
        displayDate: pointerDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        balance: lastKnownBalance
      });

      pointerDate.setDate(pointerDate.getDate() + 1);
    }

    return result;
  }, [transactions]);

  const formatCurrency = (val: number) => `R$${val.toFixed(0)}`;

  // Determine trend color based on start vs end
  const startBal = data.length > 0 ? data[0].balance : 0;
  const endBal = data.length > 0 ? data[data.length - 1].balance : 0;
  const isPositiveTrend = endBal >= startBal;

  return (
    <Card className="h-full w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className={`h-5 w-5 ${isPositiveTrend ? 'text-green-500' : 'text-red-500'}`} />
          Evolução Patrimonial
        </CardTitle>
        <p className="text-sm text-muted-foreground">Saldo acumulado nos últimos 6 meses</p>
      </CardHeader>
      <CardContent className="pl-0">
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={isPositiveTrend ? "#10b981" : "#ef4444"} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={isPositiveTrend ? "#10b981" : "#ef4444"} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" vertical={false} />
              <XAxis 
                dataKey="displayDate" 
                stroke="#888888" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false}
                minTickGap={30}
              />
              <YAxis 
                stroke="#888888" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={(value) => `R$${value}`} 
              />
              <Tooltip 
                contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                itemStyle={{ color: isPositiveTrend ? '#10b981' : '#ef4444' }}
                formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Saldo Acumulado']}
                labelFormatter={(label) => `Data: ${label}`}
              />
              <Area 
                type="monotone" 
                dataKey="balance" 
                stroke={isPositiveTrend ? "#10b981" : "#ef4444"} 
                fillOpacity={1} 
                fill="url(#colorBalance)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};