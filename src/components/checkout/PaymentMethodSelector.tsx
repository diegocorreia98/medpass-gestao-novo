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
    <div className="space-y-4 sm:space-y-6">
      <h3 className="text-base sm:text-lg lg:text-xl font-semibold">Método de Pagamento</h3>

      <div className="grid gap-3 sm:gap-4">
        {filteredMethods.map((method) => {
          const Icon = method.icon;
          const isSelected = selectedMethod === method.id;

          return (
            <Card
              key={method.id}
              className={`cursor-pointer transition-all duration-200 touch-manipulation min-h-[72px] sm:min-h-[80px] ${
                isSelected
                  ? 'ring-2 ring-primary border-primary bg-primary/5 shadow-lg'
                  : 'hover:border-primary/50 hover:shadow-md active:scale-[0.98]'
              }`}
              onClick={() => onSelectMethod(method.id)}
            >
              <CardContent className="p-4 sm:p-5 lg:p-6">
                <div className="flex items-center justify-between gap-3 sm:gap-4">
                  <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
                    <div className={`p-2 sm:p-3 rounded-full transition-colors flex-shrink-0 ${
                      isSelected
                        ? 'bg-primary text-primary-foreground shadow-md'
                        : 'bg-muted hover:bg-muted/80'
                    }`}>
                      <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <h4 className="font-medium text-sm sm:text-base lg:text-lg leading-tight">
                        {method.name}
                      </h4>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1 leading-relaxed">
                        {method.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {method.badge && (
                      <div className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-primary/10 text-primary'
                      }`}>
                        {method.badge}
                      </div>
                    )}

                    {/* Radio button visual indicator */}
                    <div className={`w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      isSelected
                        ? 'border-primary bg-primary'
                        : 'border-muted-foreground'
                    }`}>
                      {isSelected && (
                        <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-primary-foreground" />
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}