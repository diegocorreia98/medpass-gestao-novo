import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface OrcamentoItem {
  id?: string;
  plano_id: string;
  plano_nome: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
}

export interface ClienteData {
  nome: string;
  documento: string;
  endereco?: string;
  email?: string;
  telefone?: string;
}

export interface OrcamentoData {
  id?: string;
  cliente: ClienteData;
  itens: OrcamentoItem[];
  subtotal: number;
  comissao_percentual: number;
  comissao_valor: number;
  total: number;
  status?: string;
  observacoes?: string;
  created_at?: string;
  updated_at?: string;
}

export const useOrcamentos = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Buscar todos os orçamentos do usuário
  const { data: orcamentos, isLoading, error, refetch } = useQuery({
    queryKey: ['orcamentos', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('orcamentos')
        .select(`
          *,
          orcamentos_itens (
            id,
            plano_id,
            plano_nome,
            quantidade,
            valor_unitario,
            valor_total
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Buscar orçamento por ID
  const getOrcamentoById = async (id: string) => {
    const { data, error } = await supabase
      .from('orcamentos')
      .select(`
        *,
        orcamentos_itens (
          id,
          plano_id,
          plano_nome,
          quantidade,
          valor_unitario,
          valor_total
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  };

  // Criar orçamento
  const createOrcamento = useMutation({
    mutationFn: async (orcamentoData: OrcamentoData) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      // Buscar unidade_id do usuário
      const { data: unidadeData } = await supabase
        .from('unidades')
        .select('id')
        .eq('user_id', user.id)
        .single();

      // Criar orçamento principal
      const { data: orcamento, error: orcamentoError } = await supabase
        .from('orcamentos')
        .insert({
          user_id: user.id,
          unidade_id: unidadeData?.id,
          cliente_nome: orcamentoData.cliente.nome,
          cliente_documento: orcamentoData.cliente.documento,
          cliente_endereco: orcamentoData.cliente.endereco,
          cliente_email: orcamentoData.cliente.email,
          cliente_telefone: orcamentoData.cliente.telefone,
          subtotal: orcamentoData.subtotal,
          comissao_percentual: orcamentoData.comissao_percentual,
          comissao_valor: orcamentoData.comissao_valor,
          total: orcamentoData.total,
          observacoes: orcamentoData.observacoes,
        })
        .select()
        .single();

      if (orcamentoError) throw orcamentoError;

      // Criar itens do orçamento
      if (orcamentoData.itens.length > 0) {
        const itens = orcamentoData.itens.map(item => ({
          orcamento_id: orcamento.id,
          plano_id: item.plano_id,
          plano_nome: item.plano_nome,
          quantidade: item.quantidade,
          valor_unitario: item.valor_unitario,
          valor_total: item.valor_total,
        }));

        const { error: itensError } = await supabase
          .from('orcamentos_itens')
          .insert(itens);

        if (itensError) throw itensError;
      }

      return orcamento;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orcamentos'] });
      toast.success('Orçamento criado com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao criar orçamento:', error);
      toast.error('Erro ao criar orçamento. Tente novamente.');
    },
  });

  // Atualizar orçamento
  const updateOrcamento = useMutation({
    mutationFn: async ({ id, ...orcamentoData }: OrcamentoData & { id: string }) => {
      if (!user?.id) throw new Error('Usuário não autenticado');

      // Atualizar orçamento principal
      const { error: orcamentoError } = await supabase
        .from('orcamentos')
        .update({
          cliente_nome: orcamentoData.cliente.nome,
          cliente_documento: orcamentoData.cliente.documento,
          cliente_endereco: orcamentoData.cliente.endereco,
          cliente_email: orcamentoData.cliente.email,
          cliente_telefone: orcamentoData.cliente.telefone,
          subtotal: orcamentoData.subtotal,
          comissao_percentual: orcamentoData.comissao_percentual,
          comissao_valor: orcamentoData.comissao_valor,
          total: orcamentoData.total,
          observacoes: orcamentoData.observacoes,
        })
        .eq('id', id);

      if (orcamentoError) throw orcamentoError;

      // Deletar itens existentes
      const { error: deleteError } = await supabase
        .from('orcamentos_itens')
        .delete()
        .eq('orcamento_id', id);

      if (deleteError) throw deleteError;

      // Criar novos itens
      if (orcamentoData.itens.length > 0) {
        const itens = orcamentoData.itens.map(item => ({
          orcamento_id: id,
          plano_id: item.plano_id,
          plano_nome: item.plano_nome,
          quantidade: item.quantidade,
          valor_unitario: item.valor_unitario,
          valor_total: item.valor_total,
        }));

        const { error: itensError } = await supabase
          .from('orcamentos_itens')
          .insert(itens);

        if (itensError) throw itensError;
      }

      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orcamentos'] });
      toast.success('Orçamento atualizado com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao atualizar orçamento:', error);
      toast.error('Erro ao atualizar orçamento. Tente novamente.');
    },
  });

  // Deletar orçamento
  const deleteOrcamento = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('orcamentos')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orcamentos'] });
      toast.success('Orçamento excluído com sucesso!');
    },
    onError: (error) => {
      console.error('Erro ao excluir orçamento:', error);
      toast.error('Erro ao excluir orçamento. Tente novamente.');
    },
  });

  return {
    orcamentos,
    isLoading,
    error,
    refetch,
    createOrcamento,
    updateOrcamento,
    deleteOrcamento,
    getOrcamentoById,
  };
};