import React, { useState, useMemo } from 'react';
import { CalendarClock, AlertTriangle, CheckCircle2, DollarSign, Calendar, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Button, Badge } from './ui/Components';
import { useTransactions } from '../context/TransactionContext';
import { RecurringConversionModal } from './RecurringConversionModal';

export const SubscriptionsView: React.FC = () => {
  const { transactions } = useTransactions();
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);

  // Filter Active Subscriptions
  const subscriptions = useMemo(() => {
    return transactions.filter(t => t.type === 'expense' && t.isRecurring);
  }, [transactions]);

  // Calculate Metrics
  const metrics = useMemo(() => {
    let monthlyFixed = 0;
    
    subscriptions.forEach(sub => {
      if (sub.frequency === 'weekly') {
        monthlyFixed += sub.amount * 4;
      } else {
        monthlyFixed += sub.amount;
      }
    });

    const annualProjected = monthlyFixed * 12;

    return { monthlyFixed, annualProjected };
  }, [subscriptions]);

  // Process Due Dates & Alerts
  const processedSubs = useMemo(() => {
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth(); // 0-11
    const currentYear = today.getFullYear();

    return subscriptions.map(sub => {
      const [year, month, day] = sub.date.split('-').map(Number);
      
      let nextDueDate: Date;
      let daysUntil = 0;

      if (sub.frequency === 'monthly') {
        // If the day has passed this month, it's next month
        if (day < currentDay) {
          nextDueDate = new Date(currentYear, currentMonth + 1, day);
        } else {
          nextDueDate = new Date(currentYear, currentMonth, day);
        }
      } else {
        // Weekly logic (simplified)
        const origDate = new Date(year, month - 1, day);
        const dayOfWeek = origDate.getDay(); // 0-6
        const todayDayOfWeek = today.getDay();
        
        let diff = dayOfWeek - todayDayOfWeek;
        if (diff <= 0) diff += 7; // Next occurrence
        nextDueDate = new Date(today);
        nextDueDate.setDate(today.getDate() + diff);
      }

      // Calculate days difference
      const timeDiff = nextDueDate.getTime() - today.getTime();
      daysUntil = Math.ceil(timeDiff / (1000 * 3600 * 24));

      return {
        ...sub,
        nextDueDate,
        daysUntil,
        isDueSoon: daysUntil >= 0 && daysUntil <= 3
      };
    }).sort((a, b) => a.daysUntil - b.daysUntil);
  }, [subscriptions]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h2 className="text-3xl font-bold tracking-tight">Assinaturas</h2>
           <p className="text-muted-foreground">Gerencie suas despesas recorrentes e custos fixos.</p>
        </div>
        <Button onClick={() => setIsConvertModalOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Converter Transação
        </Button>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-gradient-to-br from-card to-muted/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Custo Fixo Mensal</CardTitle>
            <CalendarClock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {metrics.monthlyFixed.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Estimativa de saída recorrente por mês</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-card to-muted/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Custo Anual Projetado</CardTitle>
            <DollarSign className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {metrics.annualProjected.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Impacto anual total das assinaturas</p>
          </CardContent>
        </Card>
      </div>

      {/* Subscriptions List */}
      <Card>
        <CardHeader>
          <CardTitle>Assinaturas Ativas</CardTitle>
        </CardHeader>
        <CardContent>
          {processedSubs.length === 0 ? (
             <div className="text-center py-10 text-muted-foreground border rounded-md border-dashed">
                Nenhuma assinatura ativa encontrada.
             </div>
          ) : (
            <div className="grid gap-4">
              {processedSubs.map(sub => (
                <div 
                  key={sub.id} 
                  className={`
                    flex items-center justify-between p-4 rounded-lg border transition-all
                    ${sub.isDueSoon 
                      ? 'border-orange-500/50 bg-orange-50 dark:bg-orange-950/20' 
                      : 'border-border bg-card hover:bg-muted/50'}
                  `}
                >
                  <div className="flex items-center gap-4">
                    <div className={`
                      h-12 w-12 rounded-full flex items-center justify-center font-bold text-lg
                      ${sub.isDueSoon ? 'bg-orange-100 text-orange-600' : 'bg-primary/10 text-primary'}
                    `}>
                      {sub.description.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{sub.description}</h4>
                        {sub.isDueSoon && (
                           <Badge variant="destructive" >Vence em {sub.daysUntil} dias</Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                        <span className="capitalize bg-muted px-2 py-0.5 rounded text-xs">
                          {sub.frequency === 'monthly' ? 'Mensal' : 'Semanal'}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                           <Calendar className="h-3 w-3" /> 
                           Próx: {sub.nextDueDate.toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-lg font-bold">-R$ {sub.amount.toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground">{sub.category}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <RecurringConversionModal 
        isOpen={isConvertModalOpen} 
        onClose={() => setIsConvertModalOpen(false)} 
      />
    </div>
  );
};