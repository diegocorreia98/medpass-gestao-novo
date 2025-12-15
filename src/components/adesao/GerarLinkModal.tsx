import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ExternalLink, Copy, User, CreditCard, Calendar } from "lucide-react";
import type { BeneficiarioCompleto } from "@/types/database";

interface GerarLinkModalProps {
  open: boolean;
  onClose: () => void;
  beneficiarios: BeneficiarioCompleto[];
}

export function GerarLinkModal({ open, onClose, beneficiarios }: GerarLinkModalProps) {
  const [selectedBeneficiarioId, setSelectedBeneficiarioId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string>("");
  const [dueDate, setDueDate] = useState<string>("");
  const { toast } = useToast();

  // Debug: Log dos beneficiários recebidos
  console.log('[GERAR-LINK-MODAL] Total beneficiários recebidos:', beneficiarios?.length || 0);
  console.log('[GERAR-LINK-MODAL] Beneficiários:', beneficiarios);

  // Filtrar apenas beneficiários ativos que podem receber link de pagamento
  const beneficiariosElegiveis = beneficiarios?.filter(b => {
    const isActive = b.status === 'ativo';
    const canReceivePayment = !b.payment_status || 
                              b.payment_status === 'not_requested' || 
                              b.payment_status === 'failed';
    
    console.log(`[GERAR-LINK-MODAL] Beneficiário ${b.nome}: ativo=${isActive}, payment_status=${b.payment_status}, elegível=${isActive && canReceivePayment}`);
    
    return isActive && canReceivePayment;
  }) || [];

  console.log('[GERAR-LINK-MODAL] Beneficiários elegíveis:', beneficiariosElegiveis.length);

  const selectedBeneficiario = beneficiariosElegiveis.find(b => b.id === selectedBeneficiarioId);

  const handleGenerateLink = async () => {
    if (!selectedBeneficiarioId) {
      toast({
        title: "Selecione um beneficiário",
        description: "É necessário selecionar um beneficiário para gerar o link",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      console.log('🔄 [GERAR-LINK-MODAL] Chamando generate-payment-link para beneficiário:', selectedBeneficiarioId);

      const { data, error } = await supabase.functions.invoke('generate-payment-link', {
        body: { beneficiario_id: selectedBeneficiarioId }
      });

      console.log('📋 [GERAR-LINK-MODAL] Resposta da função generate-payment-link:', {
        success: !error && !data?.error,
        hasPaymentUrl: !!data?.payment_url,
        hasCheckoutUrl: !!data?.checkout_url,
        error: error?.message || data?.error,
        fullResponse: data
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      setGeneratedLink(data.checkout_url || data.payment_url);
      setDueDate(data.due_date);

      console.log('✅ [GERAR-LINK-MODAL] Link gerado com sucesso:', {
        payment_url: data.payment_url ? `${data.payment_url.substring(0, 80)}...` : null,
        checkout_url: data.checkout_url ? `${data.checkout_url.substring(0, 80)}...` : null
      });
      
      toast({
        title: "Link de pagamento gerado!",
        description: `Link criado com vencimento em ${new Date(data.due_date).toLocaleDateString('pt-BR')}`,
      });
    } catch (error: any) {
      console.error('Error generating payment link:', error);
      toast({
        title: "Erro ao gerar link",
        description: error.message || "Erro interno do servidor",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(generatedLink);
      toast({
        title: "Link copiado!",
        description: "Link de pagamento copiado para a área de transferência",
      });
    } catch (error) {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar o link",
        variant: "destructive",
      });
    }
  };

  const handleOpenLink = () => {
    window.open(generatedLink, '_blank');
  };

  const handleClose = () => {
    setSelectedBeneficiarioId("");
    setGeneratedLink("");
    setDueDate("");
    onClose();
  };

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Gerar Novo Link de Pagamento</DialogTitle>
          <DialogDescription>
            Selecione um beneficiário para gerar um novo link de pagamento.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!generatedLink ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="beneficiario">Beneficiário</Label>
                <Select value={selectedBeneficiarioId} onValueChange={setSelectedBeneficiarioId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um beneficiário" />
                  </SelectTrigger>
                  <SelectContent>
                    {beneficiariosElegiveis.length === 0 ? (
                      <SelectItem value="no-beneficiarios" disabled>
                        Nenhum beneficiário elegível encontrado
                      </SelectItem>
                    ) : (
                      beneficiariosElegiveis.map((beneficiario) => (
                        <SelectItem key={beneficiario.id} value={beneficiario.id}>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span>{beneficiario.nome}</span>
                            <span className="text-muted-foreground text-sm">
                              - {beneficiario.plano?.nome}
                            </span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {selectedBeneficiario && (
                <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Nome:</span>
                    <span>{selectedBeneficiario.nome}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Plano:</span>
                    <span>{selectedBeneficiario.plano?.nome}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">Valor:</span>
                    <span className="font-semibold text-primary">
                      {formatarMoeda(Number(selectedBeneficiario.valor_plano))}
                    </span>
                  </div>
                </div>
              )}

              <Button 
                onClick={handleGenerateLink} 
                disabled={isLoading || !selectedBeneficiarioId || beneficiariosElegiveis.length === 0}
                className="w-full"
              >
                {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Gerar Link de Pagamento
              </Button>
            </>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 text-green-800 mb-2">
                  <CreditCard className="h-4 w-4" />
                  <span className="font-medium">Link Gerado com Sucesso!</span>
                </div>
                <div className="text-sm text-green-700">
                  Link de pagamento criado para {selectedBeneficiario?.nome}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payment-url">Link de Pagamento</Label>
                <div className="flex space-x-2">
                  <Input
                    id="payment-url"
                    value={generatedLink}
                    readOnly
                    className="flex-1 text-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleCopyLink}
                    title="Copiar link"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {dueDate && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Vencimento: {new Date(dueDate).toLocaleDateString('pt-BR')}</span>
                </div>
              )}

              <Button
                variant="outline"
                onClick={handleOpenLink}
                className="w-full"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Abrir Link
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}