import React, { useState, useMemo } from 'react';
import { Edit2, Trash2, Download, List, Calendar as CalendarIcon, Loader2, Landmark } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, Button, Input, Select, Label } from './ui/Components';
import { useTransactions } from '../context/TransactionContext';
import { Transaction } from '../types';
import { TransactionCalendar } from './TransactionCalendar';
import { BankConnectModal } from './BankConnectModal';

interface TransactionListProps {
  onEdit: (t: Transaction) => void;
}

type ViewMode = 'list' | 'calendar';

export const TransactionList: React.FC<TransactionListProps> = ({ onEdit }) => {
  const { transactions, deleteTransaction, categories } = useTransactions();
  
  // Local state for tracking which transaction is being deleted
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // View State
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);

  // State for List filters
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Helper to format date safely
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  };

  // Filter Logic (Only applies to List view)
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const matchesCategory = categoryFilter === 'All' || t.category === categoryFilter;
      const matchesStart = !startDate || t.date >= startDate;
      const matchesEnd = !endDate || t.date <= endDate;
      return matchesCategory && matchesStart && matchesEnd;
    });
  }, [transactions, categoryFilter, startDate, endDate]);

  // Export to CSV Logic
  const handleExportCSV = () => {
    if (transactions.length === 0) {
      alert("Nenhuma transação para exportar.");
      return;
    }

    const dataToExport = viewMode === 'list' ? filteredTransactions : transactions;

    const headers = ["Data", "Descrição", "Categoria", "Tipo", "Valor"];
    const csvContent = [
      headers.join(","),
      ...dataToExport.map(t => {
        const safeDesc = `"${t.description.replace(/"/g, '""')}"`;
        const amount = t.type === 'expense' ? -t.amount : t.amount;
        return [t.date, safeDesc, t.category, t.type, amount].join(",");
      })
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `transacoes_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleEditClick = (e: React.MouseEvent, t: Transaction) => {
    e.preventDefault();
    e.stopPropagation();
    onEdit(t);
  };

  const handleDeleteClick = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    const safeId = id ? id.trim() : '';
    if (!safeId) return;

    if (window.confirm('Tem certeza que deseja deletar esta transação?')) {
        try {
            setDeletingId(safeId);
            await deleteTransaction(safeId);
        } catch (err) {
            // Error is handled in context
            console.error("Erro no clique de deletar:", err);
        } finally {
            // If the row unmounts due to optimistic update, this might run on unmounted component
            // but React handles this gracefully in newer versions or just ignores it.
            setDeletingId(null);
        }
    }
  };

  return (
    <>
      <Card className="col-span-4">
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <CardTitle>Histórico de Transações</CardTitle>
              
              {/* View Toggle */}
              <div className="flex items-center rounded-lg bg-muted p-1">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`flex items-center gap-1 rounded-md px-3 py-1 text-xs font-medium transition-all ${
                    viewMode === 'list' 
                      ? 'bg-background text-foreground shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <List className="h-3.5 w-3.5" />
                  Lista
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('calendar')}
                  className={`flex items-center gap-1 rounded-md px-3 py-1 text-xs font-medium transition-all ${
                    viewMode === 'calendar' 
                      ? 'bg-background text-foreground shadow-sm' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <CalendarIcon className="h-3.5 w-3.5" />
                  Calendário
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsBankModalOpen(true)}>
                <Landmark className="mr-2 h-4 w-4 text-primary" />
                Conectar Conta
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <Download className="mr-2 h-4 w-4" />
                Exportar CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          
          {viewMode === 'list' ? (
            <>
              {/* Filters Section */}
              <div className="grid gap-4 md:grid-cols-4 rounded-lg bg-muted/40 p-4 border border-border">
                <div className="space-y-1">
                  <Label htmlFor="filter-category" className="text-xs">Categoria</Label>
                  <Select 
                    id="filter-category"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="h-8"
                  >
                    <option value="All">Todas</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="filter-start" className="text-xs">Data Inicial</Label>
                  <Input 
                    id="filter-start"
                    type="date" 
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="filter-end" className="text-xs">Data Final</Label>
                  <Input 
                    id="filter-end"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="h-8"
                  />
                </div>
                <div className="flex items-end pb-0.5">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setCategoryFilter('All');
                      setStartDate('');
                      setEndDate('');
                    }}
                  >
                    Limpar Filtros
                  </Button>
                </div>
              </div>

              {/* Table Section */}
              {filteredTransactions.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground border rounded-md border-dashed">
                  {transactions.length === 0 
                    ? "Nenhuma transação encontrada. Adicione uma para começar!" 
                    : "Nenhuma transação corresponde aos filtros."}
                </div>
              ) : (
                <div className="overflow-x-auto rounded-md border border-border">
                  <table className="w-full caption-bottom text-sm text-left">
                    <thead className="bg-muted/50 [&_tr]:border-b [&_tr]:border-border">
                      <tr className="border-b transition-colors">
                        <th className="h-10 px-4 align-middle font-medium text-muted-foreground">Data</th>
                        <th className="h-10 px-4 align-middle font-medium text-muted-foreground">Descrição</th>
                        <th className="h-10 px-4 align-middle font-medium text-muted-foreground">Categoria</th>
                        <th className="h-10 px-4 align-middle font-medium text-muted-foreground text-right">Valor</th>
                        <th className="h-10 px-4 align-middle font-medium text-muted-foreground text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0">
                      {filteredTransactions.map((t) => (
                        <tr key={t.id} className="border-b border-border transition-colors hover:bg-muted/50 group">
                          <td className="p-4 align-middle">{formatDate(t.date)}</td>
                          <td className="p-4 align-middle font-medium">{t.description}</td>
                          <td className="p-4 align-middle">
                            <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold text-foreground">
                              {t.category}
                            </span>
                          </td>
                          <td className={`p-4 align-middle text-right font-bold ${
                            t.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                          }`}>
                            {t.type === 'income' ? '+' : '-'}R${t.amount.toFixed(2)}
                          </td>
                          <td className="p-4 align-middle text-right">
                            <div className="flex justify-end gap-2">
                              <Button 
                                type="button"
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0"
                                onClick={(e) => handleEditClick(e, t)}
                              >
                                <Edit2 className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                              </Button>
                              <Button 
                                type="button"
                                variant="ghost" 
                                size="sm" 
                                className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                disabled={deletingId === t.id}
                                onClick={(e) => handleDeleteClick(e, t.id)}
                              >
                                {deletingId === t.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : (
            <TransactionCalendar onEdit={onEdit} />
          )}
        </CardContent>
      </Card>

      <BankConnectModal 
        isOpen={isBankModalOpen} 
        onClose={() => setIsBankModalOpen(false)} 
      />
    </>
  );
};
