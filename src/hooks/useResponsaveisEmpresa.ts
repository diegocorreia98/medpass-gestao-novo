import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ResponsavelEmpresa } from './useEmpresas';

export interface ResponsavelEmpresaInsert {
  empresa_id: string;
  nome: string;
  cargo?: string;
  tipo_responsabilidade: 'financeiro' | 'juridico' | 'geral' | 'outros';
  telefone?: string;
  email?: string;
  observacoes?: string;
}

export const useResponsaveisEmpresa = (empresaId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch responsáveis
  const {
    data: responsaveis = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['responsaveis-empresa', empresaId],
    queryFn: async () => {
      if (!empresaId) return [];

      const { data, error } = await supabase
        .from('responsaveis_empresa')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ResponsavelEmpresa[];
    },
    enabled: !!empresaId,
  });

  // Create responsável
  const createResponsavel = useMutation({
    mutationFn: async (responsavelData: ResponsavelEmpresaInsert) => {
      const { data, error } = await supabase
        .from('responsaveis_empresa')
        .insert(responsavelData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['responsaveis-empresa'] });
      toast({
        title: "Sucesso",
        description: "Responsável adicionado com sucesso!",
      });
    },
    onError: (error) => {
      console.error('Erro ao criar responsável:', error);
      toast({
        title: "Erro",
        description: "Erro ao adicionar responsável.",
        variant: "destructive",
      });
    },
  });

  // Update responsável
  const updateResponsavel = useMutation({
    mutationFn: async ({ id, ...responsavelData }: Partial<ResponsavelEmpresa> & { id: string }) => {
      const { data, error } = await supabase
        .from('responsaveis_empresa')
        .update(responsavelData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['responsaveis-empresa'] });
      toast({
        title: "Sucesso",
        description: "Responsável atualizado com sucesso!",
      });
    },
    onError: (error) => {
      console.error('Erro ao atualizar responsável:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar responsável.",
        variant: "destructive",
      });
    },
  });

  // Delete responsável
  const deleteResponsavel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('responsaveis_empresa')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['responsaveis-empresa'] });
      toast({
        title: "Sucesso",
        description: "Responsável removido com sucesso!",
      });
    },
    onError: (error) => {
      console.error('Erro ao excluir responsável:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover responsável.",
        variant: "destructive",
      });
    },
  });

  return {
    responsaveis,
    isLoading,
    error,
    refetch,
    createResponsavel,
    updateResponsavel,
    deleteResponsavel,
    isCreating: createResponsavel.isPending,
    isUpdating: updateResponsavel.isPending,
    isDeleting: deleteResponsavel.isPending,
  };
};