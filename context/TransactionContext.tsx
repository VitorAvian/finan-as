import React, { createContext, useContext, useState, useEffect } from 'react';
import { Transaction, SummaryStats, ChartDataPoint, CategoryDataPoint, Budget, Category, CategoryItem, TransactionType } from '../types';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

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

    // 1. Transaction Table Missing (Create)
    if (msg.includes('relation "transactions" does not exist')) {
      setError(
        <span>
          Tabela 'transactions' não encontrada.
          <br/>
          <code>CREATE TABLE transactions ...</code>
        </span>
      );
      return;
    }

    // 2. Budgets Table Missing (Create)
    if (msg.includes('relation "budgets" does not exist') || msg.includes("Could not find the table 'public.budgets'")) {
      setError(<span>Tabela 'budgets' não encontrada.</span>);
      return;
    }

    // 3. User_ID Column Missing (Migration / ALTER)
    if ((msg.includes("column") && msg.includes("user_id")) || msg.includes("transactions_user_id_fkey")) {
       const sql = `
-- Execute isso no SQL Editor do Supabase para migrar suas tabelas:
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE budgets ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Habilitar segurança
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Criar políticas (apenas donos veem seus dados)
CREATE POLICY "Users can manage their own transactions" ON transactions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own budgets" ON budgets FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their own categories" ON categories FOR ALL USING (auth.uid() = user_id);
`;
       setError(
        <div className="space-y-2 text-left">
          <p className="font-bold">Atualização Necessária (Migração)</p>
          <p className="text-sm text-muted-foreground">Suas tabelas existem, mas precisam ser vinculadas aos usuários.</p>
          <pre className="bg-black/80 text-white p-3 rounded text-xs font-mono overflow-x-auto select-all whitespace-pre-wrap">{sql}</pre>
        </div>
      );
      return;
    }

    // 4. Other Columns Missing (Recurring/Frequency)
    if ((msg.includes("Could not find the") && msg.includes("column")) || (msg.includes("column") && msg.includes("does not exist"))) {
      const sql = `
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS frequency TEXT;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'expense';
`;
      setError(
        <div className="space-y-2 text-left">
          <p className="font-bold">Colunas Faltando</p>
          <pre className="bg-black/80 text-white p-3 rounded text-xs font-mono overflow-x-auto select-all whitespace-pre-wrap">{sql}</pre>
        </div>
      );
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

      const errorMessage = err.message || "Erro desconhecido";
      
      if (errorMessage === "DELETE_BLOCKED_BY_RLS" || errorMessage.includes("policy") || errorMessage.includes("permission denied")) {
        const sqlFix = `
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage their own transactions" ON transactions;
CREATE POLICY "Users can manage their own transactions" 
ON transactions FOR ALL USING (auth.uid() = user_id);`;
        
        setError(
          <div className="fixed bottom-4 right-4 z-[9999] max-w-md bg-card border-2 border-destructive rounded-lg shadow-2xl p-4 animate-in slide-in-from-right">
             <div className="flex justify-between items-start mb-2">
                <p className="font-bold text-destructive flex items-center gap-2">
                  🚫 Ação Bloqueada pelo Banco de Dados
                </p>
                <button onClick={() => setError(null)} className="text-muted-foreground hover:text-foreground">✕</button>
             </div>
             <p className="text-sm text-foreground mb-2">
               O banco de dados impediu a exclusão. Verifique suas políticas RLS.
             </p>
             <pre className="bg-black/90 text-green-400 p-3 rounded text-[10px] font-mono overflow-x-auto select-all border border-white/10 whitespace-pre-wrap">
                  {sqlFix}
             </pre>
          </div>
        );
      } else {
        setError(`Falha ao deletar: ${errorMessage}`);
      }
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