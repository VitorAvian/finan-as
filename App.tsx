import React, { useState } from 'react';
import { LayoutDashboard, Wallet, TrendingUp, TrendingDown, Plus, Moon, Sun, DollarSign, Loader2, Settings, RefreshCw, LogOut } from 'lucide-react';
import { TransactionProvider, useTransactions } from './context/TransactionContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, Button } from './components/ui/Components';
import { ChartsSection } from './components/ChartsSection';
import { TransactionList } from './components/TransactionList';
import { TransactionModal } from './components/TransactionModal';
import { UpcomingBills } from './components/UpcomingBills';
import { CategoryPieChart } from './components/CategoryPieChart';
import { CategoryManager } from './components/CategoryManager';
import { SubscriptionsView } from './components/SubscriptionsView';
import { ExpenseHeatmap } from './components/ExpenseHeatmap';
import { AuthPage } from './components/AuthPage';
import { Transaction } from './types';
import { isSupabaseConfigured } from './lib/supabase';

// Dashboard Content Wrapper
const DashboardContent = () => {
  const { stats, addTransaction, updateTransaction, error } = useTransactions();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenAdd = () => {
    setEditingTransaction(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (t: Transaction) => {
    setEditingTransaction(t);
    setIsModalOpen(true);
  };

  const handleSave = async (data: Omit<Transaction, 'id' | 'createdAt'>) => {
    setIsSubmitting(true);
    try {
      if (editingTransaction) {
        await updateTransaction(editingTransaction.id, data);
      } else {
        await addTransaction(data);
      }
      setIsModalOpen(false); // Only close on success
    } catch (e: any) {
      const msg = e.message || "Falha ao salvar transação.";
      alert(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Painel</h2>
        <div className="flex items-center space-x-2">
          {!isSupabaseConfigured() && (
             <span className="text-xs text-orange-500 bg-orange-100 dark:bg-orange-900/30 dark:text-orange-300 px-2 py-1 rounded">
               Modo Local (Mock)
             </span>
          )}
          <Button onClick={handleOpenAdd}>
            <Plus className="mr-2 h-4 w-4" /> Nova Transação
          </Button>
        </div>
      </div>
      
      {/* Error Rendering Logic */}
      {error && (
        typeof error === 'string' ? (
           <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
             {error}
           </div>
        ) : (
           <>{error}</>
        )
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo Total</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {stats.totalBalance.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Fundos disponíveis</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receitas</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              +R$ {stats.totalIncome.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Total recebido</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Despesas</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600 dark:text-red-400">
              -R$ {stats.totalExpenses.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Total gasto</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Economia Líquida</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {(stats.totalIncome - stats.totalExpenses).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Receitas menos Despesas</p>
          </CardContent>
        </Card>
      </div>

      {/* Expense Heatmap */}
      <ExpenseHeatmap />

      {/* Charts & Widgets */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-4 lg:col-span-5">
           <ChartsSection /> 
        </div>
        <div className="col-span-4 lg:col-span-2 space-y-4">
           <CategoryPieChart />
           <UpcomingBills />
        </div>
      </div>

      {/* Recent Transactions */}
      <TransactionList onEdit={handleOpenEdit} />

      {/* Modal */}
      <TransactionModal 
        isOpen={isModalOpen} 
        onClose={() => !isSubmitting && setIsModalOpen(false)} 
        onSave={handleSave}
        initialData={editingTransaction}
      />
    </div>
  );
};

interface NavbarProps {
  toggleTheme: () => void;
  isDark: boolean;
  onOpenSettings: () => void;
  currentView: string;
  onChangeView: (view: string) => void;
}

const Navbar = ({ toggleTheme, isDark, onOpenSettings, currentView, onChangeView }: NavbarProps) => {
  const { signOut, user } = useAuth();
  
  return (
    <div className="border-b border-border bg-card sticky top-0 z-10">
      <div className="flex h-16 items-center px-4 md:px-8">
        <div className="flex items-center gap-2 font-bold text-xl text-primary cursor-pointer" onClick={() => onChangeView('dashboard')}>
          <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
            <LayoutDashboard className="h-5 w-5" />
          </div>
          FinDash
        </div>

        {/* Navigation Links */}
        <div className="ml-8 hidden md:flex items-center space-x-4">
          <Button 
            variant={currentView === 'dashboard' ? 'default' : 'ghost'} 
            size="sm"
            onClick={() => onChangeView('dashboard')}
          >
            Painel
          </Button>
          <Button 
            variant={currentView === 'subscriptions' ? 'default' : 'ghost'} 
            size="sm"
            onClick={() => onChangeView('subscriptions')}
          >
            <RefreshCw className="h-3 w-3 mr-2" />
            Assinaturas
          </Button>
        </div>

        <div className="ml-auto flex items-center space-x-2 md:space-x-4">
          {/* Mobile Nav Icons */}
          <div className="md:hidden flex">
              <Button variant="ghost" size="icon" onClick={() => onChangeView(currentView === 'dashboard' ? 'subscriptions' : 'dashboard')}>
                {currentView === 'dashboard' ? <RefreshCw className="h-5 w-5" /> : <LayoutDashboard className="h-5 w-5" />}
              </Button>
          </div>

          <Button variant="ghost" size="sm" onClick={onOpenSettings}>
            <Settings className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">Categorias</span>
          </Button>
          <Button variant="ghost" size="icon" onClick={toggleTheme}>
            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
          
          <div className="h-6 w-px bg-border mx-2" />
          
          <Button variant="ghost" size="icon" onClick={signOut} title="Sair">
             <LogOut className="h-5 w-5 text-destructive" />
          </Button>
        </div>
      </div>
    </div>
  );
};

const AuthenticatedApp = () => {
  const [isDark, setIsDark] = useState(true);
  const [isCategoryManagerOpen, setCategoryManagerOpen] = useState(false);
  const [currentView, setCurrentView] = useState('dashboard');
  const { user, loading } = useAuth();

  const toggleTheme = () => {
    const html = document.documentElement;
    if (isDark) {
      html.classList.remove('dark');
    } else {
      html.classList.add('dark');
    }
    setIsDark(!isDark);
  };

  // 1. Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  // 2. Unauthenticated State
  if (!user) {
    return (
      <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
        <div className="absolute top-4 right-4 z-50">
           <Button variant="ghost" size="icon" onClick={toggleTheme}>
            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
        </div>
        <AuthPage />
      </div>
    );
  }

  // 3. Authenticated State
  const MainContent = () => {
    const { isLoading } = useTransactions();

    if (isLoading) {
     return (
       <div className="flex h-[calc(100vh-64px)] w-full items-center justify-center">
         <Loader2 className="h-8 w-8 animate-spin text-primary" />
         <span className="ml-2 text-lg text-muted-foreground">Carregando...</span>
       </div>
     );
   }

   return (
     <main className="flex-1 p-4 md:p-8 pt-6">
       {currentView === 'dashboard' ? <DashboardContent /> : <SubscriptionsView />}
     </main>
   );
 };

  return (
    <TransactionProvider>
      <div className="min-h-screen bg-background text-foreground font-sans transition-colors duration-300 flex flex-col">
        <Navbar 
          toggleTheme={toggleTheme} 
          isDark={isDark} 
          onOpenSettings={() => setCategoryManagerOpen(true)}
          currentView={currentView}
          onChangeView={setCurrentView}
        />
        <MainContent />
        <CategoryManager isOpen={isCategoryManagerOpen} onClose={() => setCategoryManagerOpen(false)} />
      </div>
    </TransactionProvider>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  );
}
