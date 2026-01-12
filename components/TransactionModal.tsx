import React, { useState, useEffect } from 'react';
import { X, Trash2, Loader2, Zap } from 'lucide-react';
import { Button, Input, Label, Select, Checkbox } from './ui/Components';
import { Transaction, Category, TransactionType } from '../types';
import { useTransactions } from '../context/TransactionContext';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Transaction, 'id' | 'createdAt'>) => void;
  initialData?: Transaction | null;
}

// --- Smart Categorization Hook ---
const useSmartCategory = (transactions: Transaction[]) => {
  const predict = (description: string) => {
    if (!description || description.length < 3) return null;
    
    const lowerDesc = description.toLowerCase();
    
    // Find the most recent transaction that includes the description text
    // Assuming transactions are sorted by date desc in context
    const match = transactions.find(t => 
      t.description.toLowerCase().includes(lowerDesc)
    );

    if (match) {
      return { category: match.category, type: match.type };
    }
    return null;
  };

  return predict;
};

export const TransactionModal: React.FC<TransactionModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const { categories, transactions, deleteTransaction } = useTransactions();
  const predictCategory = useSmartCategory(transactions);

  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>('expense');
  const [category, setCategory] = useState<Category>('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState<'weekly' | 'monthly'>('monthly');
  
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAutoFilled, setIsAutoFilled] = useState(false);

  // Filter categories based on selected type
  const availableCategories = categories.filter(c => c.type === type);

  useEffect(() => {
    if (initialData) {
      setDescription(initialData.description);
      setAmount(initialData.amount.toString());
      setType(initialData.type);
      setCategory(initialData.category);
      setDate(initialData.date);
      setIsRecurring(!!initialData.isRecurring);
      setFrequency(initialData.frequency || 'monthly');
      setIsAutoFilled(false);
    } else {
      resetForm();
    }
  }, [initialData, isOpen]);

  // When type changes, ensure valid category is selected
  // But ONLY if not auto-filled recently or if current category is invalid for new type
  useEffect(() => {
    if (isOpen && !initialData) {
       // Check if current category belongs to new type
       const isValid = categories.find(c => c.name === category && c.type === type);
       
       if (!isValid) {
         const firstMatch = categories.find(c => c.type === type);
         if (firstMatch) {
            setCategory(firstMatch.name);
            // If we had to switch category because of type change, likely auto-fill is invalid
            setIsAutoFilled(false); 
         }
       }
    }
  }, [type, isOpen, categories, initialData]);

  const resetForm = () => {
    setDescription('');
    setAmount('');
    setType('expense');
    const defaultExp = categories.find(c => c.type === 'expense');
    setCategory(defaultExp ? defaultExp.name : '');
    setDate(new Date().toISOString().split('T')[0]);
    setIsRecurring(false);
    setFrequency('monthly');
    setIsAutoFilled(false);
  };

  const handleDescriptionBlur = () => {
    // Only auto-categorize if adding new transaction
    if (initialData || !description) return;

    const prediction = predictCategory(description);
    
    if (prediction) {
      // Apply prediction
      setType(prediction.type);
      setCategory(prediction.category);
      setIsAutoFilled(true);
    }
  };

  const handleManualCategoryChange = (newCategory: Category) => {
    setCategory(newCategory);
    setIsAutoFilled(false); // Remove "Suggested" badge if user manually overrides
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const parsedAmount = parseFloat(amount);
    if (!description || isNaN(parsedAmount) || parsedAmount <= 0) {
      alert("Por favor insira uma descrição válida e um valor positivo.");
      return;
    }
    
    // Fallback if category is empty
    const finalCategory = category || (availableCategories[0]?.name || 'Sem Categoria');

    onSave({
      description,
      amount: parsedAmount,
      type,
      category: finalCategory,
      date,
      isRecurring,
      frequency: isRecurring ? frequency : undefined,
    });
    
    if (!initialData) resetForm();
  };

  const handleDelete = async () => {
    if (!initialData) return;
    
    if (confirm('Tem certeza que deseja deletar permanentemente esta transação?')) {
        setIsDeleting(true);
        try {
            const success = await deleteTransaction(initialData.id);
            if (success) {
               onClose(); 
            } else {
               setIsDeleting(false);
            }
        } catch (error) {
            console.error("Erro ao deletar no modal:", error);
            setIsDeleting(false);
        }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-card rounded-lg shadow-lg border border-border animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">
            {initialData ? 'Editar Transação' : 'Nova Transação'}
          </h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="type">Tipo de Transação</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={type === 'income' ? 'default' : 'outline'}
                onClick={() => { setType('income'); setIsAutoFilled(false); }}
                className={type === 'income' ? 'bg-green-600 hover:bg-green-700 text-white' : ''}
              >
                Receita
              </Button>
              <Button
                type="button"
                variant={type === 'expense' ? 'default' : 'outline'}
                onClick={() => { setType('expense'); setIsAutoFilled(false); }}
                className={type === 'expense' ? 'bg-red-600 hover:bg-red-700 text-white' : ''}
              >
                Despesa
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Valor (R$)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="0.00"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Input
              id="description"
              placeholder="ex: Compras do mês"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={handleDescriptionBlur}
              required
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="category">Categoria</Label>
              {isAutoFilled && (
                <span className="text-xs text-yellow-600 dark:text-yellow-400 flex items-center gap-1 animate-in fade-in bg-yellow-100 dark:bg-yellow-900/30 px-2 py-0.5 rounded-full">
                  <Zap className="h-3 w-3 fill-yellow-600 dark:fill-yellow-400" /> Sugerido
                </span>
              )}
            </div>
            <Select
              id="category"
              value={category}
              onChange={(e) => handleManualCategoryChange(e.target.value as Category)}
            >
               {availableCategories.length > 0 ? availableCategories.map(cat => (
                 <option key={cat.id} value={cat.name}>{cat.name}</option>
               )) : <option value="">Sem categorias disponíveis</option>}
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Data</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <Checkbox 
              id="recurring" 
              checked={isRecurring} 
              onCheckedChange={setIsRecurring} 
            />
            <Label htmlFor="recurring" className="cursor-pointer">
              Transação Recorrente?
            </Label>
          </div>

          {isRecurring && (
            <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
              <Label htmlFor="frequency">Frequência</Label>
              <Select
                id="frequency"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as 'weekly' | 'monthly')}
              >
                <option value="weekly">Semanal</option>
                <option value="monthly">Mensal</option>
              </Select>
            </div>
          )}

          <div className="pt-4 flex items-center justify-between">
             {/* Delete Button (Only in Edit Mode) */}
             {initialData ? (
                <Button 
                    type="button" 
                    variant="ghost" 
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={handleDelete}
                    disabled={isDeleting}
                >
                    {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
                    Deletar
                </Button>
             ) : (
                <div></div> // Spacer
             )}

             <div className="flex space-x-2">
                <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
                <Button type="submit">Salvar</Button>
             </div>
          </div>
        </form>
      </div>
    </div>
  );
};