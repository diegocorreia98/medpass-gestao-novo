import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Eye, User, CreditCard, Clock, MapPin, Phone, Mail } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useComissoes } from "@/hooks/useComissoes";
import { useCancelamentos } from "@/hooks/useCancelamentos";
import type { BeneficiarioCompleto } from "@/types/database";

interface DetalhesAdesaoModalProps {
  open: boolean;
  onClose: () => void;
  beneficiario?: BeneficiarioCompleto;
}

export function DetalhesAdesaoModal({ open, onClose, beneficiario }: DetalhesAdesaoModalProps) {
  const { comissoes, isLoading: isLoadingComissoes } = useComissoes();
  const { getCancelamentoByBeneficiario } = useCancelamentos();
  const [cancelamento, setCancelamento] = useState<any>(null);

  useEffect(() => {
    if (beneficiario && open) {
      // Buscar cancelamento se existir
      getCancelamentoByBeneficiario(beneficiario.id)
        .then(setCancelamento)
        .catch(() => setCancelamento(null));
    }
  }, [beneficiario, open, getCancelamentoByBeneficiario]);

  if (!beneficiario) return null;

  const comissoesBeneficiario = comissoes.filter(c => c.beneficiario_id === beneficiario.id);
  const totalComissao = comissoesBeneficiario.reduce((acc, c) => acc + Number(c.valor_comissao), 0);
  const comissoesPagas = comissoesBeneficiario.filter(c => c.pago);
  const totalPago = comissoesPagas.reduce((acc, c) => acc + Number(c.valor_comissao), 0);

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

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Detalhes do Beneficiário
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Informações Pessoais */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Informações Pessoais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <span className="font-medium">Nome:</span>
                <p className="text-muted-foreground">{beneficiario.nome}</p>
              </div>
              <div>
                <span className="font-medium">CPF:</span>
                <p className="text-muted-foreground">{beneficiario.cpf}</p>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <span className="font-medium">E-mail:</span>
                <p className="text-muted-foreground">{beneficiario.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                <span className="font-medium">Telefone:</span>
                <p className="text-muted-foreground">{beneficiario.telefone || "Não informado"}</p>
              </div>
              <div>
                <span className="font-medium">Data de Nascimento:</span>
                <p className="text-muted-foreground">
                  {beneficiario.data_nascimento ? formatarData(beneficiario.data_nascimento) : "Não informado"}
                </p>
              </div>
              <div>
                <span className="font-medium">Status:</span>
                <div className="mt-1">{getStatusBadge(beneficiario.status)}</div>
              </div>
            </CardContent>
          </Card>

          {/* Endereço e Plano */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Endereço e Plano
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <span className="font-medium">Endereço:</span>
                <p className="text-muted-foreground">{beneficiario.endereco || "Não informado"}</p>
              </div>
              <div>
                <span className="font-medium">Cidade/Estado:</span>
                <p className="text-muted-foreground">
                  {beneficiario.cidade && beneficiario.estado 
                    ? `${beneficiario.cidade}/${beneficiario.estado}`
                    : "Não informado"
                  }
                </p>
              </div>
              <div>
                <span className="font-medium">CEP:</span>
                <p className="text-muted-foreground">{beneficiario.cep || "Não informado"}</p>
              </div>
              <Separator />
              <div>
                <span className="font-medium">Plano:</span>
                <p className="text-muted-foreground">{beneficiario.plano?.nome}</p>
              </div>
              <div>
                <span className="font-medium">Valor do Plano:</span>
                <p className="text-muted-foreground">{formatarMoeda(Number(beneficiario.valor_plano))}</p>
              </div>
              <div>
                <span className="font-medium">Unidade:</span>
                <p className="text-muted-foreground">{beneficiario.unidade?.nome || "Matriz"}</p>
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="border-l-2 border-muted pl-4 space-y-3">
                <div>
                  <div className="font-medium text-sm">Adesão</div>
                  <div className="text-muted-foreground text-sm">
                    {formatarData(beneficiario.data_adesao)}
                  </div>
                </div>
                
                {comissoesPagas.length > 0 && (
                  <div>
                    <div className="font-medium text-sm">Último Pagamento</div>
                    <div className="text-muted-foreground text-sm">
                      {formatarData(comissoesPagas[comissoesPagas.length - 1].data_pagamento!)}
                    </div>
                  </div>
                )}

                {cancelamento && (
                  <div>
                    <div className="font-medium text-sm text-destructive">Cancelamento</div>
                    <div className="text-muted-foreground text-sm">
                      {formatarData(cancelamento.data_cancelamento)}
                    </div>
                    <div className="text-muted-foreground text-xs">
                      Motivo: {cancelamento.motivo}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Histórico de Comissões */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Histórico de Comissões
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Total Gerado:</span>
                  <p className="text-muted-foreground">{formatarMoeda(totalComissao)}</p>
                </div>
                <div>
                  <span className="font-medium">Total Pago:</span>
                  <p className="text-muted-foreground">{formatarMoeda(totalPago)}</p>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {isLoadingComissoes ? (
                  <p className="text-muted-foreground text-sm">Carregando...</p>
                ) : comissoesBeneficiario.length > 0 ? (
                  comissoesBeneficiario.map((comissao) => (
                    <div key={comissao.id} className="flex justify-between items-center text-sm">
                      <span>{format(new Date(comissao.mes_referencia), "MM/yyyy")}</span>
                      <div className="flex items-center gap-2">
                        <span>{formatarMoeda(Number(comissao.valor_comissao))}</span>
                        <Badge variant={comissao.pago ? "default" : "secondary"} className="text-xs">
                          {comissao.pago ? "Pago" : "Pendente"}
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm">Nenhuma comissão gerada</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {beneficiario.observacoes && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Observações</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{beneficiario.observacoes}</p>
            </CardContent>
          </Card>
        )}

        <div className="flex justify-end mt-6">
          <Button onClick={onClose}>Fechar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}