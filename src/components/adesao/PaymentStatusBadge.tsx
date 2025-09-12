import React from 'react';
import { Badge } from '@/components/ui/badge';

interface PaymentStatusBadgeProps {
  status: string;
}

export function PaymentStatusBadge({ status }: PaymentStatusBadgeProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'paid':
        return { 
          variant: 'default' as const, 
          label: '✅ Pago', 
          className: 'bg-success text-success-foreground' 
        };
      case 'payment_requested':
        return { 
          variant: 'secondary' as const, 
          label: '🟡 Link Gerado', 
          className: 'bg-warning text-warning-foreground' 
        };
      case 'processing':
        return { 
          variant: 'default' as const, 
          label: '🔵 Processando', 
          className: 'bg-primary text-primary-foreground' 
        };
      case 'failed':
        return { 
          variant: 'destructive' as const, 
          label: '❌ Falhou', 
          className: '' 
        };
      case 'not_requested':
      default:
        return { 
          variant: 'outline' as const, 
          label: '⚪ Não Solicitado', 
          className: 'text-muted-foreground' 
        };
    }
  };

  const config = getStatusConfig(status);
  
  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  );
}