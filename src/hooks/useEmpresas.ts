import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

// Types
export interface Empresa {
  id: string;
  user_id: string;
  unidade_id?: string;
  razao_social: string;
  nome_fantasia?: string;
  cnpj: string;
  inscricao_estadual?: string;
  inscricao_municipal?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  telefone?: string;
  email?: string;
  website?: string;
  observacoes?: string;
  status: 'ativo' | 'inativo';
  created_at: string;
  updated_at: string;
}

export interface ResponsavelEmpresa {
  id: string;
  empresa_id: string;
  nome: string;
  cargo?: string;
  tipo_responsabilidade: 'financeiro' | 'juridico' | 'geral' | 'outros';
  telefone?: string;
  email?: string;
  observacoes?: string;
  created_at: string;
  updated_at: string;
}

export interface ColaboradorEmpresa {
  id: string;
  empresa_id: string;
  nome: string;
  cargo?: string;
  cpf?: string;
  telefone?: string;
  email?: string;
  data_admissao?: string;
  status: 'ativo' | 'inativo';
  observacoes?: string;
  created_at: string;
  updated_at: string;
}

export interface EmpresaInsert {
  unidade_id?: string;
  razao_social: string;
  nome_fantasia?: string;
  cnpj: string;
  inscricao_estadual?: string;
  inscricao_municipal?: string;
  endereco?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  telefone?: string;
  email?: string;
  website?: string;
  observacoes?: string;
  status?: 'ativo' | 'inativo';
}

export const useEmpresas = (filters?: { unidadeId?: string }) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch empresas
  const {
    data: empresas = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['empresas', user?.id, filters?.unidadeId],
    queryFn: async () => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      let query = supabase
        .from('empresas')
        .select('*')
        .order('created_at', { ascending: false });

      // Se for usuário matriz, pode ver todas as empresas ou filtrar por unidade
      if (profile?.user_type === 'matriz') {
        if (filters?.unidadeId) {
          query = query.eq('unidade_id', filters.unidadeId);
        }
        // Se não especificar unidade, matriz vê todas as empresas
      } else {
        // Para usuários de unidade, sempre filtrar pela própria unidade
        if (filters?.unidadeId) {
          query = query.eq('unidade_id', filters.unidadeId);
        } else {
          // Se não tiver unidadeId no filtro, não retornar nada (por segurança)
          query = query.eq('unidade_id', 'non-existent-id');
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Empresa[];
    },
    enabled: !!user?.id,
    // Removed auto-refresh to prevent notification spam
  });

  // Create empresa
  const createEmpresa = useMutation({
    mutationFn: async (empresaData: EmpresaInsert & { unidadeId?: string }) => {
      const { unidadeId, ...restData } = empresaData;
      const { data, error } = await supabase
        .from('empresas')
        .insert({
          ...restData,
          user_id: user?.id,
          unidade_id: unidadeId || filters?.unidadeId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresas'] });
      toast({
        title: "Sucesso",
        description: "Empresa criada com sucesso!",
      });
    },
    onError: (error) => {
      console.error('Erro ao criar empresa:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar empresa.",
        variant: "destructive",
      });
    },
  });

  // Update empresa
  const updateEmpresa = useMutation({
    mutationFn: async ({ id, ...empresaData }: Partial<Empresa> & { id: string }) => {
      const { data, error } = await supabase
        .from('empresas')
        .update(empresaData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresas'] });
      toast({
        title: "Sucesso",
        description: "Empresa atualizada com sucesso!",
      });
    },
    onError: (error) => {
      console.error('Erro ao atualizar empresa:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar empresa.",
        variant: "destructive",
      });
    },
  });

  // Delete empresa
  const deleteEmpresa = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('empresas')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['empresas'] });
      toast({
        title: "Sucesso",
        description: "Empresa excluída com sucesso!",
      });
    },
    onError: (error) => {
      console.error('Erro ao excluir empresa:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir empresa.",
        variant: "destructive",
      });
    },
  });

  // Get empresa by ID
  const getEmpresaById = async (id: string): Promise<Empresa | null> => {
    const { data, error } = await supabase
      .from('empresas')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Erro ao buscar empresa:', error);
      return null;
    }

    return data as Empresa;
  };

  return {
    empresas,
    isLoading,
    error,
    refetch,
    createEmpresa,
    updateEmpresa,
    deleteEmpresa,
    getEmpresaById,
    isCreating: createEmpresa.isPending,
    isUpdating: updateEmpresa.isPending,
    isDeleting: deleteEmpresa.isPending,
  };
};