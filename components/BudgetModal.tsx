import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Button, Input, Label, Select } from './ui/Components';
import { Category, CategoryItem } from '../types';

interface BudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (category: Category, amount: number) => void;
  categories: CategoryItem[];
}

export const BudgetModal: React.FC<BudgetModalProps> = ({ isOpen, onClose, onSave, categories }) => {
  const [category, setCategory] = useState<Category>('');
  const [amount, setAmount] = useState('');

  // Pre-select first expense category if available
  React.useEffect(() => {
    if (isOpen && !category) {
      const first = categories.find(c => c.type === 'expense');
      if (first) setCategory(first.name);
    }
  }, [isOpen, category, categories]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert("Por favor, insira um valor válido.");
      return;
    }
    
    // Fallback
    const finalCategory = category || (categories[0]?.name || 'Sem Categoria');
    
    onSave(finalCategory, parsedAmount);
    setAmount('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm bg-card rounded-lg shadow-lg border border-border animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Definir Orçamento Mensal</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="budget-category">Categoria</Label>
            <Select
              id="budget-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
            >
              {categories.filter(c => c.type === 'expense').map(cat => (
                <option key={cat.id} value={cat.name}>{cat.name}</option>
              ))}
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="budget-amount">Limite Mensal (R$)</Label>
            <Input
              id="budget-amount"
              type="number"
              placeholder="ex: 500.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="pt-2 flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit">Salvar Meta</Button>
          </div>
        </form>
      </div>
    </div>
  );
};