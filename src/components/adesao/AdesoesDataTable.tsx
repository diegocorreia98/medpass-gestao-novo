import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Eye, MoreHorizontal, RefreshCw, CreditCard, Link, Copy, Send } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { EditarAdesaoModal } from "./EditarAdesaoModal";
import { CancelarAdesaoModal } from "./CancelarAdesaoModal";
import { DetalhesAdesaoModal } from "./DetalhesAdesaoModal";
import { ReativarAdesaoModal } from "./ReativarAdesaoModal";
import { GeneratePaymentLinkModal } from "./GeneratePaymentLinkModal";
import { PaymentStatusBadge } from "./PaymentStatusBadge";
import { usePaymentStatus } from "@/hooks/usePaymentStatus";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { BeneficiarioCompleto } from "@/types/database";

interface AdesoesDataTableProps {
  beneficiarios: BeneficiarioCompleto[];
  isLoading: boolean;
}

export function AdesoesDataTable({ beneficiarios, isLoading }: AdesoesDataTableProps) {
  const [editarModalOpen, setEditarModalOpen] = useState(false);
  const [cancelarModalOpen, setCancelarModalOpen] = useState(false);
  const [detalhesModalOpen, setDetalhesModalOpen] = useState(false);
  const [reativarModalOpen, setReativarModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [beneficiarioSelecionado, setBeneficiarioSelecionado] = useState<BeneficiarioCompleto | undefined>();
  const { refreshPaymentStatuses } = usePaymentStatus();
  const { toast } = useToast();

  const formatarData = (data: string) => {
    return format(new Date(data), "dd/MM/yyyy", { locale: ptBR });
  };

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      ativo: "default",
      inativo: "destructive",
      pendente: "secondary"
    } as const;
    
    return (
      <Badge variant={variants[status as keyof typeof variants] || "secondary"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const handleEditar = (beneficiario: BeneficiarioCompleto) => {
    setBeneficiarioSelecionado(beneficiario);
    setEditarModalOpen(true);
  };

  const handleCancelar = (beneficiario: BeneficiarioCompleto) => {
    setBeneficiarioSelecionado(beneficiario);
    setCancelarModalOpen(true);
  };

  const handleDetalhes = (beneficiario: BeneficiarioCompleto) => {
    setBeneficiarioSelecionado(beneficiario);
    setDetalhesModalOpen(true);
  };

  const handleReativar = (beneficiario: BeneficiarioCompleto) => {
    setBeneficiarioSelecionado(beneficiario);
    setReativarModalOpen(true);
  };

  const handleGeneratePaymentLink = (beneficiario: BeneficiarioCompleto) => {
    setBeneficiarioSelecionado(beneficiario);
    setPaymentModalOpen(true);
  };

  const handleGerarAdesaoRMS = async (beneficiario: BeneficiarioCompleto) => {
    try {
      const adesaoData = {
        id: beneficiario.id,
        nome: beneficiario.nome,
        cpf: beneficiario.cpf,
        data_nascimento: beneficiario.data_nascimento,
        telefone: beneficiario.telefone || '11999999999',
        email: beneficiario.email,
        cep: beneficiario.cep || '01234567',
        numero_endereco: beneficiario.numero_endereco || '123',
        estado: beneficiario.estado || 'SP',
        plano_id: beneficiario.plano_id,
        id_beneficiario_tipo: beneficiario.id_beneficiario_tipo || 1,
        codigo_externo: beneficiario.codigo_externo || `UNIDADE_${beneficiario.unidade?.nome || 'MATRIZ'}_${beneficiario.id}`
      };

      const { data, error } = await supabase.functions.invoke('notify-external-api', {
        body: {
          operation: 'adesao',
          data: adesaoData
        }
      });

      if (error) {
        throw error;
      }

      if (data?.success) {
        toast({
          title: "Adesão RMS gerada com sucesso!",
          description: "O beneficiário foi registrado na RMS.",
        });
      } else {
        throw new Error(data?.error || 'Erro desconhecido ao gerar adesão');
      }
    } catch (error) {
      console.error('Erro ao gerar adesão RMS:', error);
      toast({
        title: "Erro ao gerar adesão",
        description: error.message || "Não foi possível gerar a adesão na RMS",
        variant: "destructive",
      });
    }
  };

  const canGeneratePaymentLink = (beneficiario: BeneficiarioCompleto) => {
    return beneficiario.status === 'ativo' && 
           (!beneficiario.payment_status || 
            beneficiario.payment_status === 'not_requested' || 
            beneficiario.payment_status === 'failed');
  };


  // ✅ NOVA: Função para copiar link do subscription-checkout
  const handleCopySubscriptionLink = async (beneficiario: BeneficiarioCompleto) => {
    if (!beneficiario.checkout_link) return;

    try {
      await navigator.clipboard.writeText(beneficiario.checkout_link);
      toast({
        title: "Link copiado! 📋",
        description: `Link do subscription-checkout copiado para área de transferência`,
      });
    } catch (error) {
      console.error('Erro ao copiar link:', error);
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar o link",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 bg-muted animate-pulse rounded" />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>CPF</TableHead>
              <TableHead>Plano</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Unidade</TableHead>
              <TableHead>Data Adesão</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Status Pagamento</TableHead>
              <TableHead>Link Checkout</TableHead>
              <TableHead className="w-[120px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {beneficiarios.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                  Nenhum beneficiário encontrado
                </TableCell>
              </TableRow>
            ) : (
              beneficiarios.map((beneficiario) => (
                <TableRow key={beneficiario.id}>
                  <TableCell className="font-medium">{beneficiario.nome}</TableCell>
                  <TableCell>{beneficiario.cpf}</TableCell>
                  <TableCell>{beneficiario.plano?.nome}</TableCell>
                  <TableCell>{formatarMoeda(Number(beneficiario.valor_plano))}</TableCell>
                  <TableCell>{beneficiario.unidade?.nome || "Matriz"}</TableCell>
                  <TableCell>{formatarData(beneficiario.data_adesao)}</TableCell>
                  <TableCell>{getStatusBadge(beneficiario.status)}</TableCell>
                  <TableCell>
                    <PaymentStatusBadge status={beneficiario.payment_status || 'not_requested'} />
                  </TableCell>
                  <TableCell>
                    {beneficiario.checkout_link ? (
                      <div className="flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(beneficiario.checkout_link, '_blank')}
                          className="text-xs"
                        >
                          Abrir
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopySubscriptionLink(beneficiario)}
                          className="text-xs px-2"
                          title="Copiar link do subscription-checkout"
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {/* Desktop: Botões individuais */}
                      <div className="hidden md:flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDetalhes(beneficiario)}
                          className="h-8 w-8"
                          title="Ver detalhes"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        
                        {beneficiario.status === 'ativo' && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditar(beneficiario)}
                              className="h-8 w-8"
                              title="Editar"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleCancelar(beneficiario)}
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              title="Cancelar"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            {canGeneratePaymentLink(beneficiario) && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleGeneratePaymentLink(beneficiario)}
                                  className="h-8 w-8 text-primary hover:text-primary"
                                  title="Gerar Link de Pagamento"
                                >
                                  <CreditCard className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleGerarAdesaoRMS(beneficiario)}
                              className="h-8 w-8 text-blue-600 hover:text-blue-700"
                              title="Gerar Adesão RMS"
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        
                        {beneficiario.status === 'inativo' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleReativar(beneficiario)}
                            className="h-8 w-8 text-green-600 hover:text-green-700"
                            title="Reativar"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        )}
                      </div>

                      {/* Mobile: Dropdown menu */}
                      <div className="md:hidden">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleDetalhes(beneficiario)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Ver Detalhes
                            </DropdownMenuItem>
                            
                            {beneficiario.status === 'ativo' && (
                              <>
                                <DropdownMenuItem onClick={() => handleEditar(beneficiario)}>
                                  <Edit className="h-4 w-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleCancelar(beneficiario)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Cancelar
                                </DropdownMenuItem>
                                {canGeneratePaymentLink(beneficiario) && (
                                  <>
                                    <DropdownMenuItem onClick={() => handleGeneratePaymentLink(beneficiario)}>
                                      <CreditCard className="h-4 w-4 mr-2" />
                                      Gerar Link de Pagamento
                                    </DropdownMenuItem>
                                  </>
                                )}
                                <DropdownMenuItem onClick={() => handleGerarAdesaoRMS(beneficiario)}>
                                  <Send className="h-4 w-4 mr-2" />
                                  Gerar Adesão RMS
                                </DropdownMenuItem>
                              </>
                            )}
                            
                            {beneficiario.status === 'inativo' && (
                              <DropdownMenuItem 
                                onClick={() => handleReativar(beneficiario)}
                                className="text-green-600"
                              >
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Reativar
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Modais */}
      <EditarAdesaoModal
        open={editarModalOpen}
        onClose={() => {
          setEditarModalOpen(false);
          setBeneficiarioSelecionado(undefined);
        }}
        beneficiario={beneficiarioSelecionado}
      />

      <CancelarAdesaoModal
        open={cancelarModalOpen}
        onClose={() => {
          setCancelarModalOpen(false);
          setBeneficiarioSelecionado(undefined);
        }}
        beneficiario={beneficiarioSelecionado}
      />

      <DetalhesAdesaoModal
        open={detalhesModalOpen}
        onClose={() => {
          setDetalhesModalOpen(false);
          setBeneficiarioSelecionado(undefined);
        }}
        beneficiario={beneficiarioSelecionado}
      />

      <ReativarAdesaoModal
        open={reativarModalOpen}
        onClose={() => {
          setReativarModalOpen(false);
          setBeneficiarioSelecionado(undefined);
        }}
        beneficiario={beneficiarioSelecionado}
      />

      <GeneratePaymentLinkModal 
        open={paymentModalOpen} 
        onClose={() => {
          setPaymentModalOpen(false);
          setBeneficiarioSelecionado(undefined);
        }}
        beneficiario={beneficiarioSelecionado}
        onSuccess={() => {
          refreshPaymentStatuses();
          // Refresh the beneficiarios list to get updated payment status
          // This would be handled by the parent component
        }}
      />
    </>
  );
}