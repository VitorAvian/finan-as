import React from 'react';
import { CalendarClock, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Badge } from './ui/Components';
import { useTransactions } from '../context/TransactionContext';

export const UpcomingBills: React.FC = () => {
  const { transactions } = useTransactions();

  // Logic to find upcoming recurring expenses
  const upcomingBills = React.useMemo(() => {
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    return transactions
      .filter(t => t.type === 'expense' && t.isRecurring)
      .map(t => {
        // Parse the original date (YYYY-MM-DD)
        const [year, month, day] = t.date.split('-').map(Number);
        
        let dueDay = day;
        let dueDisplay = '';
        let isUpcoming = false;

        if (t.frequency === 'monthly') {
          // If the bill day is later than today, it's upcoming this month
          if (dueDay > currentDay) {
            isUpcoming = true;
            dueDisplay = `${dueDay}/${currentMonth + 1}`;
          }
        } else if (t.frequency === 'weekly') {
           // Simplified weekly logic
           const origDate = new Date(year, month - 1, day);
           const dayOfWeek = origDate.getDay(); // 0-6
           const todayDayOfWeek = today.getDay();
           
           if (dayOfWeek > todayDayOfWeek) {
             const daysUntil = dayOfWeek - todayDayOfWeek;
             dueDay = currentDay + daysUntil;
             isUpcoming = true;
             dueDisplay = `Próx. ${origDate.toLocaleString('pt-BR', { weekday: 'short' })}`;
           }
        }

        return { ...t, dueDay, dueDisplay, isUpcoming };
      })
      .filter(t => t.isUpcoming)
      .sort((a, b) => a.dueDay - b.dueDay)
      .slice(0, 5); // Show next 5
  }, [transactions]);

  if (upcomingBills.length === 0) return null;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarClock className="h-5 w-5 text-orange-500" />
          Contas Próximas
        </CardTitle>
        <p className="text-sm text-muted-foreground">Despesas recorrentes a vencer</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {upcomingBills.map(bill => (
            <div key={bill.id} className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 font-bold text-xs">
                  {bill.dueDisplay.split('/')[0]}
                </div>
                <div>
                  <p className="font-medium text-sm leading-none">{bill.description}</p>
                  <p className="text-xs text-muted-foreground mt-1 capitalize">
                    {bill.frequency === 'monthly' ? 'Mensal' : 'Semanal'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="font-bold text-red-600 dark:text-red-400 block">
                  -R${bill.amount.toFixed(2)}
                </span>
              </div>
            </div>
          ))}
          
          <div className="rounded-md bg-blue-50 dark:bg-blue-900/20 p-3 flex gap-2">
            <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-600 dark:text-blue-300">
              Estimativas baseadas em suas recorrências.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};