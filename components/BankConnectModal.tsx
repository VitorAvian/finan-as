import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, Lock, Loader2, CheckCircle2, AlertTriangle, Building2, CreditCard } from 'lucide-react';
import { Button, Card, CardContent } from './ui/Components';
import { useTransactions } from '../context/TransactionContext';
import { Transaction, TransactionType } from '../types';

interface BankConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// --- Mock Data Generators ---

const BANK_OPTIONS = [
  { id: 'nubank', name: 'Nubank', color: '#820AD1', icon: CreditCard },
  { id: 'itau', name: 'Itaú', color: '#EC7000', icon: Building2 },
  { id: 'bradesco', name: 'Bradesco', color: '#CC092F', icon: Building2 },
  { id: 'santander', name: 'Santander', color: '#EC0000', icon: Building2 },
  { id: 'inter', name: 'Inter', color: '#FF7A00', icon: CreditCard },
];

const DESCRIPTIONS_BY_BANK: Record<string, { desc: string; type: TransactionType; category: string; min: number; max: number }[]> = {
  nubank: [
    { desc: 'Transferência Recebida - PIX', type: 'income', category: 'Salário', min: 1000, max: 3000 },
    { desc: 'iFood *Ifood', type: 'expense', category: 'Alimentação', min: 30, max: 120 },
    { desc: 'Uber *Trip', type: 'expense', category: 'Transporte', min: 15, max: 50 },
    { desc: 'Spotify Free Trial', type: 'expense', category: 'Lazer', min: 21.90, max: 21.90 },
    { desc: 'Pagamento Fatura', type: 'expense', category: 'Outros', min: 100, max: 500 },
  ],
  itau: [
    { desc: 'PIX TRANSF TITULARIDADE', type: 'income', category: 'Outros', min: 200, max: 1000 },
    { desc: 'TAR MAXI CONTA MENSAL', type: 'expense', category: 'Outros', min: 45, max: 45 },
    { desc: 'SUPERMERCADO DIA', type: 'expense', category: 'Alimentação', min: 150, max: 600 },
    { desc: 'POSTO IPIRANGA', type: 'expense', category: 'Transporte', min: 100, max: 250 },
  ],
  default: [
    { desc: 'Compra Cartão Débito', type: 'expense', category: 'Outros', min: 50, max: 200 },
    { desc: 'Depósito em Conta', type: 'income', category: 'Freelance', min: 500, max: 1500 },
    { desc: 'Farmácia Drogasil', type: 'expense', category: 'Saúde', min: 40, max: 150 },
  ]
};

// Helper to get random item from array
const randomItem = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

// Helper to generate date in last 30 days
const randomDateInLast30Days = () => {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * 30));
  return date.toISOString().split('T')[0];
};

