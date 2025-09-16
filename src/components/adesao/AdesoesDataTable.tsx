import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Eye, MoreHorizontal, RefreshCw, CreditCard, Link, Copy, Send, X } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [beneficiarioSelecionado, setBeneficiarioSelecionado] = useState<BeneficiarioCompleto | undefined>();
  const [deletingBeneficiarioId, setDeletingBeneficiarioId] = useState<string | null>(null);
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
      // Format data_nascimento to DDMMYYYY
      const formatDateForRMS = (dateStr: string) => {
        if (!dateStr) return '01011990';
        const date = new Date(dateStr);
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear().toString();
        return `${day}${month}${year}`;
      };

      // Generate external code using unit name
      const generateExternalCode = (beneficiario: BeneficiarioCompleto) => {
        const unidadeName = beneficiario.unidade?.nome || 'MATRIZ';
        const beneficiarioNumbers = beneficiario.id.replace(/[^0-9]/g, '').slice(0, 6);
        // Clean unit name: remove spaces, special chars, and limit size
        const cleanUnitName = unidadeName
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, '')
          .slice(0, 8);
        return `${cleanUnitName}${beneficiarioNumbers}`.slice(0, 15);
      };

      const adesaoData = {
        id: beneficiario.id,
        nome: beneficiario.nome,
        cpf: beneficiario.cpf,
        data_nascimento: formatDateForRMS(beneficiario.data_nascimento),
        telefone: beneficiario.telefone || '11999999999',
        email: beneficiario.email,
        cep: beneficiario.cep || '01234567',
        numero_endereco: beneficiario.numero_endereco || '123',
        estado: beneficiario.estado || 'SP',
        plano_id: beneficiario.plano_id,
        id_beneficiario_tipo: beneficiario.id_beneficiario_tipo || 1,
        codigo_externo: beneficiario.codigo_externo || generateExternalCode(beneficiario)
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

  const handleExcluirAdesao = (beneficiario: BeneficiarioCompleto) => {
    setBeneficiarioSelecionado(beneficiario);
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!beneficiarioSelecionado) return;

    setDeletingBeneficiarioId(beneficiarioSelecionado.id);

    try {
      // Delete from local database first
      const { error: deleteError } = await supabase
        .from('beneficiarios')
        .delete()
        .eq('id', beneficiarioSelecionado.id);

      if (deleteError) {
        throw new Error('Erro ao excluir beneficiário do banco de dados');
      }

      // Show success message with instruction about Vindi
      if (beneficiarioSelecionado.vindi_subscription_id) {
        toast({
          title: "Adesão excluída do sistema!",
          description: `Beneficiário removido. Cancelar manualmente na Vindi a assinatura ID: ${beneficiarioSelecionado.vindi_subscription_id}`,
        });
      } else {
        toast({
          title: "Adesão excluída com sucesso!",
          description: "O beneficiário foi removido do sistema.",
        });
      }

      // Refresh the page
      window.location.reload();
    } catch (error) {
      console.error('Erro ao excluir adesão:', error);
      toast({
        title: "Erro ao excluir adesão",
        description: error.message || "Não foi possível excluir a adesão",
        variant: "destructive",
      });
    } finally {
      setDeletingBeneficiarioId(null);
      setDeleteModalOpen(false);
      setBeneficiarioSelecionado(undefined);
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
      {/* Mobile Cards */}
      <div className="block sm:hidden space-y-3">
        {beneficiarios.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <p className="text-sm text-muted-foreground">Nenhum beneficiário encontrado</p>
          </div>
        ) : (
          beneficiarios.map((beneficiario) => (
            <div key={beneficiario.id} className="bg-card border rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div className="min-w-0 flex-1">
                  <h4 className="font-medium text-sm truncate">{beneficiario.nome}</h4>
                  <p className="text-xs text-muted-foreground">{beneficiario.cpf}</p>
                </div>
                {getStatusBadge(beneficiario.status)}
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground">Plano:</span>
                  <p className="font-medium truncate">{beneficiario.plano?.nome}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Valor:</span>
                  <p className="font-medium">{formatarMoeda(Number(beneficiario.valor_plano))}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Unidade:</span>
                  <p className="font-medium truncate">{beneficiario.unidade?.nome || "Matriz"}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Adesão:</span>
                  <p className="font-medium">{formatarData(beneficiario.data_adesao)}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Status Pagamento:</span>
                  <PaymentStatusBadge status={beneficiario.payment_status || 'not_requested'} />
                </div>

                {beneficiario.checkout_link && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(beneficiario.checkout_link, '_blank')}
                      className="flex-1 h-10 touch-manipulation text-xs"
                    >
                      Abrir Checkout
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopySubscriptionLink(beneficiario)}
                      className="h-10 w-10 p-0 touch-manipulation"
                      title="Copiar link"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDetalhes(beneficiario)}
                  className="flex-1 h-10 touch-manipulation"
                >
                  <Eye className="h-4 w-4 mr-2" />
                  Ver
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-10 w-10 p-0 touch-manipulation">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
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
                          <DropdownMenuItem onClick={() => handleGeneratePaymentLink(beneficiario)}>
                            <CreditCard className="h-4 w-4 mr-2" />
                            Gerar Link Pagamento
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handleGerarAdesaoRMS(beneficiario)}>
                          <Send className="h-4 w-4 mr-2" />
                          Gerar Adesão RMS
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleExcluirAdesao(beneficiario)}
                          className="text-red-600"
                          disabled={deletingBeneficiarioId === beneficiario.id}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Excluir Adesão
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
          ))
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden sm:block border rounded-md overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">Nome</TableHead>
                <TableHead className="whitespace-nowrap">CPF</TableHead>
                <TableHead className="whitespace-nowrap">Plano</TableHead>
                <TableHead className="whitespace-nowrap">Valor</TableHead>
                <TableHead className="whitespace-nowrap">Unidade</TableHead>
                <TableHead className="whitespace-nowrap">Data Adesão</TableHead>
                <TableHead className="whitespace-nowrap">Status</TableHead>
                <TableHead className="whitespace-nowrap">Status Pagamento</TableHead>
                <TableHead className="whitespace-nowrap">Link Checkout</TableHead>
                <TableHead className="w-[120px] whitespace-nowrap">Ações</TableHead>
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
                    <TableCell className="font-medium max-w-[200px] truncate">{beneficiario.nome}</TableCell>
                    <TableCell className="whitespace-nowrap">{beneficiario.cpf}</TableCell>
                    <TableCell className="max-w-[150px] truncate">{beneficiario.plano?.nome}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatarMoeda(Number(beneficiario.valor_plano))}</TableCell>
                    <TableCell className="max-w-[120px] truncate">{beneficiario.unidade?.nome || "Matriz"}</TableCell>
                    <TableCell className="whitespace-nowrap">{formatarData(beneficiario.data_adesao)}</TableCell>
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
                            className="text-xs h-8"
                          >
                            Abrir
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopySubscriptionLink(beneficiario)}
                            className="text-xs px-2 h-8"
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDetalhes(beneficiario)}
                          className="h-8 w-8 p-0"
                          title="Ver detalhes"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
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
                                  <DropdownMenuItem onClick={() => handleGeneratePaymentLink(beneficiario)}>
                                    <CreditCard className="h-4 w-4 mr-2" />
                                    Gerar Link de Pagamento
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => handleGerarAdesaoRMS(beneficiario)}>
                                  <Send className="h-4 w-4 mr-2" />
                                  Gerar Adesão RMS
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleExcluirAdesao(beneficiario)}
                                  className="text-red-600"
                                  disabled={deletingBeneficiarioId === beneficiario.id}
                                >
                                  <X className="h-4 w-4 mr-2" />
                                  Excluir Adesão
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
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
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

      {/* Modal de Confirmação de Exclusão */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent className="mx-4 max-w-md sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">Confirmar Exclusão</DialogTitle>
            <DialogDescription className="text-sm">
              Tem certeza que deseja excluir a adesão de <strong>{beneficiarioSelecionado?.nome}</strong>?
              <br /><br />
              Esta ação irá:
              <ul className="list-disc list-inside mt-2 space-y-1 text-xs sm:text-sm">
                <li>Remover o beneficiário do sistema</li>
                {beneficiarioSelecionado?.vindi_subscription_id && (
                  <li>Informar o ID da assinatura Vindi para cancelamento manual</li>
                )}
                <li>Esta ação não pode ser desfeita</li>
              </ul>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteModalOpen(false);
                setBeneficiarioSelecionado(undefined);
              }}
              disabled={deletingBeneficiarioId !== null}
              className="h-10 touch-manipulation"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deletingBeneficiarioId !== null}
              className="h-10 touch-manipulation"
            >
              {deletingBeneficiarioId !== null ? "Excluindo..." : "Confirmar Exclusão"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}