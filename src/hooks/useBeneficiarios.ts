import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { beneficiariosSecureService, type SecureBeneficiario } from '@/services/beneficiarios-secure';
import { createSystemNotification } from '@/services/notificationService';
import { usePaymentNotificationSound } from '@/hooks/useNotificationSound';
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
  const { notifyPaymentSuccess } = usePaymentNotificationSound();

  // ✅ Real-time subscription for beneficiarios updates (especially payment_status)
  useEffect(() => {
    if (!user?.id) return;

    console.log('[REAL-TIME] Setting up beneficiarios subscription for user:', user.id);

    const channel = supabase
      .channel('beneficiarios-payment-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'beneficiarios',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[REAL-TIME] Beneficiario update received:', payload);

          const updatedBeneficiario = payload.new as Beneficiario;
          const oldBeneficiario = payload.old as Beneficiario;

          // Check if payment_status changed
          if (updatedBeneficiario.payment_status !== oldBeneficiario.payment_status) {
            console.log('[REAL-TIME] Payment status changed:', {
              id: updatedBeneficiario.id,
              nome: updatedBeneficiario.nome,
              old_status: oldBeneficiario.payment_status,
              new_status: updatedBeneficiario.payment_status
            });

            // Show toast notification for payment status changes
            if (updatedBeneficiario.payment_status === 'paid') {
              toast({
                title: "Pagamento Confirmado! 🎉",
                description: `O pagamento do beneficiário ${updatedBeneficiario.nome} foi confirmado.`,
              });

              // 🎵 Play payment success sound
              notifyPaymentSuccess(updatedBeneficiario.nome).catch(soundError => {
                console.error('⚠️ Erro ao tocar som de pagamento confirmado:', soundError);
              });

              // Criar notificação para usuários matriz sobre pagamento confirmado
              createSystemNotification({
                title: 'Pagamento Confirmado',
                message: `Pagamento do beneficiário ${updatedBeneficiario.nome} foi confirmado. A adesão será processada automaticamente.`,
                type: 'success',
                userType: 'matriz',
                actionUrl: '/beneficiarios',
                actionLabel: 'Ver Beneficiários'
              }).catch(notificationError => {
                console.error('⚠️ Erro ao criar notificação de pagamento confirmado:', notificationError);
              });
            } else if (updatedBeneficiario.payment_status === 'failed') {
              toast({
                title: "Pagamento Falhado ⚠️",
                description: `O pagamento do beneficiário ${updatedBeneficiario.nome} falhou.`,
                variant: "destructive"
              });

              // Criar notificação para usuários matriz sobre falha no pagamento
              createSystemNotification({
                title: 'Falha no Pagamento',
                message: `Pagamento do beneficiário ${updatedBeneficiario.nome} falhou. Verifique os dados de pagamento.`,
                type: 'error',
                userType: 'matriz',
                actionUrl: '/beneficiarios',
                actionLabel: 'Ver Beneficiários'
              }).catch(notificationError => {
                console.error('⚠️ Erro ao criar notificação de falha no pagamento:', notificationError);
              });
            }

            // Invalidate and refetch beneficiarios data
            queryClient.invalidateQueries({ queryKey: ['beneficiarios'] });
          }
        }
      )
      .subscribe();

    return () => {
      console.log('[REAL-TIME] Cleaning up beneficiarios subscription');
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient, toast]);

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
      console.log('[USE-BENEFICIARIOS] Profile type:', profile?.user_type);
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

      // 🔒 SECURITY: Sempre filtrar por user_id para usuários unidade
      if (profile?.user_type === 'unidade') {
        console.log('[SECURITY] Aplicando filtro de segurança para usuário unidade');
        query = query.eq('user_id', user?.id);
      }
      // Para usuários matriz, permitir acesso a todos os dados

      // Aplicar filtros adicionais
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
      
      // ✅ DEBUG ADICIONAL: Verificar se existe Diego Beu Correia
      if (data && data.length === 0 && filters?.unidadeId) {
        console.log('🔍 [DEBUG] Query retornou vazia, verificando beneficiários da unidade...');
        
        // Query sem filtros para debug
        const { data: debugData, error: debugError } = await supabase
          .from('beneficiarios')
          .select('id, nome, unidade_id, user_id, status')
          .eq('unidade_id', filters.unidadeId)
          .limit(5);
          
        console.log('🔍 [DEBUG] Beneficiários na unidade:', debugData);
        console.log('🔍 [DEBUG] Error na query debug:', debugError);
        
        // Query de todos os beneficiários do usuário
        const { data: userBenef, error: userError } = await supabase
          .from('beneficiarios')
          .select('id, nome, unidade_id, user_id, status')
          .eq('user_id', user?.id)
          .limit(5);
          
        console.log('🔍 [DEBUG] Beneficiários do usuário:', userBenef);
        console.log('🔍 [DEBUG] Error user query:', userError);
      }
      
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

      // 2. Criar notificação para usuários matriz sobre novo beneficiário
      try {
        await createSystemNotification({
          title: 'Novo Beneficiário Cadastrado',
          message: `Novo beneficiário ${data.nome} foi cadastrado e aguarda confirmação de pagamento.`,
          type: 'info',
          userType: 'matriz',
          actionUrl: '/beneficiarios',
          actionLabel: 'Ver Beneficiários'
        });
        console.log('✅ Notificação de novo beneficiário criada para usuários matriz');
      } catch (notificationError: any) {
        console.error('⚠️ Erro ao criar notificação de novo beneficiário:', notificationError);
        // Não falhar a operação principal
      }

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
