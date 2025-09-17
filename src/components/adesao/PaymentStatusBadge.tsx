import React from 'react';
import { Badge } from '@/components/ui/badge';

interface PaymentStatusBadgeProps {
  status: string;
}

export function PaymentStatusBadge({ status }: PaymentStatusBadgeProps) {
  const getStatusConfig = (status: string) => {
    const normalizedStatus = status?.toLowerCase() || '';

    switch (normalizedStatus) {
      case 'paid':
      case 'pago':
      case 'aprovado':
        return {
          variant: 'default' as const,
          label: 'Pago',
          className: 'bg-success text-success-foreground'
        };
      case 'pending':
      case 'pendente':
        return {
          variant: 'secondary' as const,
          label: 'Pendente',
          className: 'bg-warning text-warning-foreground'
        };
      case 'failed':
      case 'falharam':
      case 'rejeitado':
        return {
          variant: 'destructive' as const,
          label: 'Falhou',
          className: ''
        };
      case 'cancelled':
      case 'cancelado':
        return {
          variant: 'outline' as const,
          label: 'Cancelado',
          className: 'text-muted-foreground'
        };
      case 'payment_requested':
      case 'solicitado':
        return {
          variant: 'secondary' as const,
          label: 'Link Gerado',
          className: 'bg-warning text-warning-foreground'
        };
      case 'processing':
      case 'processando':
        return {
          variant: 'default' as const,
          label: 'Processando',
          className: 'bg-primary text-primary-foreground'
        };
      case 'not_requested':
      case 'nao_solicitado':
      default:
        return {
          variant: 'outline' as const,
          label: 'Não Solicitado',
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