import React from 'react';
import { Badge } from '@/components/ui/badge';

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const getStatusConfig = (status: string) => {
    const normalizedStatus = status.toLowerCase();
    
    switch (normalizedStatus) {
      case 'paid':
      case 'pago':
      case 'aprovado':
        return { variant: 'default' as const, label: 'Pago', className: 'bg-success text-success-foreground' };
      case 'pending':
      case 'pendente':
        return { variant: 'secondary' as const, label: 'Pendente', className: 'bg-warning text-warning-foreground' };
      case 'failed':
      case 'falharam':
      case 'rejeitado':
        return { variant: 'destructive' as const, label: 'Falhou', className: '' };
      case 'cancelled':
      case 'cancelado':
        return { variant: 'outline' as const, label: 'Cancelado', className: '' };
      default:
        return { variant: 'outline' as const, label: status, className: '' };
    }
  };

  const config = getStatusConfig(status);
  
  return (
    <Badge variant={config.variant} className={config.className}>
      {config.label}
    </Badge>
  );
}