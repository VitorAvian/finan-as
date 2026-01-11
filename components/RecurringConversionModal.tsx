import React, { useState, useMemo } from 'react';
import { X, RefreshCw, ArrowRight } from 'lucide-react';
import { Button, Select, Label } from './ui/Components';
import { useTransactions } from '../context/TransactionContext';
import { Transaction } from '../types';

interface RecurringConversionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RecurringConversionModal: React.FC<RecurringConversionModalProps> = ({ isOpen, onClose }) => {
  const { transactions, updateTransaction } = useTransactions();
  const [selectedTxId, setSelectedTxId] = useState<string>('');
  const [frequency, setFrequency] = useState<'weekly' | 'monthly'>('monthly');

  // Identify potential subscriptions: Non-recurring expenses, grouped by description unique
  const candidates = useMemo(() => {
    const nonRecurring = transactions.filter(t => t.type === 'expense' && !t.isRecurring);
    
    // Deduplicate by description to show unique candidates (e.g. "Netflix" appearing 5 times)
    const uniqueMap = new Map<string, Transaction>();
    nonRecurring.forEach(t => {
      if (!uniqueMap.has(t.description)) {
        uniqueMap.set(t.description, t);
      }
    });

    return Array.from(uniqueMap.values()).slice(0, 10); // Show top 10 candidates
  }, [transactions]);

  const handleConvert = async () => {
    if (!selectedTxId) return;
    
    const tx = transactions.find(t => t.id === selectedTxId);
    if (!tx) return;

    // We update the specific transaction chosen to be the "source" of the subscription
    // In a real app, we might update ALL transactions with this name, but for now we update the latest one
    await updateTransaction(selectedTxId, {
      description: tx.description,
      amount: tx.amount,
      type: tx.type,
      category: tx.category,
      date: tx.date,
      isRecurring: true,
      frequency: frequency
    });
    
    setSelectedTxId('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-card rounded-lg shadow-lg border border-border animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            Converter em Assinatura
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-muted-foreground">
            Selecione uma transação recente para marcar como assinatura recorrente.
          </p>

          <div className="space-y-2">
            <Label>Transação</Label>
            <Select 
              value={selectedTxId} 
              onChange={(e) => setSelectedTxId(e.target.value)}
            >
              <option value="">Selecione uma transação...</option>
              {candidates.map(t => (
                <option key={t.id} value={t.id}>
                  {t.description} (R${t.amount}) - {t.date}
                </option>
              ))}
            </Select>
          </div>

          {selectedTxId && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-1">
              <Label>Frequência</Label>
              <Select 
                value={frequency} 
                onChange={(e) => setFrequency(e.target.value as 'weekly' | 'monthly')}
              >
                <option value="monthly">Mensal</option>
                <option value="weekly">Semanal</option>
              </Select>
            </div>
          )}

          <div className="pt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button disabled={!selectedTxId} onClick={handleConvert}>
              Converter
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};