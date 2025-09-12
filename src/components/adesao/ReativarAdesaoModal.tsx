
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RefreshCw, User, CreditCard, MapPin, Calendar, Edit } from "lucide-react";
import { EditarAdesaoModal } from "./EditarAdesaoModal";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useBeneficiarios } from "@/hooks/useBeneficiarios";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { BeneficiarioCompleto } from "@/types/database";

interface ReativarAdesaoModalProps {
  open: boolean;
  onClose: () => void;
  beneficiario?: BeneficiarioCompleto;
}

export function ReativarAdesaoModal({ open, onClose, beneficiario }: ReativarAdesaoModalProps) {
  const [isReactivating, setIsReactivating] = useState(false);
  const [editarModalOpen, setEditarModalOpen] = useState(false);
  const { updateBeneficiario } = useBeneficiarios();
  const { toast } = useToast();

  const handleReativar = async () => {
    if (!beneficiario) return;

    setIsReactivating(true);
    
    try {
      // 1. Chamar a API externa de adesão com os dados existentes
      // Formatação correta da data de nascimento (DDMMYYYY)
      const formatarDataParaApi = (data: string) => {
        if (!data) return '';
        const date = new Date(data);
        const dia = String(date.getDate()).padStart(2, '0');
        const mes = String(date.getMonth() + 1).padStart(2, '0');
        const ano = date.getFullYear();
        return `${dia}${mes}${ano}`;
      };

      const { data: apiResult, error: apiError } = await supabase.functions.invoke('notify-external-api', {
        body: {
          operation: 'adesao',
          data: {
            id: beneficiario.id,
            nome: beneficiario.nome,
            cpf: beneficiario.cpf,
            data_nascimento: formatarDataParaApi(beneficiario.data_nascimento),
            telefone: beneficiario.telefone,
            email: beneficiario.email,
            cep: beneficiario.cep,
            numero_endereco: beneficiario.endereco?.split(',').pop()?.trim() || '',
            estado: beneficiario.estado,
            plano_id: beneficiario.plano_id,
            id_beneficiario_tipo: 1, // Padrão para titular
            codigo_externo: `BEN${beneficiario.id.slice(0, 8)}`
          }
        }
      });

      if (apiError) {
        throw new Error(`Erro na API externa: ${apiError.message}`);
      }

      if (!apiResult.success) {
        throw new Error(apiResult.error || 'Erro na reativação via API externa');
      }

      // 2. Atualizar o status do beneficiário no banco de dados
      await updateBeneficiario.mutateAsync({
        id: beneficiario.id,
        updates: {
          status: 'ativo'
        }
      });

      toast({
        title: "Sucesso",
        description: "Beneficiário reativado com sucesso!",
      });

      onClose();
    } catch (error: any) {
      console.error('Erro na reativação:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao reativar beneficiário",
        variant: "destructive",
      });
    } finally {
      setIsReactivating(false);
    }
  };

  const formatarData = (data: string) => {
    return format(new Date(data), "dd/MM/yyyy", { locale: ptBR });
  };

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  if (!beneficiario) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-green-600" />
            Reativar Beneficiário
          </DialogTitle>
          <DialogDescription>
            Confirme a reativação do beneficiário. Esta ação irá enviar os dados novamente para a API externa e alterar o status para ativo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Status atual */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <span className="font-medium">Status atual:</span>
            <Badge variant="destructive">Inativo</Badge>
          </div>

          {/* Dados do beneficiário */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">Dados Pessoais</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Nome:</span>
                <p className="font-medium">{beneficiario.nome}</p>
              </div>
              <div>
                <span className="text-muted-foreground">CPF:</span>
                <p className="font-medium">{beneficiario.cpf}</p>
              </div>
              <div>
                <span className="text-muted-foreground">E-mail:</span>
                <p className="font-medium">{beneficiario.email || "Não informado"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Telefone:</span>
                <p className="font-medium">{beneficiario.telefone || "Não informado"}</p>
              </div>
            </div>

            <Separator />

            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">Plano</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Plano:</span>
                <p className="font-medium">{beneficiario.plano?.nome}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Valor:</span>
                <p className="font-medium">{formatarMoeda(Number(beneficiario.valor_plano))}</p>
              </div>
            </div>

            <Separator />

            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">Localização</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Cidade:</span>
                <p className="font-medium">{beneficiario.cidade || "Não informado"}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Estado:</span>
                <p className="font-medium">{beneficiario.estado || "Não informado"}</p>
              </div>
            </div>

            <Separator />

            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">Data de Adesão Original</span>
            </div>
            
            <div className="text-sm">
              <span className="text-muted-foreground">Adesão:</span>
              <p className="font-medium">{formatarData(beneficiario.data_adesao)}</p>
            </div>
          </div>

          {/* Aviso importante */}
          <div className="p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              <strong>Atenção:</strong> A reativação irá enviar os dados deste beneficiário novamente para a API externa 
              e alterar o status para "Ativo". Verifique se todos os dados estão corretos antes de prosseguir.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isReactivating}
          >
            Cancelar
          </Button>
          <Button
            variant="secondary"
            onClick={() => setEditarModalOpen(true)}
            disabled={isReactivating}
            className="mr-auto"
          >
            <Edit className="h-4 w-4 mr-2" />
            Editar Dados
          </Button>
          <Button
            onClick={handleReativar}
            disabled={isReactivating}
            className="bg-green-600 hover:bg-green-700"
          >
            {isReactivating ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Reativando...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Confirmar Reativação
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>

      <EditarAdesaoModal
        open={editarModalOpen}
        onClose={() => setEditarModalOpen(false)}
        beneficiario={beneficiario}
      />
    </Dialog>
  );
}
