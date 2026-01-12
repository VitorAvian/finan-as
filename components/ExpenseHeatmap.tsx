import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Components';
import { useTransactions } from '../context/TransactionContext';
import { CalendarDays } from 'lucide-react';

export const ExpenseHeatmap: React.FC = () => {
  const { transactions } = useTransactions();
  const [tooltip, setTooltip] = useState<{ x: number; y: number; data: any } | null>(null);

  // Configuration
  const DAYS_TO_SHOW = 91; // ~3 Months (13 weeks)

  const heatmapData = useMemo(() => {
    const today = new Date();
    // Normalize today to avoid time issues
    today.setHours(0, 0, 0, 0);

    // Calculate Start Date (align to the Sunday ~3 months ago to keep grid clean)
    const startDate = new Date(today);
    startDate.setDate(today.getDate() - DAYS_TO_SHOW);
    while (startDate.getDay() !== 0) {
      startDate.setDate(startDate.getDate() - 1);
    }

    // 1. Map expenses by date string (YYYY-MM-DD)
    const expenseMap = new Map<string, number>();
    let maxExpense = 0;

    transactions.forEach(t => {
      if (t.type === 'expense') {
        const current = expenseMap.get(t.date) || 0;
        const newVal = current + t.amount;
        expenseMap.set(t.date, newVal);
        if (newVal > maxExpense) maxExpense = newVal;
      }
    });

    // 2. Build the array of days for the grid
    const days = [];
    const pointer = new Date(startDate);

    // We generate enough days to cover the range until today (or end of this week)
    while (pointer <= today || pointer.getDay() !== 0) {
      const dateStr = pointer.toISOString().split('T')[0];
      const amount = expenseMap.get(dateStr) || 0;
      
      days.push({
        date: new Date(pointer),
        dateStr,
        amount,
        intensity: maxExpense > 0 ? amount / maxExpense : 0
      });

      // Break if we are past today AND we finished the week (Saturday)
      if (pointer > today && pointer.getDay() === 0) break; 
      
      pointer.setDate(pointer.getDate() + 1);
    }

    return { days, maxExpense };
  }, [transactions]);

  // Helper to get color class based on intensity
  const getColorClass = (intensity: number, amount: number) => {
    if (amount === 0) return 'bg-muted/40 hover:bg-muted'; // Empty
    if (intensity < 0.25) return 'bg-red-200 dark:bg-red-900/40 hover:bg-red-300';
    if (intensity < 0.50) return 'bg-red-400 dark:bg-red-700/60 hover:bg-red-500';
    if (intensity < 0.75) return 'bg-red-500 dark:bg-red-600/80 hover:bg-red-600';
    return 'bg-red-600 dark:bg-red-500 hover:bg-red-700'; // Max
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'short' 
    });
  };

  return (
    <>
      <Card className="h-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-4 w-4 text-primary" />
              Intensidade de Gastos (Últimos 3 meses)
            </CardTitle>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Menos</span>
              <div className="flex gap-1">
                <div className="h-2 w-2 rounded-[2px] bg-muted/40"></div>
                <div className="h-2 w-2 rounded-[2px] bg-red-200 dark:bg-red-900/40"></div>
                <div className="h-2 w-2 rounded-[2px] bg-red-400 dark:bg-red-700/60"></div>
                <div className="h-2 w-2 rounded-[2px] bg-red-600 dark:bg-red-500"></div>
              </div>
              <span>Mais</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="w-full overflow-x-auto pb-2 custom-scrollbar flex justify-center md:justify-start lg:justify-center">
            {/* GitHub Style Grid: Rows=7 (Weekdays), Cols=Dynamic */}
            <div className="grid grid-rows-7 grid-flow-col gap-1 w-max">
              {/* Render Days */}
              {heatmapData.days.map((day) => (
                <div 
                  key={day.dateStr}
                  className={`
                    h-3 w-3 sm:h-4 sm:w-4 rounded-[3px] transition-colors cursor-pointer
                    ${getColorClass(day.intensity, day.amount)}
                  `}
                  onMouseEnter={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setTooltip({
                      x: rect.left + rect.width / 2,
                      y: rect.top,
                      data: day
                    });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Fixed Tooltip Portal-like */}
      {tooltip && (
        <div 
          className="fixed z-[9999] pointer-events-none -translate-x-1/2 -translate-y-full mb-2 bg-popover text-popover-foreground text-xs px-2 py-1 rounded border border-border shadow-md"
          style={{ 
            left: tooltip.x, 
            top: tooltip.y - 4, // slight gap above the mouse/element
          }}
        >
          <p className="font-semibold capitalize">{formatDate(tooltip.data.date)}</p>
          <p>R$ {tooltip.data.amount.toFixed(2)}</p>
          {/* Triangle pointer */}
          <div className="w-2 h-2 bg-popover border-r border-b border-border transform rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2"></div>
        </div>
      )}
    </>
  );
};