// Security indicator component to show data protection status
import { Shield, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface SecurityIndicatorProps {
  isDataMasked: boolean;
  isMatrizUser: boolean;
  className?: string;
}

export function SecurityIndicator({ isDataMasked, isMatrizUser, className }: SecurityIndicatorProps) {
  if (isMatrizUser) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="default" className={`gap-1 ${className}`}>
              <ShieldCheck className="h-3 w-3" />
              Acesso Total
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Usuário Matriz - Acesso completo aos dados sensíveis</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (isDataMasked) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="secondary" className={`gap-1 ${className}`}>
              <EyeOff className="h-3 w-3" />
              Dados Protegidos
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Dados sensíveis mascarados por segurança</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className={`gap-1 ${className}`}>
            <Eye className="h-3 w-3" />
            Seus Dados
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>Visualizando seus próprios dados</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Encryption status indicator
interface EncryptionStatusProps {
  isEncrypted: boolean;
  className?: string;
}

export function EncryptionStatus({ isEncrypted, className }: EncryptionStatusProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`inline-flex items-center gap-1 ${className}`}>
            <Shield className={`h-3 w-3 ${isEncrypted ? 'text-green-600' : 'text-amber-600'}`} />
            <span className="text-xs text-muted-foreground">
              {isEncrypted ? 'Criptografado' : 'Não Criptografado'}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {isEncrypted 
              ? 'Dados sensíveis criptografados no banco de dados'
              : 'Dados armazenados em texto simples'
            }
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}