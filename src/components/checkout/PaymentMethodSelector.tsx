import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, QrCode, FileText } from 'lucide-react';

interface PaymentMethodSelectorProps {
  selectedMethod: 'credit_card' | 'pix' | 'boleto' | null;
  onSelectMethod: (method: 'credit_card' | 'pix' | 'boleto') => void;
  hideMethod?: 'credit_card' | 'pix' | 'boleto';
}

const PAYMENT_METHODS = [
  {
    id: 'credit_card' as const,
    name: 'Cartão de Crédito',
    description: 'Aprovação imediata',
    icon: CreditCard,
    badge: 'Recomendado'
  },
  {
    id: 'pix' as const,
    name: 'PIX',
    description: 'Aprovação em até 2 minutos',
    icon: QrCode,
    badge: 'Mais rápido'
  },
  {
    id: 'boleto' as const,
    name: 'Boleto Bancário',
    description: 'Vencimento em 3 dias úteis',
    icon: FileText,
    badge: null
  }
];

export function PaymentMethodSelector({ selectedMethod, onSelectMethod, hideMethod }: PaymentMethodSelectorProps) {
  const filteredMethods = PAYMENT_METHODS.filter(method => method.id !== hideMethod);
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Método de Pagamento</h3>
      
      <div className="grid gap-3">
        {filteredMethods.map((method) => {
          const Icon = method.icon;
          const isSelected = selectedMethod === method.id;
          
          return (
            <Card
              key={method.id}
              className={`cursor-pointer transition-all duration-200 ${
                isSelected 
                  ? 'ring-2 ring-primary border-primary' 
                  : 'hover:border-primary/50'
              }`}
              onClick={() => onSelectMethod(method.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-full ${
                      isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    
                    <div>
                      <h4 className="font-medium">{method.name}</h4>
                      <p className="text-sm text-muted-foreground">{method.description}</p>
                    </div>
                  </div>
                  
                  {method.badge && (
                    <div className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full">
                      {method.badge}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}