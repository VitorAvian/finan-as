import React, { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { Button, Input, Label, Select } from './ui/Components';
import { useTransactions } from '../context/TransactionContext';
import { TransactionType } from '../types';

interface CategoryManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CategoryManager: React.FC<CategoryManagerProps> = ({ isOpen, onClose }) => {
  const { categories, addCategory, deleteCategory } = useTransactions();
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<TransactionType>('expense');
  const [newColor, setNewColor] = useState('#6366f1');

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    await addCategory(newName, newType, newColor);
    setNewName('');
    // Randomize color for next one
    setNewColor(`#${Math.floor(Math.random()*16777215).toString(16)}`);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Deletar categoria "${name}"? As transações existentes manterão o texto da categoria, mas ela não aparecerá nas listas.`)) {
      deleteCategory(id);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-card rounded-lg shadow-lg border border-border animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-lg font-semibold text-foreground">Gerenciar Categorias</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Add New Form */}
          <form onSubmit={handleAdd} className="p-4 bg-muted/40 rounded-lg border border-border space-y-4">
            <h3 className="font-medium text-sm">Adicionar Nova Categoria</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cat-name">Nome</Label>
                <Input 
                  id="cat-name" 
                  value={newName} 
                  onChange={(e) => setNewName(e.target.value)} 
                  placeholder="ex: Academia" 
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cat-type">Tipo</Label>
                <Select 
                  id="cat-type" 
                  value={newType} 
                  onChange={(e) => setNewType(e.target.value as TransactionType)}
                >
                  <option value="expense">Despesa</option>
                  <option value="income">Receita</option>
                </Select>
              </div>
              <div className="space-y-2">
                 <Label htmlFor="cat-color">Cor</Label>
                 <div className="flex gap-2">
                   <Input 
                      id="cat-color" 
                      type="color" 
                      value={newColor} 
                      onChange={(e) => setNewColor(e.target.value)}
                      className="w-12 p-1 h-9 cursor-pointer"
                   />
                   <Input 
                      value={newColor} 
                      onChange={(e) => setNewColor(e.target.value)}
                      placeholder="#000000"
                   />
                 </div>
              </div>
              <div className="flex items-end">
                <Button type="submit" className="w-full">
                  <Plus className="h-4 w-4 mr-2" /> Adicionar
                </Button>
              </div>
            </div>
          </form>

          {/* List Categories */}
          <div className="space-y-2">
            <h3 className="font-medium text-sm">Categorias Existentes</h3>
            <div className="grid grid-cols-1 gap-2">
              {categories.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between p-3 rounded-md border border-border bg-card">
                  <div className="flex items-center gap-3">
                    <div 
                      className="h-4 w-4 rounded-full" 
                      style={{ backgroundColor: cat.color }} 
                    />
                    <span className="font-medium">{cat.name}</span>
                    <span className="text-xs text-muted-foreground capitalize">
                      ({cat.type === 'expense' ? 'Despesa' : 'Receita'})
                    </span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => handleDelete(cat.id, cat.name)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {categories.length === 0 && (
                <p className="text-sm text-muted-foreground text-center">Nenhuma categoria encontrada.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};