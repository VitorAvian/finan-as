import React, { createContext, useContext, useState, useEffect } from 'react';
import { Transaction, SummaryStats, ChartDataPoint, CategoryDataPoint, Budget, Category, CategoryItem, TransactionType } from '../types';
import { api } from '../services/api';

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
  stats: SummaryStats;
  monthlyData: ChartDataPoint[];
  categoryData: CategoryDataPoint[];
}

const TransactionContext = createContext<TransactionContextType | undefined>(undefined);

export const TransactionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<React.ReactNode | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [txData, budgetData, catData] = await Promise.all([
        api.fetchTransactions(),
        api.fetchBudgets(),
        api.fetchCategories()
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

    // 1. Transaction Table Missing
    if (msg.includes('relation "transactions" does not exist')) {
      setError(
        <span>
          Tabela do banco de dados não encontrada. Por favor, execute o script SQL no seu Editor SQL do Supabase. 
          <br/>
          <code>CREATE TABLE transactions ...</code>
        </span>
      );
      return;
    }

    // 2. Budgets Table Missing
    if (msg.includes('relation "budgets" does not exist') || msg.includes("Could not find the table 'public.budgets'")) {
      const sql = `
CREATE TABLE IF NOT EXISTS budgets (
  id uuid default gen_random_uuid() primary key,
  category text not null unique,
  amount numeric not null,
  created_at timestamptz default now()
);`;
      setError(
        <div className="space-y-2 text-left">
          <p className="font-bold">Tabela de Orçamentos Ausente</p>
          <pre className="bg-black/80 text-white p-3 rounded text-xs font-mono overflow-x-auto select-all">{sql}</pre>
        </div>
      );
      return;
    }

    // 3. Categories Table Missing
    if (msg.includes('relation "categories" does not exist') || msg.includes("Could not find the table 'public.categories'")) {
      const sql = `
CREATE TABLE IF NOT EXISTS categories (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  color text,
  type text default 'expense',
  created_at timestamptz default now()
);`;
      setError(
        <div className="space-y-2 text-left">
          <p className="font-bold">Tabela de Categorias Ausente</p>
          <pre className="bg-black/80 text-white p-3 rounded text-xs font-mono overflow-x-auto select-all">{sql}</pre>
        </div>
      );
      return;
    }

    // 4. Transaction Column Missing
    if ((msg.includes("Could not find the") && msg.includes("column")) || (msg.includes("column") && msg.includes("does not exist"))) {
      const sql = `ALTER TABLE transactions ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false;\nALTER TABLE transactions ADD COLUMN IF NOT EXISTS frequency TEXT;`;
      setError(
        <div className="space-y-2 text-left">
          <p className="font-bold">Atualização do Esquema de Banco de Dados Necessária</p>
          <pre className="bg-black/80 text-white p-3 rounded text-xs font-mono overflow-x-auto select-all">{sql}</pre>
        </div>
      );
      return;
    }

    setError(`Falha ao ${action}. ${msg}`);
  };

  const addTransaction = async (data: Omit<Transaction, 'id' | 'createdAt'>) => {
    try {
      setError(null);
      const newTransaction = await api.createTransaction(data);
      setTransactions(prev => [newTransaction, ...prev]);
    } catch (err: any) {
      handleDbError(err, "adicionar transação");
    }
  };

  const deleteTransaction = async (id: string): Promise<boolean> => {
    // 1. Snapshot previous state for rollback
    const previousTransactions = [...transactions];
    const cleanId = id.trim();

    // 2. Optimistic Update: Remove immediately from UI
    setTransactions(prev => prev.filter(t => t.id !== cleanId));

    try {
      // 3. API Call
      await api.deleteTransaction(cleanId);
      return true;
      
    } catch (err: any) {
      // 5. ERROR: Rollback UI and show error
      console.error("Context: Falha ao deletar transação:", err);
      setTransactions(previousTransactions); // Rollback visual

      const errorMessage = err.message || "Erro desconhecido";
      
      // Check for our custom flag "DELETE_BLOCKED_BY_RLS" or standard Supabase RLS messages
      if (errorMessage === "DELETE_BLOCKED_BY_RLS" || errorMessage.includes("policy") || errorMessage.includes("permission denied")) {
        const sqlFix = `
-- Execute no SQL Editor do Supabase para corrigir a exclusão
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Remove políticas antigas que possam estar bloqueando
DROP POLICY IF EXISTS "Public Access" ON transactions;
DROP POLICY IF EXISTS "Public Access Transactions" ON transactions;
DROP POLICY IF EXISTS "Enable delete for anon" ON transactions;

-- Cria uma política permissiva para API Anônima
CREATE POLICY "Public Access Transactions" ON transactions FOR ALL USING (true);`;
        
        setError(
          <div className="fixed bottom-4 right-4 z-[9999] max-w-md bg-card border-2 border-destructive rounded-lg shadow-2xl p-4 animate-in slide-in-from-right">
             <div className="flex justify-between items-start mb-2">
                <p className="font-bold text-destructive flex items-center gap-2">
                  🚫 Ação Bloqueada pelo Banco de Dados
                </p>
                <button onClick={() => setError(null)} className="text-muted-foreground hover:text-foreground">✕</button>
             </div>
             <p className="text-sm text-foreground mb-2">
               O Supabase impediu a exclusão desta transação. Isso acontece quando as permissões (RLS) não estão configuradas para permitir "DELETE".
             </p>
             <div className="space-y-1">
               <p className="text-xs font-semibold">COPIE E RODE NO SQL EDITOR:</p>
               <pre className="bg-black/90 text-green-400 p-3 rounded text-[10px] font-mono overflow-x-auto select-all border border-white/10 whitespace-pre-wrap">
                  {sqlFix}
               </pre>
             </div>
          </div>
        );
      } else {
        // Generic error fallback
        setError(`Falha ao deletar: ${errorMessage}`);
      }
      return false;
    }
  };

  const updateTransaction = async (id: string, updated: Omit<Transaction, 'id' | 'createdAt'>) => {
    try {
      setError(null);
      const updatedTx = await api.updateTransaction(id, updated);
      setTransactions(prev => prev.map(t => t.id === id ? updatedTx : t));
    } catch (err: any) {
      handleDbError(err, "atualizar transação");
    }
  };

  const saveBudget = async (category: Category, amount: number) => {
    try {
      setError(null);
      const savedBudget = await api.upsertBudget(category, amount);
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
    try {
      setError(null);
      const newCat = await api.addCategory(name, type, color);
      setCategories(prev => [...prev, newCat]);
    } catch (err: any) {
      handleDbError(err, "adicionar categoria");
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      await api.deleteCategory(id);
      setCategories(prev => prev.filter(c => c.id !== id));
    } catch (err: any) {
      console.error("Falha ao deletar categoria:", err);
      alert(`Falha ao deletar categoria: ${err.message || 'Erro desconhecido'}`);
    }
  };

  // Derived Statistics
  const stats = transactions.reduce(
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
  );

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