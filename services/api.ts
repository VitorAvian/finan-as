import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Transaction, Budget, Category, CategoryItem, TransactionType } from '../types';

/**
 * Service Layer
 */

const LOCAL_STORAGE_KEY = 'finDash_transactions';
const BUDGET_STORAGE_KEY = 'finDash_budgets';
const CATEGORY_STORAGE_KEY = 'finDash_categories';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Default Categories to Seed (Translated)
const DEFAULT_CATEGORIES: Omit<CategoryItem, 'id'>[] = [
  { name: 'Salário', color: '#10b981', type: 'income' },
  { name: 'Freelance', color: '#34d399', type: 'income' },
  { name: 'Moradia', color: '#3b82f6', type: 'expense' },
  { name: 'Alimentação', color: '#f59e0b', type: 'expense' },
  { name: 'Transporte', color: '#8b5cf6', type: 'expense' },
  { name: 'Utilidades', color: '#6366f1', type: 'expense' },
  { name: 'Lazer', color: '#ec4899', type: 'expense' },
  { name: 'Saúde', color: '#ef4444', type: 'expense' },
  { name: 'Outros', color: '#94a3b8', type: 'expense' },
];

export const api = {
  
  async fetchTransactions(): Promise<Transaction[]> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });

      if (error) {
        console.error('Supabase Error:', error);
        throw new Error(error.message);
      }
      
      return data.map((t: any) => ({
        id: t.id,
        description: t.description,
        amount: Number(t.amount),
        type: t.type,
        category: t.category,
        date: t.date,
        createdAt: t.created_at ? new Date(t.created_at).getTime() : Date.now(),
        isRecurring: t.is_recurring, 
        frequency: t.frequency
      }));
    } else {
      await delay(500); 
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    }
  },

  async createTransaction(transaction: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('transactions')
        .insert([{
          description: transaction.description,
          amount: transaction.amount,
          type: transaction.type,
          category: transaction.category,
          date: transaction.date,
          is_recurring: transaction.isRecurring || false,
          frequency: transaction.frequency || null
        }])
        .select()
        .single();

      if (error) throw error;
      
      return {
        id: data.id,
        description: data.description,
        amount: Number(data.amount),
        type: data.type,
        category: data.category,
        date: data.date,
        createdAt: new Date(data.created_at).getTime(),
        isRecurring: data.is_recurring,
        frequency: data.frequency
      };
    } else {
      await delay(300);
      const newTransaction: Transaction = {
        ...transaction,
        id: crypto.randomUUID(),
        createdAt: Date.now(),
        isRecurring: transaction.isRecurring || false,
        frequency: transaction.frequency
      };
      
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      const transactions = stored ? JSON.parse(stored) : [];
      const updated = [newTransaction, ...transactions];
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      
      return newTransaction;
    }
  },

  async updateTransaction(id: string, updates: Omit<Transaction, 'id' | 'createdAt'>): Promise<Transaction> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('transactions')
        .update({
          description: updates.description,
          amount: updates.amount,
          type: updates.type,
          category: updates.category,
          date: updates.date,
          is_recurring: updates.isRecurring || false,
          frequency: updates.frequency || null
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        description: data.description,
        amount: Number(data.amount),
        type: data.type,
        category: data.category,
        date: data.date,
        createdAt: new Date(data.created_at).getTime(),
        isRecurring: data.is_recurring,
        frequency: data.frequency
      };
    } else {
      await delay(300);
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      let transactions: Transaction[] = stored ? JSON.parse(stored) : [];
      
      let updatedTransaction: Transaction | null = null;
      
      transactions = transactions.map(t => {
        if (t.id === id) {
          updatedTransaction = { ...t, ...updates };
          return updatedTransaction;
        }
        return t;
      });
      
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(transactions));
      
      if (!updatedTransaction) throw new Error("Transação não encontrada");
      return updatedTransaction;
    }
  },

  async deleteTransaction(id: string): Promise<void> {
    if (isSupabaseConfigured()) {
      // 1. Validate ID
      if (!id || typeof id !== 'string') {
        console.error("[API] ID inválido para exclusão:", id);
        throw new Error("ID inválido fornecido para deletar transação.");
      }

      console.log(`[API] Enviando DELETE para transação ID: ${id}`);
      
      // 2. Execute Delete with 'exact' count
      const { error, count } = await supabase
        .from('transactions')
        .delete({ count: 'exact' })
        .eq('id', id);

      // 3. Handle Errors
      if (error) {
        console.error("[API] Erro ao deletar no Supabase:", error);
        throw new Error(error.message);
      }

      console.log(`[API] Delete processado. Linhas afetadas: ${count}`);

      // 4. Handle Silent RLS Failures (Count 0)
      if (count === null || count === 0) {
        console.warn("[API] Aviso: Nenhuma linha foi deletada. Isso indica ID inexistente ou Bloqueio RLS.");
        throw new Error("DELETE_BLOCKED_BY_RLS");
      }
      
    } else {
      await delay(300);
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      let transactions: Transaction[] = stored ? JSON.parse(stored) : [];
      const initialLength = transactions.length;
      transactions = transactions.filter(t => t.id !== id);
      
      if (transactions.length === initialLength) {
         console.warn("Tentativa de deletar item inexistente no LocalStorage");
      }
      
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(transactions));
    }
  },

  // --- BUDGETS API ---

  async fetchBudgets(): Promise<Budget[]> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('budgets')
        .select('*');

      if (error) {
         throw new Error(error.message);
      }

      return data.map((b: any) => ({
        category: b.category,
        amount: Number(b.amount)
      }));
    } else {
      await delay(300);
      const stored = localStorage.getItem(BUDGET_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    }
  },

  async upsertBudget(category: Category, amount: number): Promise<Budget> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('budgets')
        .upsert({ category, amount }, { onConflict: 'category' })
        .select()
        .single();

      if (error) throw error;
      return { category: data.category, amount: Number(data.amount) };
    } else {
      await delay(300);
      const stored = localStorage.getItem(BUDGET_STORAGE_KEY);
      let budgets: Budget[] = stored ? JSON.parse(stored) : [];
      
      const existingIndex = budgets.findIndex(b => b.category === category);
      if (existingIndex >= 0) {
        budgets[existingIndex].amount = amount;
      } else {
        budgets.push({ category, amount });
      }
      
      localStorage.setItem(BUDGET_STORAGE_KEY, JSON.stringify(budgets));
      return { category, amount };
    }
  },

  // --- CATEGORIES API ---

  async fetchCategories(): Promise<CategoryItem[]> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.from('categories').select('*');
      
      if (error) throw new Error(error.message);

      // If empty, seed defaults
      if (!data || data.length === 0) {
        const { data: seeded, error: seedError } = await supabase
          .from('categories')
          .insert(DEFAULT_CATEGORIES)
          .select();
          
        if (seedError) throw seedError;
        return seeded;
      }

      return data;
    } else {
      await delay(300);
      const stored = localStorage.getItem(CATEGORY_STORAGE_KEY);
      if (!stored) {
        // Seed local storage
        const defaults = DEFAULT_CATEGORIES.map(c => ({ ...c, id: crypto.randomUUID() }));
        localStorage.setItem(CATEGORY_STORAGE_KEY, JSON.stringify(defaults));
        return defaults as CategoryItem[];
      }
      return JSON.parse(stored);
    }
  },

  async addCategory(name: string, type: TransactionType, color: string): Promise<CategoryItem> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('categories')
        .insert([{ name, type, color }])
        .select()
        .single();
      if (error) throw error;
      return data;
    } else {
      await delay(300);
      const stored = localStorage.getItem(CATEGORY_STORAGE_KEY);
      const categories: CategoryItem[] = stored ? JSON.parse(stored) : [];
      
      const newItem: CategoryItem = {
        id: crypto.randomUUID(),
        name,
        type,
        color
      };
      
      categories.push(newItem);
      localStorage.setItem(CATEGORY_STORAGE_KEY, JSON.stringify(categories));
      return newItem;
    }
  },

  async deleteCategory(id: string): Promise<void> {
    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
    } else {
      await delay(300);
      const stored = localStorage.getItem(CATEGORY_STORAGE_KEY);
      const categories: CategoryItem[] = stored ? JSON.parse(stored) : [];
      const filtered = categories.filter(c => c.id !== id);
      localStorage.setItem(CATEGORY_STORAGE_KEY, JSON.stringify(filtered));
    }
  }
};