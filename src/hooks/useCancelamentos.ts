
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { CancelamentoInsert } from '@/types/database';

export const useCancelamentos = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Mutation para cancelar beneficiário
  const cancelarBeneficiario = useMutation({
    mutationFn: async ({ 
      beneficiarioId, 
      motivo, 
      observacoes 
    }: { 
      beneficiarioId: string; 
      motivo: string; 
      observacoes?: string; 
    }) => {
      if (!user) throw new Error('Usuário não autenticado');

      // 1. Buscar dados do beneficiário antes de cancelar
      const { data: beneficiario, error: fetchError } = await supabase
        .from('beneficiarios')
        .select('*')
        .eq('id', beneficiarioId)
        .single();

      if (fetchError) throw fetchError;

      // 2. Inserir cancelamento no Supabase
      const cancelamentoData: CancelamentoInsert = {
        beneficiario_id: beneficiarioId,
        user_id: user.id,
        motivo,
        observacoes: observacoes || null,
      };

      const { error: cancelamentoError } = await supabase
        .from('cancelamentos')
        .insert(cancelamentoData);

      if (cancelamentoError) throw cancelamentoError;

      // 3. Atualizar status do beneficiário para inativo
      const { error: updateError } = await supabase
        .from('beneficiarios')
        .update({ status: 'inativo' })
        .eq('id', beneficiarioId);

      if (updateError) throw updateError;

      // 4. Fazer chamada para a API externa
      try {
        console.log("🔗 Iniciando chamada para API de cancelamento...");
        const { error: apiError } = await supabase.functions.invoke('notify-external-api', {
          body: {
            operation: 'cancelamento',
            data: {
              beneficiario_id: beneficiarioId,
              motivo,
              data_cancelamento: new Date().toISOString().split('T')[0],
              beneficiario: {
                codigo_externo: `BEN${beneficiario.id.slice(0, 8)}`,
                cpf: beneficiario.cpf
              }
            }
          }
        });

        if (apiError) {
          console.error("❌ Erro na API externa de cancelamento:", apiError);
          throw new Error(`Erro na API externa: ${apiError.message}`);
        }

        console.log("✅ Cancelamento sincronizado com API externa");
      } catch (apiError: any) {
        console.error("🚨 Falha na sincronização do cancelamento com API externa:", apiError);
        // Não falhar a operação completa, mas alertar o usuário
        toast({
          title: "Aviso",
          description: "Cancelamento realizado localmente, mas houve falha na sincronização com a API externa.",
          variant: "destructive",
        });
      }

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beneficiarios'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast({
        title: "Sucesso",
        description: "Beneficiário cancelado com sucesso!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao cancelar beneficiário",
        variant: "destructive",
      });
    },
  });

  // Query para buscar cancelamentos por beneficiário
  const getCancelamentoByBeneficiario = async (beneficiarioId: string) => {
    const { data, error } = await supabase
      .from('cancelamentos')
      .select('*')
      .eq('beneficiario_id', beneficiarioId)
      .maybeSingle();

    if (error) throw error;
    return data;
  };

  return {
    cancelarBeneficiario,
    getCancelamentoByBeneficiario,
    isCanceling: cancelarBeneficiario.isPending,
  };
};
