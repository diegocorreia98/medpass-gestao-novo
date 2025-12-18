import { MoreHorizontal, ExternalLink, RefreshCw, Download, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Contrato } from "@/hooks/useContratos";

interface ContratoActionsProps {
  contrato: Contrato;
  onOpenSignatureLink: (link: string | null) => void;
  onResend: (id: string) => void;
  onDownloadPdf: (documentId: string | null) => void;
  isResending?: boolean;
}

export function ContratoActions({
  contrato,
  onOpenSignatureLink,
  onResend,
  onDownloadPdf,
  isResending,
}: ContratoActionsProps) {
  const canResend = contrato.contract_status !== 'signed';
  const canDownload = contrato.contract_status === 'signed';
  const hasLink = !!contrato.autentique_signature_link;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Abrir menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Ações</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* Abrir Link de Assinatura */}
        <DropdownMenuItem
          onClick={() => onOpenSignatureLink(contrato.autentique_signature_link)}
          disabled={!hasLink}
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          Abrir Link de Assinatura
        </DropdownMenuItem>

        {/* Ver Documento */}
        {contrato.autentique_document_id && (
          <DropdownMenuItem
            onClick={() => window.open(`https://painel.autentique.com.br/documento/${contrato.autentique_document_id}`, '_blank')}
          >
            <Eye className="mr-2 h-4 w-4" />
            Ver no Autentique
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        {/* Reenviar Contrato */}
        <DropdownMenuItem
          onClick={() => onResend(contrato.id)}
          disabled={!canResend || isResending}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isResending ? 'animate-spin' : ''}`} />
          {isResending ? 'Reenviando...' : 'Reenviar Contrato'}
        </DropdownMenuItem>

        {/* Baixar PDF */}
        <DropdownMenuItem
          onClick={() => onDownloadPdf(contrato.autentique_document_id)}
          disabled={!canDownload}
        >
          <Download className="mr-2 h-4 w-4" />
          Baixar PDF Assinado
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