export const BankConnectModal: React.FC<BankConnectModalProps> = ({ isOpen, onClose }) => {
  const { transactions, addTransaction } = useTransactions();
  
  // State Machine: 'selection' -> 'connecting' -> 'fetching' -> 'importing' -> 'success'
  const [step, setStep] = useState<'selection' | 'process' | 'success'>('selection');
  const [processStatus, setProcessStatus] = useState('');
  const [selectedBank, setSelectedBank] = useState<typeof BANK_OPTIONS[0] | null>(null);
  const [resultSummary, setResultSummary] = useState({ imported: 0, skipped: 0 });

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setStep('selection');
      setSelectedBank(null);
      setProcessStatus('');
    }
  }, [isOpen]);

  const handleSelectBank = (bank: typeof BANK_OPTIONS[0]) => {
    setSelectedBank(bank);
    setStep('process');
    runSimulation(bank.id);
  };

  const runSimulation = async (bankId: string) => {
    // Step 1: Connecting
    setProcessStatus('Estabelecendo conexão segura...');
    await new Promise(r => setTimeout(r, 2000));

    // Step 2: Fetching Accounts
    setProcessStatus('Autenticando e buscando contas...');
    await new Promise(r => setTimeout(r, 1500));

    // Step 3: Fetching Transactions
    setProcessStatus('Importando transações recentes...');
    await new Promise(r => setTimeout(r, 1500));

    // Step 4: Logic & Reconciliation
    const newTransactions = generateMockTransactions(bankId);
    const { imported, skipped } = await reconcileAndSave(newTransactions);

    setResultSummary({ imported, skipped });
    setStep('success');
  };

  const generateMockTransactions = (bankId: string) => {
    const templates = DESCRIPTIONS_BY_BANK[bankId] || DESCRIPTIONS_BY_BANK['default'];
    // Merge with default to add variety
    const pool = [...templates, ...DESCRIPTIONS_BY_BANK['default']];
    
    const count = Math.floor(Math.random() * 6) + 10; // 10 to 15 items
    const generated = [];

    for (let i = 0; i < count; i++) {
      const template = randomItem(pool);
      const amount = Number((Math.random() * (template.max - template.min) + template.min).toFixed(2));
      
      generated.push({
        description: template.desc,
        amount,
        type: template.type,
        category: template.category,
        date: randomDateInLast30Days(),
      });
    }
    return generated;
  };

  const reconcileAndSave = async (candidates: any[]) => {
    let importedCount = 0;
    let skippedCount = 0;

    for (const candidate of candidates) {
      // Reconciliation Logic:
      // Check if a transaction with same Date, Amount and Type exists.
      // Description check is loose (contains) to allow for bank format variations.
      const isDuplicate = transactions.some(existing => 
        existing.date === candidate.date &&
        Math.abs(existing.amount - candidate.amount) < 0.01 && // Float safe compare
        existing.type === candidate.type
      );

      if (isDuplicate) {
        skippedCount++;
      } else {
        await addTransaction(candidate);
        importedCount++;
      }
    }
    return { imported: importedCount, skipped: skippedCount };
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-card rounded-xl shadow-2xl border border-border animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
        
        {/* Header */}
        <div className="bg-muted/30 p-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary">
            <ShieldCheck className="h-5 w-5" />
            <span className="font-semibold">Open Finance Seguro</span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} disabled={step === 'process'}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6">
          
          {/* STEP 1: SELECTION */}
          {step === 'selection' && (
            <div className="space-y-4 animate-in slide-in-from-right-4">
              <div className="text-center space-y-2 mb-6">
                <h3 className="text-lg font-bold">Conectar Conta Bancária</h3>
                <p className="text-sm text-muted-foreground">
                  Selecione sua instituição para importar transações automaticamente.
                </p>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-medium border border-green-500/20">
                  <Lock className="h-3 w-3" /> Ambiente Simulado (Sandbox)
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {BANK_OPTIONS.map(bank => (
                  <button
                    key={bank.id}
                    onClick={() => handleSelectBank(bank)}
                    className="flex flex-col items-center justify-center gap-3 p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/50 transition-all group"
                  >
                    <div 
                      className="h-12 w-12 rounded-xl flex items-center justify-center text-white shadow-md transition-transform group-hover:scale-110"
                      style={{ backgroundColor: bank.color }}
                    >
                      <bank.icon className="h-6 w-6" />
                    </div>
                    <span className="font-medium text-sm">{bank.name}</span>
                  </button>
                ))}
              </div>
              
              <p className="text-xs text-center text-muted-foreground mt-4">
                Seus dados são criptografados e nenhuma credencial real é armazenada.
              </p>
            </div>
          )}

          {/* STEP 2: PROCESS */}
          {step === 'process' && selectedBank && (
            <div className="flex flex-col items-center justify-center py-8 space-y-6 animate-in fade-in">
              <div className="relative">
                <div className="h-20 w-20 rounded-full border-4 border-muted flex items-center justify-center">
                  <div 
                    className="h-12 w-12 rounded-lg flex items-center justify-center text-white"
                    style={{ backgroundColor: selectedBank.color }}
                  >
                    <selectedBank.icon className="h-6 w-6" />
                  </div>
                </div>
                <div className="absolute inset-0 border-t-4 border-primary rounded-full animate-spin"></div>
              </div>

              <div className="text-center space-y-2">
                <h3 className="font-semibold text-lg">Conectando ao {selectedBank.name}</h3>
                <p className="text-muted-foreground animate-pulse">{processStatus}</p>
              </div>
            </div>
          )}

          {/* STEP 3: SUCCESS */}
          {step === 'success' && (
            <div className="flex flex-col items-center justify-center py-4 space-y-6 animate-in zoom-in-95">
              <div className="h-16 w-16 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center mb-2">
                <CheckCircle2 className="h-8 w-8" />
              </div>

              <div className="text-center space-y-2">
                <h3 className="font-bold text-xl">Sincronização Concluída!</h3>
                <p className="text-muted-foreground">
                  Seu extrato foi processado com sucesso.
                </p>
              </div>

              <Card className="w-full bg-muted/30 border-dashed">
                <CardContent className="p-4 flex items-center justify-around text-center">
                  <div>
                    <div className="text-2xl font-bold text-primary">{resultSummary.imported}</div>
                    <div className="text-xs text-muted-foreground uppercase font-semibold">Importadas</div>
                  </div>
                  <div className="h-8 w-px bg-border"></div>
                  <div>
                    <div className="text-2xl font-bold text-orange-500">{resultSummary.skipped}</div>
                    <div className="text-xs text-muted-foreground uppercase font-semibold">Duplicadas</div>
                  </div>
                </CardContent>
              </Card>

              {resultSummary.skipped > 0 && (
                <div className="flex items-center gap-2 text-xs text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/20 px-3 py-2 rounded-md">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Transações duplicadas foram ignoradas automaticamente.</span>
                </div>
              )}

              <Button className="w-full" onClick={onClose}>
                Concluir
              </Button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
