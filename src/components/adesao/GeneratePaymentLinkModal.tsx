import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Copy, ExternalLink, MessageCircle } from 'lucide-react';
import type { BeneficiarioCompleto } from '@/types/database';

interface GeneratePaymentLinkModalProps {
  open: boolean;
  onClose: () => void;
  beneficiario: BeneficiarioCompleto | null;
  onSuccess?: () => void;
}

export function GeneratePaymentLinkModal({ 
  open, 
  onClose, 
  beneficiario,
  onSuccess 
}: GeneratePaymentLinkModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [paymentUrl, setPaymentUrl] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const { toast } = useToast();

  const handleGenerateLink = async () => {
    if (!beneficiario) return;

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-payment-link', {
        body: { beneficiario_id: beneficiario.id }
      });

      if (error) throw error;

      if (data.error) {
        throw new Error(data.error);
      }

      setPaymentUrl(data.payment_url);
      setDueDate(data.due_date);
      
      toast({
        title: "Link de pagamento gerado!",
        description: `Link criado com vencimento em ${new Date(data.due_date).toLocaleDateString('pt-BR')}`,
      });

      onSuccess?.();
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
      await navigator.clipboard.writeText(paymentUrl);
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
    window.open(paymentUrl, '_blank');
  };

  const handleSendWhatsApp = () => {
    const message = encodeURIComponent(
      `Olá ${beneficiario?.nome}! Segue o link para pagamento da sua adesão ao plano ${beneficiario?.plano?.nome}: ${paymentUrl}`
    );
    const whatsappUrl = `https://wa.me/?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleClose = () => {
    setPaymentUrl('');
    setDueDate('');
    onClose();
  };

  if (!beneficiario) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Gerar Link de Pagamento</DialogTitle>
          <DialogDescription>
            Crie um link de pagamento para o beneficiário efetuar o pagamento de sua adesão.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">Beneficiário</Label>
            <p className="text-sm">{beneficiario.nome}</p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">Plano</Label>
            <p className="text-sm">{beneficiario.plano?.nome}</p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">Valor</Label>
            <p className="text-sm font-semibold">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              }).format(Number(beneficiario.valor_plano))}
            </p>
          </div>

          {!paymentUrl ? (
            <Button 
              onClick={handleGenerateLink} 
              disabled={isLoading}
              className="w-full"
            >
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Gerar Link de Pagamento
            </Button>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="payment-url">Link de Pagamento</Label>
                <div className="flex space-x-2">
                  <Input
                    id="payment-url"
                    value={paymentUrl}
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
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-muted-foreground">
                    Vencimento
                  </Label>
                  <p className="text-sm">
                    {new Date(dueDate).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              )}

              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  onClick={handleOpenLink}
                  className="flex-1"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Abrir
                </Button>
                <Button
                  variant="outline"
                  onClick={handleSendWhatsApp}
                  className="flex-1"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  WhatsApp
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}