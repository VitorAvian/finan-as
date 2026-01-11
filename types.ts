
export type TransactionType = 'income' | 'expense';

// Category is now just a string, as it is dynamic
export type Category = string;

export interface CategoryItem {
  id: string;
  name: string;
  color: string;
  type: TransactionType;
  userId?: string; // Added for multi-tenancy
}

export interface Transaction {
  id: string;
  userId?: string; // Added for multi-tenancy
  description: string;
  amount: number;
  type: TransactionType;
  category: Category;
  date: string; // ISO String YYYY-MM-DD
  createdAt: number;
  isRecurring?: boolean;
  frequency?: 'weekly' | 'monthly';
}

export interface Budget {
  id?: string; // Added id for consistency
  userId?: string; // Added for multi-tenancy
  category: Category;
  amount: number;
}

export interface SummaryStats {
  totalBalance: number;
  totalIncome: number;
  totalExpenses: number;
}

export interface ChartDataPoint {
  name: string;
  income: number;
  expense: number;
}

export interface CategoryDataPoint {
  name: string;
  value: number;
}