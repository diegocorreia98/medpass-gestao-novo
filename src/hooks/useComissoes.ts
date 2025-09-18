import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { 
  Comissao, 
  ComissaoCompleta,
  ComissaoFilters,
  ComissaoUpdate 
} from '@/types/database';

export const useComissoes = (filters?: ComissaoFilters) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query para buscar comissões
  const {
    data: comissoes = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['comissoes', user?.id, filters],
    queryFn: async (): Promise<ComissaoCompleta[]> => {
      console.log('[USE-COMISSOES] Executando query para user:', user?.id);
      console.log('[USE-COMISSOES] Profile type:', profile?.user_type);
      console.log('[USE-COMISSOES] Filtros aplicados:', filters);

      let query = supabase
        .from('comissoes')
        .select(`
          *,
          beneficiario:beneficiarios(*),
          unidade:unidades(*)
        `)
        .order('mes_referencia', { ascending: false });

      // 🔒 SECURITY: Sempre filtrar por user_id para usuários unidade
      if (profile?.user_type === 'unidade') {
        console.log('[SECURITY] Aplicando filtro de segurança para usuário unidade');
        query = query.eq('user_id', user?.id);
      }
      // Para usuários matriz, permitir acesso a todos os dados

      // Aplicar filtros adicionais
      if (filters?.mesReferencia) {
        query = query.eq('mes_referencia', filters.mesReferencia);
      }
      if (filters?.pago !== undefined) {
        query = query.eq('pago', filters.pago);
      }
      if (filters?.unidadeId) {
        query = query.eq('unidade_id', filters.unidadeId);
      }
      if (filters?.tipoComissao) {
        query = query.eq('tipo_comissao', filters.tipoComissao);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Query para buscar resumo de comissões
  const {
    data: resumoComissoes,
    isLoading: isLoadingResumo
  } = useQuery({
    queryKey: ['comissoes', 'resumo', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('comissoes')
        .select('valor_comissao, pago')
        .eq('user_id', user?.id);
      
      if (error) throw error;

      const total = data?.reduce((acc, c) => acc + Number(c.valor_comissao), 0) || 0;
      const pagas = data?.filter(c => c.pago).reduce((acc, c) => acc + Number(c.valor_comissao), 0) || 0;
      const pendentes = total - pagas;

      return {
        total,
        pagas,
        pendentes,
        quantidade: data?.length || 0,
        quantidadePagas: data?.filter(c => c.pago).length || 0,
        quantidadePendentes: data?.filter(c => !c.pago).length || 0,
      };
    },
    enabled: !!user,
  });

  // Mutation para marcar comissão como paga (apenas matriz)
  const marcarComoPaga = useMutation({
    mutationFn: async ({ id, dataPagamento }: { id: string; dataPagamento?: string }) => {
      if (profile?.user_type !== 'matriz') {
        throw new Error('Apenas usuários matriz podem marcar comissões como pagas');
      }

      const { data, error } = await supabase
        .from('comissoes')
        .update({ 
          pago: true,
          data_pagamento: dataPagamento || new Date().toISOString().split('T')[0]
        })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comissoes'] });
      toast({
        title: "Sucesso",
        description: "Comissão marcada como paga!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao marcar comissão como paga",
        variant: "destructive",
      });
    },
  });

  // Mutation para marcar múltiplas comissões como pagas
  const marcarMultiplasComoPagas = useMutation({
    mutationFn: async ({ ids, dataPagamento }: { ids: string[]; dataPagamento?: string }) => {
      if (profile?.user_type !== 'matriz') {
        throw new Error('Apenas usuários matriz podem marcar comissões como pagas');
      }

      const { data, error } = await supabase
        .from('comissoes')
        .update({ 
          pago: true,
          data_pagamento: dataPagamento || new Date().toISOString().split('T')[0]
        })
        .in('id', ids)
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['comissoes'] });
      toast({
        title: "Sucesso",
        description: `${data?.length || 0} comissões marcadas como pagas!`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao marcar comissões como pagas",
        variant: "destructive",
      });
    },
  });

  // Mutation para atualizar comissão
  const updateComissao = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: ComissaoUpdate }) => {
      if (profile?.user_type !== 'matriz') {
        throw new Error('Apenas usuários matriz podem atualizar comissões');
      }

      const { data, error } = await supabase
        .from('comissoes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comissoes'] });
      toast({
        title: "Sucesso",
        description: "Comissão atualizada com sucesso!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar comissão",
        variant: "destructive",
      });
    },
  });

  // Função para buscar comissões por mês
  const getComissoesPorMes = async (ano: number, mes: number) => {
    const mesReferencia = `${ano}-${mes.toString().padStart(2, '0')}-01`;
    
    const { data, error } = await supabase
      .from('comissoes')
      .select(`
        *,
        beneficiario:beneficiarios(*),
        unidade:unidades(*)
      `)
      .eq('mes_referencia', mesReferencia);
    
    if (error) throw error;
    return data || [];
  };

  return {
    comissoes,
    resumoComissoes,
    isLoading,
    isLoadingResumo,
    error,
    refetch,
    marcarComoPaga,
    marcarMultiplasComoPagas,
    updateComissao,
    getComissoesPorMes,
    isPagando: marcarComoPaga.isPending,
    isPagandoMultiplas: marcarMultiplasComoPagas.isPending,
    isUpdating: updateComissao.isPending,
    canManage: profile?.user_type === 'matriz',
  };
};