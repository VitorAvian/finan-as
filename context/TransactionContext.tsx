import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { Transaction, SummaryStats, ChartDataPoint, CategoryDataPoint, Budget, Category, CategoryItem, TransactionType } from '../types';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

interface MonthlyStats {
  income: number;
  expenses: number;
  balance: number; // Net (Income - Expense)
}

interface FinancialReport {
  currentMonth: MonthlyStats;
  previousMonth: MonthlyStats;
  totalBalance: number;
  previousClosingBalance: number; // Balance at the end of last month
}

interface TransactionContextType {
  transactions: Transaction[];
  budgets: Budget[];
  categories: CategoryItem[];
  isLoading: boolean;
  error: React.ReactNode | null;
  addTransaction: (transaction: Omit<Transaction, 'id' | 'createdAt'>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<boolean>;
  updateTransaction: (id: string, updated: Omit<Transaction, 'id' | 'createdAt'>) => Promise<void>;
  saveBudget: (category: Category, amount: number) => Promise<void>;
  addCategory: (name: string, type: TransactionType, color: string) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  stats: SummaryStats; // Kept for backward compatibility
  financialReport: FinancialReport; // New MoM data
  monthlyData: ChartDataPoint[];
  categoryData: CategoryDataPoint[];
}

const TransactionContext = createContext<TransactionContextType | undefined>(undefined);

export const TransactionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<React.ReactNode | null>(null);

  useEffect(() => {
    if (user) {
      loadData(user.id);
    } else {
      setTransactions([]);
      setBudgets([]);
      setCategories([]);
      setIsLoading(false);
    }
  }, [user]);

