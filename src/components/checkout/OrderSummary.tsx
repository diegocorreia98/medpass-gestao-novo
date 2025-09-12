import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Plan, CustomerData } from '@/types/checkout';
import { ShoppingCart, CreditCard, QrCode, FileText, User } from 'lucide-react';

interface OrderSummaryProps {
  plan: Plan;
  paymentMethod?: 'credit_card' | 'pix' | 'boleto';
  installments?: number;
  customerData?: Partial<CustomerData>;
}

const PAYMENT_METHOD_LABELS = {
  credit_card: 'Cartão de Crédito',
  pix: 'PIX',
  boleto: 'Boleto Bancário'
};

const PAYMENT_METHOD_ICONS = {
  credit_card: CreditCard,
  pix: QrCode,
  boleto: FileText
};

export function OrderSummary({ plan, paymentMethod, installments = 1, customerData }: OrderSummaryProps) {
  const subtotal = plan.price;
  const discount = 0; // Future: implement discount logic
  const total = subtotal - discount;
  
  const installmentPrice = installments > 1 ? total / installments : total;
  
  return (
    <Card className="sticky top-4">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <ShoppingCart className="w-5 h-5" />
          <span>Resumo do Pedido</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="font-medium">{plan.name}</span>
            <span className="font-medium">R$ {plan.price.toFixed(2).replace('.', ',')}</span>
          </div>
          
          {plan.description && (
            <p className="text-sm text-muted-foreground">{plan.description}</p>
          )}
          
          {plan.features && (
            <div className="space-y-1">
              <p className="text-sm font-medium">Incluso:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                {plan.features.slice(0, 3).map((feature, index) => (
                  <li key={index} className="flex items-center">
                    <span className="w-1 h-1 bg-primary rounded-full mr-2"></span>
                    {feature}
                  </li>
                ))}
                {plan.features.length > 3 && (
                  <li className="text-xs">+ {plan.features.length - 3} recursos adicionais</li>
                )}
              </ul>
            </div>
          )}
        </div>

        <Separator />

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Subtotal</span>
            <span>R$ {subtotal.toFixed(2).replace('.', ',')}</span>
          </div>
          
          {discount > 0 && (
            <div className="flex justify-between text-sm text-success">
              <span>Desconto</span>
              <span>- R$ {discount.toFixed(2).replace('.', ',')}</span>
            </div>
          )}
        </div>

        <Separator />

        <div className="flex justify-between font-semibold text-lg">
          <span>Total</span>
          <span>R$ {total.toFixed(2).replace('.', ',')}</span>
        </div>

        {paymentMethod && (
          <>
            <Separator />
            
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-sm">
                {(() => {
                  const Icon = PAYMENT_METHOD_ICONS[paymentMethod];
                  return <Icon className="w-4 h-4" />;
                })()}
                <span className="font-medium">{PAYMENT_METHOD_LABELS[paymentMethod]}</span>
              </div>
              
              {paymentMethod === 'credit_card' && installments && (
                <div className="text-sm text-muted-foreground">
                  {installments === 1 
                    ? 'À vista'
                    : `${installments}x de R$ ${installmentPrice.toFixed(2).replace('.', ',')} ${installments > 6 ? '(com juros)' : 'sem juros'}`
                  }
                </div>
              )}
              
              {paymentMethod === 'pix' && (
                <div className="text-sm text-muted-foreground">
                  Pagamento instantâneo via PIX
                </div>
              )}
              
              {paymentMethod === 'boleto' && (
                <div className="text-sm text-muted-foreground">
                  Vencimento em 3 dias úteis
                </div>
              )}
            </div>
          </>
        )}

        {customerData && (customerData.name || customerData.email) && (
          <>
            <Separator />
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-sm font-medium">
                <User className="w-4 h-4" />
                <span>Cliente</span>
              </div>
              {customerData.name && (
                <div className="text-sm text-muted-foreground">
                  {customerData.name}
                </div>
              )}
              {customerData.email && (
                <div className="text-sm text-muted-foreground">
                  {customerData.email}
                </div>
              )}
            </div>
          </>
        )}

        <div className="bg-muted/30 p-3 rounded-lg">
          <div className="flex items-center space-x-2 text-sm">
            <div className="w-2 h-2 bg-success rounded-full"></div>
            <span className="text-muted-foreground">Pagamento 100% seguro</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Seus dados são protegidos por criptografia SSL
          </p>
        </div>
      </CardContent>
    </Card>
  );
}