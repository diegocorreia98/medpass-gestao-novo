import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Eye, MoreHorizontal, RefreshCw, CreditCard, Link, Copy } from "lucide-react";
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
  const [generatingLinks, setGeneratingLinks] = useState<Set<string>>(new Set()); // Track loading per beneficiario
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

  const canGeneratePaymentLink = (beneficiario: BeneficiarioCompleto) => {
    return beneficiario.status === 'ativo' && 
           (!beneficiario.payment_status || 
            beneficiario.payment_status === 'not_requested' || 
            beneficiario.payment_status === 'failed');
  };

  // ✅ NOVA: Gerar link direto via API Vindi (sem modal)
  const handleGenerateVindiLink = async (beneficiario: BeneficiarioCompleto) => {
    const beneficiarioId = beneficiario.id;
    setGeneratingLinks(prev => new Set([...prev, beneficiarioId]));
    
    try {
      console.log('🔗 [VINDI-LINK] Gerando link para:', beneficiario.nome);
      
      const { data, error } = await supabase.functions.invoke('generate-payment-link-v2', {
        body: { 
          beneficiario_id: beneficiarioId,
          payment_method: 'bank_slip' // Gera boleto/PIX
        }
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      console.log('✅ [VINDI-LINK] Link gerado:', data);
      
      // Copiar link automaticamente
      let linkToCopy = '';
      let linkType = '';
      
      if (data.checkout_url) {
        linkToCopy = data.checkout_url;
        linkType = 'Checkout';
      } else if (data.payment_url) {
        linkToCopy = data.payment_url;
        linkType = 'Vindi';
      }
      
      if (linkToCopy) {
        await navigator.clipboard.writeText(linkToCopy);
        toast({
          title: `Link ${linkType} gerado! 🔗`,
          description: `Link copiado para área de transferência. ${data.due_date ? `Vencimento: ${new Date(data.due_date).toLocaleDateString('pt-BR')}` : ''}`,
          action: (
            <Button
              size="sm"
              onClick={() => window.open(linkToCopy, '_blank')}
            >
              Abrir Link
            </Button>
          )
        });
      } else {
        throw new Error('Nenhum link foi gerado na resposta');
      }
      
    } catch (error: any) {
      console.error('❌ [VINDI-LINK] Erro:', error);
      toast({
        title: "Erro ao gerar link Vindi",
        description: error.message || "Erro interno do servidor",
        variant: "destructive",
      });
    } finally {
      setGeneratingLinks(prev => {
        const newSet = new Set(prev);
        newSet.delete(beneficiarioId);
        return newSet;
      });
    }
  };

  const isGeneratingLink = (beneficiarioId: string) => generatingLinks.has(beneficiarioId);

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
                                  title="Gerar Link de Pagamento (Modal)"
                                >
                                  <CreditCard className="h-4 w-4" />
                                </Button>
                                {/* ✅ NOVO: Botão direto para gerar link via Vindi */}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleGenerateVindiLink(beneficiario)}
                                  disabled={isGeneratingLink(beneficiario.id)}
                                  className="h-8 w-8 text-blue-600 hover:text-blue-700"
                                  title="Gerar Link Vindi (Direto)"
                                >
                                  {isGeneratingLink(beneficiario.id) ? (
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Link className="h-4 w-4" />
                                  )}
                                </Button>
                              </>
                            )}
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
                                      Gerar Link (Modal)
                                    </DropdownMenuItem>
                                    {/* ✅ NOVO: Botão direto Vindi no mobile */}
                                    <DropdownMenuItem 
                                      onClick={() => handleGenerateVindiLink(beneficiario)}
                                      disabled={isGeneratingLink(beneficiario.id)}
                                      className="text-blue-600"
                                    >
                                      {isGeneratingLink(beneficiario.id) ? (
                                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                      ) : (
                                        <Link className="h-4 w-4 mr-2" />
                                      )}
                                      Gerar Link Vindi
                                    </DropdownMenuItem>
                                  </>
                                )}
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