import React, { useState } from 'react';
import { Target, PlusCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Button } from './ui/Components';
import { useTransactions } from '../context/TransactionContext';
import { Category } from '../types';
import { BudgetModal } from './BudgetModal';

export const BudgetProgress: React.FC = () => {
  const { transactions, budgets, saveBudget, categories } = useTransactions();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Calculate stats for current month
  const budgetStats = React.useMemo(() => {
    const today = new Date();
    const currentMonth = today.getMonth() + 1; // 1-12
    const currentYear = today.getFullYear();

    // 1. Filter transactions for this month & expense type
    const currentMonthTx = transactions.filter(t => {
      if (t.type !== 'expense') return false;
      const [year, month] = t.date.split('-').map(Number);
      return year === currentYear && month === currentMonth;
    });

    // 2. Aggregate spend per category
    const spendByCategory: Record<string, number> = {};
    currentMonthTx.forEach(t => {
      spendByCategory[t.category] = (spendByCategory[t.category] || 0) + t.amount;
    });

    // 3. Merge with budgets
    // We want to show categories that either have a Budget OR have Spending
    const activeCategories = new Set([
      ...Object.keys(spendByCategory),
      ...budgets.map(b => b.category)
    ]);

    return Array.from(activeCategories).map(catName => {
      const category = catName as Category;
      const spent = spendByCategory[category] || 0;
      const budgetObj = budgets.find(b => b.category === category);
      const limit = budgetObj ? budgetObj.amount : 0;
      
      // Calculate percentage (cap at 100 for visual bar, but keep real for color)
      const percentage = limit > 0 ? (spent / limit) * 100 : 0;
      
      return {
        category,
        spent,
        limit,
        percentage
      };
    }).filter(item => item.spent > 0 || item.limit > 0) // Hide empty rows
      .sort((a, b) => b.percentage - a.percentage); // Sort by highest usage

  }, [transactions, budgets]);

  const getBarColor = (percentage: number) => {
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <>
      <Card className="h-full">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-blue-500" />
              Orçamentos Mensais
            </CardTitle>
            <p className="text-sm text-muted-foreground">Monitore limites por categoria</p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setIsModalOpen(true)}>
            <PlusCircle className="h-4 w-4 mr-1" />
            Definir Meta
          </Button>
        </CardHeader>
        <CardContent>
          {budgetStats.length === 0 ? (
             <div className="text-center text-sm text-muted-foreground py-6">
               Nenhum gasto ou orçamento definido para este mês.
             </div>
          ) : (
            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
              {budgetStats.map((item) => (
                <div key={item.category} className="space-y-1.5 p-3 rounded-lg border border-border/50 bg-card/50">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="font-medium truncate pr-2">{item.category}</span>
                    <span className="text-muted-foreground whitespace-nowrap">
                      R${item.spent.toFixed(0)} <span className="text-xs">/ {item.limit > 0 ? `R$${item.limit.toFixed(0)}` : '∞'}</span>
                    </span>
                  </div>
                  {/* Progress Bar Background */}
                  <div className="h-2 w-full rounded-full bg-secondary overflow-hidden bg-slate-100 dark:bg-slate-800">
                    {/* Progress Bar Fill */}
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${getBarColor(item.percentage)}`} 
                      style={{ width: `${Math.min(item.percentage, 100)}%` }}
                    />
                  </div>
                  <div className="text-xs text-right pt-1 text-muted-foreground">
                    {item.limit > 0 ? `${Math.round(item.percentage)}%` : 'Sem limite'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <BudgetModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        onSave={saveBudget}
        categories={categories}
      />
    </>
  );
};