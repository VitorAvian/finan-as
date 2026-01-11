import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Transaction, Budget, Category, CategoryItem, TransactionType } from '../types';

/**
 * Service Layer
 * Now supports Multi-tenancy by accepting userId
 */

const getStorageKey = (userId: string, key: string) => `finDash_${userId}_${key}`;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Default Categories to Seed (Translated)
const DEFAULT_CATEGORIES: Omit<CategoryItem, 'id' | 'userId'>[] = [
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
  
  async fetchTransactions(userId: string): Promise<Transaction[]> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId) // Filter by user
        .order('date', { ascending: false });

      if (error) {
        console.error('Supabase Error:', error);
        throw new Error(error.message);
      }
      
      return data.map((t: any) => ({
        id: t.id,
        userId: t.user_id,
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
      const stored = localStorage.getItem(getStorageKey(userId, 'transactions'));
      return stored ? JSON.parse(stored) : [];
    }
  },

  async createTransaction(userId: string, transaction: Omit<Transaction, 'id' | 'createdAt' | 'userId'>): Promise<Transaction> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('transactions')
        .insert([{
          user_id: userId, // Associate with user
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
        userId: data.user_id,
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
        userId: userId,
        createdAt: Date.now(),
        isRecurring: transaction.isRecurring || false,
        frequency: transaction.frequency
      };
      
      const key = getStorageKey(userId, 'transactions');
      const stored = localStorage.getItem(key);
      const transactions = stored ? JSON.parse(stored) : [];
      const updated = [newTransaction, ...transactions];
      localStorage.setItem(key, JSON.stringify(updated));
      
      return newTransaction;
    }
  },

  async updateTransaction(userId: string, id: string, updates: Omit<Transaction, 'id' | 'createdAt' | 'userId'>): Promise<Transaction> {
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
        .eq('user_id', userId) // Ensure ownership
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        userId: data.user_id,
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
      const key = getStorageKey(userId, 'transactions');
      const stored = localStorage.getItem(key);
      let transactions: Transaction[] = stored ? JSON.parse(stored) : [];
      
      let updatedTransaction: Transaction | null = null;
      
      transactions = transactions.map(t => {
        if (t.id === id) {
          updatedTransaction = { ...t, ...updates, userId }; // Ensure userId stays
          return updatedTransaction;
        }
        return t;
      });
      
      localStorage.setItem(key, JSON.stringify(transactions));
      
      if (!updatedTransaction) throw new Error("Transação não encontrada");
      return updatedTransaction;
    }
  },

  async deleteTransaction(userId: string, id: string): Promise<void> {
    if (isSupabaseConfigured()) {
      // 1. Validate ID
      if (!id || typeof id !== 'string') {
        throw new Error("ID inválido fornecido para deletar transação.");
      }

      // 2. Execute Delete with 'exact' count and check user ownership
      const { error, count } = await supabase
        .from('transactions')
        .delete({ count: 'exact' })
        .eq('id', id)
        .eq('user_id', userId); // Crucial for security

      // 3. Handle Errors
      if (error) throw new Error(error.message);

      // 4. Handle Silent Failures (Count 0)
      if (count === null || count === 0) {
        // Might happen if ID doesn't exist OR if RLS/UserId check failed
        // We throw the specific RLS code if likely
        console.warn("[API] Delete count 0. Item not found or RLS blocked.");
        throw new Error("DELETE_BLOCKED_BY_RLS"); 
      }
      
    } else {
      await delay(300);
      const key = getStorageKey(userId, 'transactions');
      const stored = localStorage.getItem(key);
      let transactions: Transaction[] = stored ? JSON.parse(stored) : [];
      const initialLength = transactions.length;
      transactions = transactions.filter(t => t.id !== id);
      
      localStorage.setItem(key, JSON.stringify(transactions));
    }
  },

  // --- BUDGETS API ---

  async fetchBudgets(userId: string): Promise<Budget[]> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('user_id', userId);

      if (error) {
         throw new Error(error.message);
      }

      return data.map((b: any) => ({
        id: b.id,
        userId: b.user_id,
        category: b.category,
        amount: Number(b.amount)
      }));
    } else {
      await delay(300);
      const stored = localStorage.getItem(getStorageKey(userId, 'budgets'));
      return stored ? JSON.parse(stored) : [];
    }
  },

  async upsertBudget(userId: string, category: Category, amount: number): Promise<Budget> {
    if (isSupabaseConfigured()) {
      // Note: Supabase upsert requires a unique constraint on (user_id, category)
      const { data, error } = await supabase
        .from('budgets')
        .upsert(
          { user_id: userId, category, amount }, 
          { onConflict: 'user_id,category' } // Requires SQL constraint
        )
        .select()
        .single();

      if (error) throw error;
      return { id: data.id, userId: data.user_id, category: data.category, amount: Number(data.amount) };
    } else {
      await delay(300);
      const key = getStorageKey(userId, 'budgets');
      const stored = localStorage.getItem(key);
      let budgets: Budget[] = stored ? JSON.parse(stored) : [];
      
      const existingIndex = budgets.findIndex(b => b.category === category);
      if (existingIndex >= 0) {
        budgets[existingIndex].amount = amount;
      } else {
        budgets.push({ userId, category, amount });
      }
      
      localStorage.setItem(key, JSON.stringify(budgets));
      return { userId, category, amount };
    }
  },

  // --- CATEGORIES API ---

  async fetchCategories(userId: string): Promise<CategoryItem[]> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', userId);
      
      if (error) throw new Error(error.message);

      // If empty for this user, seed defaults for THIS user
      if (!data || data.length === 0) {
        const categoriesToInsert = DEFAULT_CATEGORIES.map(c => ({
          ...c,
          user_id: userId
        }));

        const { data: seeded, error: seedError } = await supabase
          .from('categories')
          .insert(categoriesToInsert)
          .select();
          
        if (seedError) throw seedError;
        return seeded.map((c: any) => ({ ...c, userId: c.user_id }));
      }

      return data.map((c: any) => ({ ...c, userId: c.user_id }));
    } else {
      await delay(300);
      const key = getStorageKey(userId, 'categories');
      const stored = localStorage.getItem(key);
      if (!stored) {
        // Seed local storage for this user
        const defaults = DEFAULT_CATEGORIES.map(c => ({ 
          ...c, 
          id: crypto.randomUUID(),
          userId 
        }));
        localStorage.setItem(key, JSON.stringify(defaults));
        return defaults as CategoryItem[];
      }
      return JSON.parse(stored);
    }
  },

  async addCategory(userId: string, name: string, type: TransactionType, color: string): Promise<CategoryItem> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('categories')
        .insert([{ user_id: userId, name, type, color }])
        .select()
        .single();
      if (error) throw error;
      return { ...data, userId: data.user_id };
    } else {
      await delay(300);
      const key = getStorageKey(userId, 'categories');
      const stored = localStorage.getItem(key);
      const categories: CategoryItem[] = stored ? JSON.parse(stored) : [];
      
      const newItem: CategoryItem = {
        id: crypto.randomUUID(),
        userId,
        name,
        type,
        color
      };
      
      categories.push(newItem);
      localStorage.setItem(key, JSON.stringify(categories));
      return newItem;
    }
  },

  async deleteCategory(userId: string, id: string): Promise<void> {
    if (isSupabaseConfigured()) {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id)
        .eq('user_id', userId);
      if (error) throw error;
    } else {
      await delay(300);
      const key = getStorageKey(userId, 'categories');
      const stored = localStorage.getItem(key);
      const categories: CategoryItem[] = stored ? JSON.parse(stored) : [];
      const filtered = categories.filter(c => c.id !== id);
      localStorage.setItem(key, JSON.stringify(filtered));
    }
  }
};