import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, FileText } from "lucide-react";
import { Contrato, ContractStatus } from "@/hooks/useContratos";
import { ContratoActions } from "./ContratoActions";

interface ContratosDataTableProps {
  contratos: Contrato[];
  isLoading: boolean;
  onOpenSignatureLink: (link: string | null) => void;
  onResend: (id: string) => void;
  onDownloadPdf: (documentId: string | null) => void;
  isResending?: boolean;
}

const statusConfig: Record<ContractStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  not_requested: { label: "Não Solicitado", variant: "outline" },
  pending_signature: { label: "Pendente", variant: "secondary" },
  signed: { label: "Assinado", variant: "default" },
  refused: { label: "Recusado", variant: "destructive" },
  error: { label: "Erro", variant: "destructive" },
};

export function ContratosDataTable({
  contratos,
  isLoading,
  onOpenSignatureLink,
  onResend,
  onDownloadPdf,
  isResending,
}: ContratosDataTableProps) {
  const [page, setPage] = useState(0);
  const pageSize = 10;

  const totalPages = Math.ceil(contratos.length / pageSize);
  const paginatedContratos = contratos.slice(page * pageSize, (page + 1) * pageSize);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "-";
    try {
      return format(new Date(dateString), "dd/MM/yyyy HH:mm", { locale: ptBR });
    } catch {
      return "-";
    }
  };

  const formatCPF = (cpf: string) => {
    const cleaned = cpf.replace(/\D/g, '');
    if (cleaned.length !== 11) return cpf;
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (contratos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
        <FileText className="h-12 w-12 mb-4 opacity-50" />
        <p className="text-lg font-medium">Nenhum contrato encontrado</p>
        <p className="text-sm">Não há contratos que correspondam aos filtros selecionados.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[250px]">Beneficiário</TableHead>
              <TableHead className="w-[130px]">CPF</TableHead>
              <TableHead className="w-[200px]">Plano</TableHead>
              <TableHead className="w-[120px]">Status</TableHead>
              <TableHead className="w-[150px]">Criado em</TableHead>
              <TableHead className="w-[150px]">Assinado em</TableHead>
              <TableHead className="w-[80px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedContratos.map((contrato) => {
              const status = statusConfig[contrato.contract_status] || statusConfig.not_requested;
              
              return (
                <TableRow key={contrato.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{contrato.nome}</span>
                      <span className="text-sm text-muted-foreground">{contrato.email}</span>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {formatCPF(contrato.cpf)}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">{contrato.plano_nome}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={status.variant} className={
                      contrato.contract_status === 'signed' 
                        ? 'bg-green-500/10 text-green-500 border-green-500/20' 
                        : contrato.contract_status === 'pending_signature'
                        ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20'
                        : contrato.contract_status === 'refused'
                        ? 'bg-red-500/10 text-red-500 border-red-500/20'
                        : ''
                    }>
                      {status.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(contrato.created_at)}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(contrato.contract_signed_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <ContratoActions
                      contrato={contrato}
                      onOpenSignatureLink={onOpenSignatureLink}
                      onResend={onResend}
                      onDownloadPdf={onDownloadPdf}
                      isResending={isResending}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando {page * pageSize + 1} a {Math.min((page + 1) * pageSize, contratos.length)} de {contratos.length} contratos
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage(0)}
              disabled={page === 0}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-muted-foreground px-2">
              Página {page + 1} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setPage(totalPages - 1)}
              disabled={page === totalPages - 1}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

