// Component to show data security status and migration alerts
import { AlertTriangle, Shield, CheckCircle, Eye } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface DataSecurityAlertProps {
  hasSecureData: boolean;
  hasMaskedData: boolean;
  isMatrizUser: boolean;
  totalAuditLogs?: number;
  onViewAuditLogs?: () => void;
}

export function DataSecurityAlert({ 
  hasSecureData, 
  hasMaskedData, 
  isMatrizUser, 
  totalAuditLogs = 0,
  onViewAuditLogs 
}: DataSecurityAlertProps) {
  
  if (hasSecureData && isMatrizUser) {
    return (
      <Alert className="border-green-200 bg-green-50 dark:bg-green-950">
        <Shield className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-800 dark:text-green-200">
          Sistema de Segurança Ativo
        </AlertTitle>
        <AlertDescription className="text-green-700 dark:text-green-300">
          <div className="flex items-center justify-between">
            <div>
              Dados criptografados e protegidos. Acesso total autorizado para usuário Matriz.
              {totalAuditLogs > 0 && (
                <span className="ml-2">
                  {totalAuditLogs} eventos de auditoria registrados.
                </span>
              )}
            </div>
            {onViewAuditLogs && totalAuditLogs > 0 && (
              <Button variant="outline" size="sm" onClick={onViewAuditLogs}>
                <Eye className="h-3 w-3 mr-1" />
                Ver Logs
              </Button>
            )}
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  if (hasSecureData && hasMaskedData) {
    return (
      <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950">
        <Eye className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-800 dark:text-amber-200">
          Dados Protegidos
        </AlertTitle>
        <AlertDescription className="text-amber-700 dark:text-amber-300">
          Informações sensíveis de outros usuários foram mascaradas para sua proteção. 
          Você pode visualizar completamente apenas seus próprios dados.
        </AlertDescription>
      </Alert>
    );
  }

  if (hasSecureData) {
    return (
      <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950">
        <CheckCircle className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-800 dark:text-blue-200">
          Seus Dados Seguros
        </AlertTitle>
        <AlertDescription className="text-blue-700 dark:text-blue-300">
          Sistema de segurança ativo. Seus dados estão criptografados e protegidos.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert className="border-red-200 bg-red-50 dark:bg-red-950">
      <AlertTriangle className="h-4 w-4 text-red-600" />
      <AlertTitle className="text-red-800 dark:text-red-200">
        Sistema Legado Detectado
      </AlertTitle>
      <AlertDescription className="text-red-700 dark:text-red-300">
        Esta seção ainda utiliza métodos de acesso não seguros. 
        Entre em contato com o administrador para atualização de segurança.
      </AlertDescription>
    </Alert>
  );
}

// Simple badge component for security status
export function SecurityBadge({ isSecure, isEncrypted }: { isSecure: boolean; isEncrypted?: boolean }) {
  if (isSecure && isEncrypted) {
    return (
      <Badge variant="default" className="gap-1">
        <Shield className="h-3 w-3" />
        Criptografado
      </Badge>
    );
  }
  
  if (isSecure) {
    return (
      <Badge variant="secondary" className="gap-1">
        <CheckCircle className="h-3 w-3" />
        Seguro
      </Badge>
    );
  }
  
  return (
    <Badge variant="destructive" className="gap-1">
      <AlertTriangle className="h-3 w-3" />
      Não Seguro
    </Badge>
  );
}