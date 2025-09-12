import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { StatusBadge } from './StatusBadge';
import { format } from 'date-fns';

interface Transaction {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_document: string;
  plan_name: string;
  plan_price: number;
  payment_method: string;
  status: string;
  installments?: number;
  vindi_charge_id?: string;
  vindi_response?: any;
  created_at: string;
  updated_at: string;
}

interface TransactionModalProps {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransactionModal({ transaction, open, onOpenChange }: TransactionModalProps) {
  if (!transaction) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDocument = (doc: string) => {
    if (doc.length === 11) {
      return doc.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return doc.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  };

  const getPaymentMethodLabel = (method: string) => {
    const methods: Record<string, string> = {
      credit_card: 'Cartão de Crédito',
      pix: 'PIX',
      boleto: 'Boleto Bancário'
    };
    return methods[method] || method;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            Detalhes da Transação
            <StatusBadge status={transaction.status} />
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Customer Information */}
          <div>
            <h3 className="font-semibold mb-3">Dados do Cliente</h3>
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Nome:</span>
                <span className="font-medium">{transaction.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email:</span>
                <span className="font-medium">{transaction.customer_email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Documento:</span>
                <span className="font-medium">{formatDocument(transaction.customer_document)}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Plan Information */}
          <div>
            <h3 className="font-semibold mb-3">Dados do Plano</h3>
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Plano:</span>
                <span className="font-medium">{transaction.plan_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Valor:</span>
                <span className="font-bold text-lg">{formatCurrency(transaction.plan_price)}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Payment Information */}
          <div>
            <h3 className="font-semibold mb-3">Dados do Pagamento</h3>
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Método:</span>
                <span className="font-medium">{getPaymentMethodLabel(transaction.payment_method)}</span>
              </div>
              {transaction.installments && transaction.installments > 1 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Parcelas:</span>
                  <span className="font-medium">{transaction.installments}x</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status:</span>
                <StatusBadge status={transaction.status} />
              </div>
            </div>
          </div>

          <Separator />

          {/* Transaction Details */}
          <div>
            <h3 className="font-semibold mb-3">Detalhes da Transação</h3>
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">ID:</span>
                <span className="font-mono text-xs">{transaction.id}</span>
              </div>
              {transaction.vindi_charge_id && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ID Vindi:</span>
                  <span className="font-mono text-xs">{transaction.vindi_charge_id}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Criado em:</span>
                <span className="font-medium">
                  {format(new Date(transaction.created_at), "dd/MM/yyyy 'às' HH:mm")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Atualizado em:</span>
                <span className="font-medium">
                  {format(new Date(transaction.updated_at), "dd/MM/yyyy 'às' HH:mm")}
                </span>
              </div>
            </div>
          </div>

          {/* Vindi Response (if available) */}
          {transaction.vindi_response && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-3">Resposta da Vindi</h3>
                <div className="bg-muted p-3 rounded-md">
                  <pre className="text-xs overflow-x-auto">
                    {JSON.stringify(transaction.vindi_response, null, 2)}
                  </pre>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}