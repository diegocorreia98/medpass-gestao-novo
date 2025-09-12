import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ColaboradorEmpresa } from './useEmpresas';

export interface ColaboradorEmpresaInsert {
  empresa_id: string;
  nome: string;
  cargo?: string;
  cpf?: string;
  telefone?: string;
  email?: string;
  data_admissao?: string;
  status?: 'ativo' | 'inativo';
  observacoes?: string;
}

export const useColaboradoresEmpresa = (empresaId?: string) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch colaboradores
  const {
    data: colaboradores = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['colaboradores-empresa', empresaId],
    queryFn: async () => {
      if (!empresaId) return [];

      const { data, error } = await supabase
        .from('colaboradores_empresa')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as ColaboradorEmpresa[];
    },
    enabled: !!empresaId,
  });

  // Create colaborador
  const createColaborador = useMutation({
    mutationFn: async (colaboradorData: ColaboradorEmpresaInsert) => {
      const { data, error } = await supabase
        .from('colaboradores_empresa')
        .insert(colaboradorData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colaboradores-empresa'] });
      toast({
        title: "Sucesso",
        description: "Colaborador adicionado com sucesso!",
      });
    },
    onError: (error) => {
      console.error('Erro ao criar colaborador:', error);
      toast({
        title: "Erro",
        description: "Erro ao adicionar colaborador.",
        variant: "destructive",
      });
    },
  });

  // Update colaborador
  const updateColaborador = useMutation({
    mutationFn: async ({ id, ...colaboradorData }: Partial<ColaboradorEmpresa> & { id: string }) => {
      const { data, error } = await supabase
        .from('colaboradores_empresa')
        .update(colaboradorData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colaboradores-empresa'] });
      toast({
        title: "Sucesso",
        description: "Colaborador atualizado com sucesso!",
      });
    },
    onError: (error) => {
      console.error('Erro ao atualizar colaborador:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar colaborador.",
        variant: "destructive",
      });
    },
  });

  // Delete colaborador
  const deleteColaborador = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('colaboradores_empresa')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['colaboradores-empresa'] });
      toast({
        title: "Sucesso",
        description: "Colaborador removido com sucesso!",
      });
    },
    onError: (error) => {
      console.error('Erro ao excluir colaborador:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover colaborador.",
        variant: "destructive",
      });
    },
  });

  return {
    colaboradores,
    isLoading,
    error,
    refetch,
    createColaborador,
    updateColaborador,
    deleteColaborador,
    isCreating: createColaborador.isPending,
    isUpdating: updateColaborador.isPending,
    isDeleting: deleteColaborador.isPending,
  };
};