  const loadData = async (userId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const [txData, budgetData, catData] = await Promise.all([
        api.fetchTransactions(userId),
        api.fetchBudgets(userId),
        api.fetchCategories(userId)
      ]);
      setTransactions(txData);
      setBudgets(budgetData);
      setCategories(catData);
    } catch (err: any) {
      handleDbError(err, "carregar dados");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDbError = (err: any, action: string) => {
    const msg = err.message || JSON.stringify(err);
    console.error(`Falha ao ${action}:`, msg);

    if (msg.includes('relation "transactions" does not exist')) {
      setError(<span>Tabela 'transactions' não encontrada.</span>);
      return;
    }
    if (msg.includes('relation "budgets" does not exist')) {
      setError(<span>Tabela 'budgets' não encontrada.</span>);
      return;
    }
    setError(`Falha ao ${action}. ${msg}`);
  };

  const addTransaction = async (data: Omit<Transaction, 'id' | 'createdAt'>) => {
    if (!user) return;
    try {
      setError(null);
      const newTransaction = await api.createTransaction(user.id, data);
      setTransactions(prev => [newTransaction, ...prev]);
    } catch (err: any) {
      handleDbError(err, "adicionar transação");
    }
  };

  const deleteTransaction = async (id: string): Promise<boolean> => {
    if (!user) return false;
    const previousTransactions = [...transactions];
    const cleanId = id.trim();

    setTransactions(prev => prev.filter(t => t.id !== cleanId));

    try {
      await api.deleteTransaction(user.id, cleanId);
      return true;
    } catch (err: any) {
      console.error("Context: Falha ao deletar transação:", err);
      setTransactions(previousTransactions); 
      setError(`Falha ao deletar: ${err.message}`);
      return false;
    }
  };

  const updateTransaction = async (id: string, updated: Omit<Transaction, 'id' | 'createdAt'>) => {
    if (!user) return;
    try {
      setError(null);
      const updatedTx = await api.updateTransaction(user.id, id, updated);
      setTransactions(prev => prev.map(t => t.id === id ? updatedTx : t));
    } catch (err: any) {
      handleDbError(err, "atualizar transação");
    }
  };

  const saveBudget = async (category: Category, amount: number) => {
    if (!user) return;
    try {
      setError(null);
      const savedBudget = await api.upsertBudget(user.id, category, amount);
      setBudgets(prev => {
        const index = prev.findIndex(b => b.category === category);
        if (index >= 0) {
          const newBudgets = [...prev];
          newBudgets[index] = savedBudget;
          return newBudgets;
        }
        return [...prev, savedBudget];
      });
    } catch (err: any) {
      handleDbError(err, "salvar orçamento");
    }
  };

  const addCategory = async (name: string, type: TransactionType, color: string) => {
    if (!user) return;
    try {
      setError(null);
      const newCat = await api.addCategory(user.id, name, type, color);
      setCategories(prev => [...prev, newCat]);
    } catch (err: any) {
      handleDbError(err, "adicionar categoria");
    }
  };

  const deleteCategory = async (id: string) => {
    if (!user) return;
    try {
      await api.deleteCategory(user.id, id);
      setCategories(prev => prev.filter(c => c.id !== id));
    } catch (err: any) {
      console.error("Falha ao deletar categoria:", err);
    }
  };

  // --- Statistics Logic ---

  // 1. Legacy All-Time Stats (kept for compatibility if needed, though we primarily use financialReport now)
  const stats = useMemo(() => transactions.reduce(
    (acc, curr) => {
      if (curr.type === 'income') {
        acc.totalIncome += curr.amount;
        acc.totalBalance += curr.amount;
      } else {
        acc.totalExpenses += curr.amount;
        acc.totalBalance -= curr.amount;
      }
      return acc;
    },
    { totalBalance: 0, totalIncome: 0, totalExpenses: 0 }
  ), [transactions]);

  // 2. Financial Report (MoM Comparison)
  const financialReport = useMemo((): FinancialReport => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Setup Previous Month Date
    const prevDate = new Date(now);
    prevDate.setMonth(now.getMonth() - 1);
    const prevMonth = prevDate.getMonth();
    const prevYear = prevDate.getFullYear();

    let current = { income: 0, expenses: 0, balance: 0 };
    let previous = { income: 0, expenses: 0, balance: 0 };
    let totalBalance = 0;
    let previousClosingBalance = 0;

    transactions.forEach(t => {
      const [tYear, tMonth] = t.date.split('-').map(Number);
      const txDate = new Date(tYear, tMonth - 1, 1);
      
      // All Time Balance Calculation
      if (t.type === 'income') totalBalance += t.amount;
      else totalBalance -= t.amount;

      // Previous Closing Balance (All transactions strictly BEFORE current month)
      // If transaction is in previous years OR (same year but previous months)
      if (tYear < currentYear || (tYear === currentYear && (tMonth - 1) < currentMonth)) {
         if (t.type === 'income') previousClosingBalance += t.amount;
         else previousClosingBalance -= t.amount;
      }

      // Current Month Stats
      if (tYear === currentYear && (tMonth - 1) === currentMonth) {
        if (t.type === 'income') current.income += t.amount;
        else current.expenses += t.amount;
      }

      // Previous Month Stats
      if (tYear === prevYear && (tMonth - 1) === prevMonth) {
        if (t.type === 'income') previous.income += t.amount;
        else previous.expenses += t.amount;
      }
    });

    current.balance = current.income - current.expenses;
    previous.balance = previous.income - previous.expenses;

    return {
      currentMonth: current,
      previousMonth: previous,
      totalBalance,
      previousClosingBalance
    };
  }, [transactions]);


  const getMonthlyData = (): ChartDataPoint[] => {
    const months = new Map<string, ChartDataPoint>();
    const today = new Date();
    
    // Initialize last 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const key = d.toLocaleString('pt-BR', { month: 'short' });
      months.set(key, { name: key, income: 0, expense: 0 });
    }

    transactions.forEach(t => {
      const [year, month] = t.date.split('-').map(Number);
      const d = new Date(year, month - 1, 1); 
      const key = d.toLocaleString('pt-BR', { month: 'short' });
      
      if (months.has(key)) {
        const entry = months.get(key)!;
        if (t.type === 'income') entry.income += t.amount;
        else entry.expense += t.amount;
      }
    });

    return Array.from(months.values());
  };

  const getCategoryData = (): CategoryDataPoint[] => {
    const categories: Record<string, number> = {};
    
    transactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        categories[t.category] = (categories[t.category] || 0) + t.amount;
      });

    return Object.entries(categories).map(([name, value]) => ({ name, value }));
  };

  return (
    <TransactionContext.Provider value={{
      transactions,
      budgets,
      categories,
      isLoading,
      error,
      addTransaction,
      deleteTransaction,
      updateTransaction,
      saveBudget,
      addCategory,
      deleteCategory,
      stats,
      financialReport,
      monthlyData: getMonthlyData(),
      categoryData: getCategoryData()
    }}>
      {children}
    </TransactionContext.Provider>
  );
};

export const useTransactions = () => {
  const context = useContext(TransactionContext);
  if (!context) throw new Error('useTransactions deve ser usado dentro de TransactionProvider');
  return context;
};