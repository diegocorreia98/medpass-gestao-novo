import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { beneficiariosSecureService, type SecureBeneficiario } from '@/services/beneficiarios-secure';
import type { 
  Beneficiario, 
  BeneficiarioInsert, 
  BeneficiarioUpdate, 
  BeneficiarioCompleto,
  BeneficiarioFilters 
} from '@/types/database';

export const useBeneficiarios = (filters?: BeneficiarioFilters & { unidadeId?: string }) => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query para buscar beneficiários
  const {
    data: beneficiarios = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['beneficiarios', user?.id, filters],
    queryFn: async (): Promise<BeneficiarioCompleto[]> => {
      console.log('[USE-BENEFICIARIOS] Executando query para user:', user?.id);
      console.log('[USE-BENEFICIARIOS] Filtros aplicados:', filters);
      
      let query = supabase
        .from('beneficiarios')
        .select(`
          *,
          plano:planos(*),
          unidade:unidades(*),
          payment_status
        `)
        .order('created_at', { ascending: false });

      // Aplicar filtros
      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.planoId) {
        query = query.eq('plano_id', filters.planoId);
      }
      if (filters?.unidadeId) {
        console.log('[USE-BENEFICIARIOS] Filtrando por unidade_id:', filters.unidadeId);
        query = query.eq('unidade_id', filters.unidadeId);
      }
      if (filters?.cidade) {
        query = query.ilike('cidade', `%${filters.cidade}%`);
      }
      if (filters?.estado) {
        query = query.eq('estado', filters.estado);
      }
      if (filters?.dataInicio) {
        query = query.gte('data_adesao', filters.dataInicio);
      }
      if (filters?.dataFim) {
        query = query.lte('data_adesao', filters.dataFim);
      }

      const { data, error } = await query;
      
      console.log('[USE-BENEFICIARIOS] Query executada');
      console.log('[USE-BENEFICIARIOS] Error:', error);
      console.log('[USE-BENEFICIARIOS] Data count:', data?.length || 0);
      console.log('[USE-BENEFICIARIOS] Data sample:', data?.slice(0, 2));
      
      if (error) {
        console.error('[USE-BENEFICIARIOS] Erro na query:', error);
        throw error;
      }
      
      return data || [];
    },
    enabled: !!user,
  });

  // Mutation para criar beneficiário
  const createBeneficiario = useMutation({
    mutationFn: async (beneficiario: BeneficiarioInsert & { codigo_externo?: string; id_beneficiario_tipo?: number }) => {
      // Extrair campos extras que não existem na tabela
      const { codigo_externo, id_beneficiario_tipo, ...beneficiarioData } = beneficiario;
      
      // 1. Primeiro criar o beneficiário no Supabase
      const { data, error } = await supabase
        .from('beneficiarios')
        .insert(beneficiarioData)
        .select()
        .single();
      
      if (error) throw error;

      // Beneficiário criado com sucesso
      // A sincronização com API externa será feita após confirmação de pagamento
      console.log("✅ Beneficiário criado com sucesso");
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beneficiarios'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast({
        title: "Sucesso",
        description: "Beneficiário criado! A adesão será processada após confirmação do pagamento.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao cadastrar beneficiário",
        variant: "destructive",
      });
    },
  });

  // Mutation para atualizar beneficiário
  const updateBeneficiario = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: BeneficiarioUpdate }) => {
      const { data, error } = await supabase
        .from('beneficiarios')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beneficiarios'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast({
        title: "Sucesso",
        description: "Beneficiário atualizado com sucesso!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar beneficiário",
        variant: "destructive",
      });
    },
  });

  // Mutation para deletar beneficiário
  const deleteBeneficiario = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('beneficiarios')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beneficiarios'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast({
        title: "Sucesso",
        description: "Beneficiário removido com sucesso!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao remover beneficiário",
        variant: "destructive",
      });
    },
  });

  // Função para buscar beneficiário por ID
  const getBeneficiarioById = async (id: string): Promise<BeneficiarioCompleto | null> => {
    const { data, error } = await supabase
      .from('beneficiarios')
      .select(`
        *,
        plano:planos(*),
        unidade:unidades(*)
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  };

  // Função para buscar beneficiário por CPF
  const getBeneficiarioByCpf = async (cpf: string): Promise<Beneficiario | null> => {
    const { data, error } = await supabase
      .from('beneficiarios')
      .select('*')
      .eq('cpf', cpf)
      .maybeSingle();
    
    if (error) throw error;
    return data;
  };

  return {
    beneficiarios,
    isLoading,
    error,
    refetch,
    createBeneficiario,
    updateBeneficiario,
    deleteBeneficiario,
    getBeneficiarioById,
    getBeneficiarioByCpf,
    isCreating: createBeneficiario.isPending,
    isUpdating: updateBeneficiario.isPending,
    isDeleting: deleteBeneficiario.isPending,
  };
};

// NOVO: Hook seguro para beneficiários com criptografia automática
export const useBeneficiariosSecure = () => {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query para buscar beneficiários com segurança automática
  const {
    data: beneficiarios = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['beneficiarios-secure'],
    queryFn: () => beneficiariosSecureService.getAll(),
    enabled: !!user,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Query para logs de auditoria (apenas matriz)
  const { data: auditLogs = [] } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: () => beneficiariosSecureService.getAuditLogs(),
    enabled: !!user && profile?.user_type === 'matriz',
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  // Mutation para criar beneficiário com criptografia
  const createBeneficiario = useMutation({
    mutationFn: async (beneficiario: BeneficiarioInsert & { codigo_externo?: string; id_beneficiario_tipo?: number }) => {
      // Extrair campos extras que não existem na tabela
      const { codigo_externo, id_beneficiario_tipo, ...beneficiarioData } = beneficiario;
      
      // Criar beneficiário usando o serviço seguro
      const newId = await beneficiariosSecureService.create(beneficiarioData);
      
      // Buscar os dados criados para a API externa
      const createdBeneficiario = await beneficiariosSecureService.getById(newId);
      if (!createdBeneficiario) throw new Error('Beneficiário criado mas não encontrado');

      // Beneficiário criado com segurança
      // A sincronização com API externa será feita após confirmação de pagamento
      console.log("✅ Beneficiário criado com segurança");
      
      return { id: newId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beneficiarios-secure'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast({
        title: "Sucesso",
        description: "Beneficiário criado com segurança! A adesão será processada após confirmação do pagamento.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar beneficiário",
        variant: "destructive",
      });
    },
  });

  // Mutation para atualizar beneficiário com segurança
  const updateBeneficiario = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: BeneficiarioUpdate }) => 
      beneficiariosSecureService.update(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beneficiarios-secure'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast({
        title: "Sucesso",
        description: "Beneficiário atualizado com segurança!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar beneficiário",
        variant: "destructive",
      });
    },
  });

  // Mutation para deletar beneficiário com log de segurança
  const deleteBeneficiario = useMutation({
    mutationFn: (id: string) => beneficiariosSecureService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['beneficiarios-secure'] });
      queryClient.invalidateQueries({ queryKey: ['audit-logs'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast({
        title: "Sucesso",
        description: "Beneficiário removido com segurança!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao remover beneficiário",
        variant: "destructive",
      });
    },
  });

  // Função para verificar se pode acessar dados completos
  const canAccessFullData = async (beneficiarioUserId: string) => {
    return await beneficiariosSecureService.canAccessFullData(beneficiarioUserId);
  };

  // Função para buscar beneficiário por ID com segurança
  const getBeneficiarioById = async (id: string) => {
    return await beneficiariosSecureService.getById(id);
  };

  return {
    beneficiarios,
    auditLogs,
    isLoading,
    error,
    refetch,
    createBeneficiario,
    updateBeneficiario,
    deleteBeneficiario,
    canAccessFullData,
    getBeneficiarioById,
    // Estados dos mutations
    isCreating: createBeneficiario.isPending,
    isUpdating: updateBeneficiario.isPending,
    isDeleting: deleteBeneficiario.isPending,
    // Indicadores de segurança
    hasMaskedData: beneficiarios.some((b: SecureBeneficiario) => b.is_sensitive_data_masked),
    isMatriz: profile?.user_type === 'matriz',
    // Total de logs de auditoria
    totalAuditLogs: auditLogs.length
  };
};
