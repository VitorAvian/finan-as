import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Edit2, Trash2 } from 'lucide-react';
import { Button, Card, CardContent } from './ui/Components';
import { useTransactions } from '../context/TransactionContext';
import { Transaction } from '../types';

interface TransactionCalendarProps {
  onEdit: (t: Transaction) => void;
}

export const TransactionCalendar: React.FC<TransactionCalendarProps> = ({ onEdit }) => {
  const { transactions, deleteTransaction } = useTransactions();
  
  // State for navigation
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Helper: Get days in month
  const getDaysInMonth = (y: number, m: number) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y: number, m: number) => new Date(y, m, 1).getDay(); // 0 = Sunday

  const daysInMonth = getDaysInMonth(year, month);
  const startDay = getFirstDayOfMonth(year, month);
  
  // Navigation handlers
  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
    setSelectedDay(null);
  };
  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
    setSelectedDay(null);
  };
  const goToday = () => {
    setCurrentDate(new Date());
    setSelectedDay(new Date().getDate());
  };

  // Group transactions by day for the current month
  const dailyData = useMemo(() => {
    const map = new Map<number, { income: number; expense: number; count: number; items: Transaction[] }>();

    transactions.forEach(t => {
      const tDate = new Date(t.date);
      // Note: We parse the YYYY-MM-DD string safely
      const [tYear, tMonth, tDay] = t.date.split('-').map(Number);
      
      if (tYear === year && (tMonth - 1) === month) {
        const day = tDay;
        const current = map.get(day) || { income: 0, expense: 0, count: 0, items: [] };
        
        if (t.type === 'income') current.income += t.amount;
        else current.expense += t.amount;
        
        current.count += 1;
        current.items.push(t);
        map.set(day, current);
      }
    });

    return map;
  }, [transactions, year, month]);

  // Generate calendar grid cells
  const blanks = Array.from({ length: startDay }, (_, i) => null);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Selected Day Transactions
  const selectedTransactions = useMemo(() => {
    if (!selectedDay) return [];
    const data = dailyData.get(selectedDay);
    return data ? data.items.sort((a, b) => b.createdAt - a.createdAt) : [];
  }, [dailyData, selectedDay]);

  const handleDelete = (id: string) => {
    if (confirm('Deletar esta transação?')) {
      deleteTransaction(id);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-lg capitalize">
            {currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}
          </h3>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={prevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToday}>
            Hoje
          </Button>
          <Button variant="ghost" size="icon" onClick={nextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="border border-border rounded-lg overflow-hidden bg-card">
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 border-b border-border bg-muted/40 text-center">
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
            <div key={d} className="py-2 text-xs font-medium text-muted-foreground uppercase">
              {d}
            </div>
          ))}
        </div>
        
        {/* Days */}
        <div className="grid grid-cols-7 auto-rows-fr bg-card">
          {/* Empty Cells */}
          {blanks.map((_, i) => (
            <div key={`blank-${i}`} className="min-h-[80px] border-b border-r border-border/50 bg-muted/5" />
          ))}

          {/* Actual Days */}
          {days.map(day => {
            const data = dailyData.get(day);
            const isSelected = day === selectedDay;
            const isToday = 
              new Date().getDate() === day && 
              new Date().getMonth() === month && 
              new Date().getFullYear() === year;

            return (
              <div 
                key={day} 
                onClick={() => setSelectedDay(day)}
                className={`
                  min-h-[80px] p-2 border-b border-r border-border/50 cursor-pointer transition-colors relative
                  hover:bg-accent/50
                  ${isSelected ? 'bg-accent ring-2 ring-inset ring-primary/20' : ''}
                `}
              >
                <div className="flex justify-between items-start">
                  <span className={`
                    text-sm font-medium h-6 w-6 flex items-center justify-center rounded-full
                    ${isToday ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}
                  `}>
                    {day}
                  </span>
                </div>
                
                {/* Dots/Indicators */}
                {data && (
                  <div className="mt-2 space-y-1">
                    {data.income > 0 && (
                      <div className="text-[10px] font-bold text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30 px-1 rounded truncate">
                        +{Math.round(data.income)}
                      </div>
                    )}
                    {data.expense > 0 && (
                      <div className="text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-1 rounded truncate">
                        -{Math.round(data.expense)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Details Panel for Selected Day */}
      {selectedDay && (
        <Card className="border-l-4 border-l-primary animate-in slide-in-from-top-2">
          <CardContent className="pt-6">
            <h4 className="font-semibold text-sm mb-4 flex items-center gap-2 capitalize">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              Transações de {selectedDay} de {currentDate.toLocaleString('pt-BR', { month: 'long' })}
            </h4>
            
            {selectedTransactions.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Nenhuma transação nesta data.</p>
            ) : (
              <div className="space-y-2">
                {selectedTransactions.map(t => (
                  <div key={t.id} className="flex items-center justify-between p-2 rounded-md bg-muted/40 hover:bg-muted/60 transition-colors">
                    <div className="flex flex-col">
                      <span className="font-medium text-sm">{t.description}</span>
                      <span className="text-xs text-muted-foreground inline-flex items-center gap-2">
                        <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: t.type === 'income' ? '#10b981' : '#ef4444' }}></span>
                        {t.category}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`font-bold text-sm ${t.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                        {t.type === 'income' ? '+' : '-'}R${t.amount.toFixed(2)}
                      </span>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); onEdit(t); }}>
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};