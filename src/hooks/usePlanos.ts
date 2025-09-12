import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Plano, PlanoInsert, PlanoUpdate } from '@/types/database';

export const usePlanos = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query para buscar planos
  const {
    data: planos = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['planos'],
    queryFn: async (): Promise<Plano[]> => {
      let query = supabase
        .from('planos')
        .select(`
          *,
          franquia:franquias(
            id,
            nome,
            descricao
          )
        `)
        .eq('ativo', true);

      // Se for unidade, filtrar apenas planos da sua franquia
      if (profile?.user_type === 'unidade') {
        // Buscar a franquia da unidade primeiro
        const { data: unidadeData } = await supabase
          .from('unidades')
          .select('franquia_id')
          .eq('user_id', user.id)
          .single();
        
        if (unidadeData?.franquia_id) {
          query = query.eq('franquia_id', unidadeData.franquia_id);
        }
      }

      const { data, error } = await query.order('valor', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Query para buscar todos os planos (incluindo inativos) - apenas para matriz
  const {
    data: todosPlanos = [],
    isLoading: isLoadingTodos,
  } = useQuery({
    queryKey: ['planos', 'todos'],
    queryFn: async (): Promise<Plano[]> => {
      const { data, error } = await supabase
        .from('planos')
        .select(`
          *,
          franquia:franquias(
            id,
            nome,
            descricao
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && profile?.user_type === 'matriz',
  });

  // Mutation para criar plano (apenas matriz)
  const createPlano = useMutation({
    mutationFn: async (plano: PlanoInsert) => {
      if (profile?.user_type !== 'matriz') {
        throw new Error('Apenas usuários matriz podem criar planos');
      }

      const { data, error } = await supabase
        .from('planos')
        .insert(plano)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planos'] });
      toast({
        title: "Sucesso",
        description: "Plano criado com sucesso!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar plano",
        variant: "destructive",
      });
    },
  });

  // Mutation para atualizar plano (apenas matriz)
  const updatePlano = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: PlanoUpdate }) => {
      if (profile?.user_type !== 'matriz') {
        throw new Error('Apenas usuários matriz podem atualizar planos');
      }

      const { data, error } = await supabase
        .from('planos')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planos'] });
      toast({
        title: "Sucesso",
        description: "Plano atualizado com sucesso!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar plano",
        variant: "destructive",
      });
    },
  });

  // Mutation para desativar plano (soft delete)
  const deactivatePlano = useMutation({
    mutationFn: async (id: string) => {
      if (profile?.user_type !== 'matriz') {
        throw new Error('Apenas usuários matriz podem desativar planos');
      }

      const { data, error } = await supabase
        .from('planos')
        .update({ ativo: false })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['planos'] });
      toast({
        title: "Sucesso",
        description: "Plano desativado com sucesso!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao desativar plano",
        variant: "destructive",
      });
    },
  });

  // Função para buscar plano por ID
  const getPlanoById = async (id: string): Promise<Plano | null> => {
    const { data, error } = await supabase
      .from('planos')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  };

  return {
    planos,
    todosPlanos: profile?.user_type === 'matriz' ? todosPlanos : planos,
    isLoading,
    isLoadingTodos,
    error,
    refetch,
    createPlano,
    updatePlano,
    deactivatePlano,
    getPlanoById,
    isCreating: createPlano.isPending,
    isUpdating: updatePlano.isPending,
    isDeactivating: deactivatePlano.isPending,
    canManage: profile?.user_type === 'matriz',
  };
};