import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";

interface ApiStatusIndicatorProps {
  status: 'idle' | 'loading' | 'success' | 'error' | 'partial';
  message?: string;
  showDetails?: boolean;
}

export const ApiStatusIndicator = ({ status, message, showDetails = true }: ApiStatusIndicatorProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (status !== 'idle') {
      setIsVisible(true);
      
      // Auto-hide after 10 seconds for success/error
      if (status === 'success' || status === 'error' || status === 'partial') {
        const timer = setTimeout(() => setIsVisible(false), 10000);
        return () => clearTimeout(timer);
      }
    }
  }, [status]);

  if (!isVisible || status === 'idle') return null;

  const getStatusConfig = () => {
    switch (status) {
      case 'loading':
        return {
          icon: Clock,
          variant: 'secondary' as const,
          color: 'text-muted-foreground',
          bgColor: 'bg-muted',
          title: 'Processando...',
          description: 'Salvando dados e sincronizando com API externa'
        };
      case 'success':
        return {
          icon: CheckCircle,
          variant: 'default' as const,
          color: 'text-green-600',
          bgColor: 'bg-green-50 border-green-200',
          title: 'Sucesso!',
          description: 'Beneficiário criado e sincronizado com API externa'
        };
      case 'error':
        return {
          icon: XCircle,
          variant: 'destructive' as const,
          color: 'text-destructive',
          bgColor: 'bg-destructive/10 border-destructive/20',
          title: 'Erro',
          description: message || 'Falha ao processar operação'
        };
      case 'partial':
        return {
          icon: AlertCircle,
          variant: 'secondary' as const,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50 border-yellow-200',
          title: 'Parcialmente concluído',
          description: 'Beneficiário criado localmente, mas falha na sincronização com API externa'
        };
      default:
        return {
          icon: Clock,
          variant: 'secondary' as const,
          color: 'text-muted-foreground',
          bgColor: 'bg-muted',
          title: 'Aguardando...',
          description: ''
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div className={`fixed top-4 right-4 z-50 max-w-sm p-4 rounded-lg border shadow-lg ${config.bgColor} transition-all duration-300 ease-in-out`}>
      <div className="flex items-start gap-3">
        <Icon className={`h-5 w-5 ${config.color} mt-0.5 flex-shrink-0`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-sm">{config.title}</h4>
            <Badge variant={config.variant} className="text-xs">
              API Status
            </Badge>
          </div>
          {showDetails && config.description && (
            <p className="text-xs text-muted-foreground leading-relaxed">
              {config.description}
            </p>
          )}
          {message && status === 'error' && (
            <p className="text-xs text-destructive mt-1 font-mono">
              {message}
            </p>
          )}
        </div>
        <button 
          onClick={() => setIsVisible(false)}
          className="text-muted-foreground hover:text-foreground text-xs ml-2"
        >
          ✕
        </button>
      </div>
    </div>
  );
};