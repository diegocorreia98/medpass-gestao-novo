import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export type Franquia = {
  id: string;
  nome: string;
  descricao?: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
};

export type FranquiaInsert = Omit<Franquia, 'id' | 'created_at' | 'updated_at'>;
export type FranquiaUpdate = Partial<FranquiaInsert>;

export const useFranquias = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query para buscar franquias
  const {
    data: franquias = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['franquias'],
    queryFn: async (): Promise<Franquia[]> => {
      const { data, error } = await supabase
        .from('franquias')
        .select('*')
        .eq('ativo', true)
        .order('nome', { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Query para buscar todas as franquias (incluindo inativas) - apenas para matriz
  const {
    data: todasFranquias = [],
    isLoading: isLoadingTodas,
  } = useQuery({
    queryKey: ['franquias', 'todas'],
    queryFn: async (): Promise<Franquia[]> => {
      const { data, error } = await supabase
        .from('franquias')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && profile?.user_type === 'matriz',
  });

  // Mutation para criar franquia (apenas matriz)
  const createFranquia = useMutation({
    mutationFn: async (franquia: FranquiaInsert) => {
      if (profile?.user_type !== 'matriz') {
        throw new Error('Apenas usuários matriz podem criar franquias');
      }

      const { data, error } = await supabase
        .from('franquias')
        .insert(franquia)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['franquias'] });
      toast({
        title: "Sucesso",
        description: "Franquia criada com sucesso!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar franquia",
        variant: "destructive",
      });
    },
  });

  // Mutation para atualizar franquia (apenas matriz)
  const updateFranquia = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: FranquiaUpdate }) => {
      if (profile?.user_type !== 'matriz') {
        throw new Error('Apenas usuários matriz podem atualizar franquias');
      }

      const { data, error } = await supabase
        .from('franquias')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['franquias'] });
      toast({
        title: "Sucesso",
        description: "Franquia atualizada com sucesso!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar franquia",
        variant: "destructive",
      });
    },
  });

  // Mutation para desativar franquia (soft delete)
  const deactivateFranquia = useMutation({
    mutationFn: async (id: string) => {
      if (profile?.user_type !== 'matriz') {
        throw new Error('Apenas usuários matriz podem desativar franquias');
      }

      const { data, error } = await supabase
        .from('franquias')
        .update({ ativo: false })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['franquias'] });
      toast({
        title: "Sucesso",
        description: "Franquia desativada com sucesso!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao desativar franquia",
        variant: "destructive",
      });
    },
  });

  // Função para buscar franquia por ID
  const getFranquiaById = async (id: string): Promise<Franquia | null> => {
    const { data, error } = await supabase
      .from('franquias')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  };

  return {
    franquias,
    todasFranquias: profile?.user_type === 'matriz' ? todasFranquias : franquias,
    isLoading,
    isLoadingTodas,
    error,
    refetch,
    createFranquia,
    updateFranquia,
    deactivateFranquia,
    getFranquiaById,
    isCreating: createFranquia.isPending,
    isUpdating: updateFranquia.isPending,
    isDeactivating: deactivateFranquia.isPending,
    canManage: profile?.user_type === 'matriz',
  };
};