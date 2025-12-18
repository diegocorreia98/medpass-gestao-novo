import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type ContractStatus = 'not_requested' | 'pending_signature' | 'signed' | 'refused' | 'error';

export interface Contrato {
  id: string;
  nome: string;
  cpf: string;
  email: string | null;
  telefone: string | null;
  plano_nome: string;
  plano_id: string;
  contract_status: ContractStatus;
  autentique_document_id: string | null;
  autentique_signature_link: string | null;
  contract_signed_at: string | null;
  created_at: string;
  updated_at: string;
  unidade_nome: string | null;
}

export interface ContratosFilters {
  search?: string;
  status?: ContractStatus | 'all';
  dateFrom?: string;
  dateTo?: string;
}

export interface ContratosStats {
  total: number;
  pending: number;
  signed: number;
  refused: number;
}

export function useContratos(filters?: ContratosFilters) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Query para buscar contratos
  const { data: contratos, isLoading, error, refetch } = useQuery({
    queryKey: ['contratos', filters],
    queryFn: async () => {
      let query = supabase
        .from('beneficiarios')
        .select(`
          id,
          nome,
          cpf,
          email,
          telefone,
          plano_id,
          contract_status,
          autentique_document_id,
          autentique_signature_link,
          contract_signed_at,
          created_at,
          updated_at,
          planos!inner(nome),
          unidades(nome)
        `)
        .not('autentique_document_id', 'is', null)
        .order('updated_at', { ascending: false });

      // Aplicar filtros
      if (filters?.status && filters.status !== 'all') {
        query = query.eq('contract_status', filters.status);
      }

      if (filters?.search) {
        const searchTerm = `%${filters.search}%`;
        query = query.or(`nome.ilike.${searchTerm},cpf.ilike.${searchTerm},email.ilike.${searchTerm}`);
      }

      if (filters?.dateFrom) {
        query = query.gte('created_at', filters.dateFrom);
      }

      if (filters?.dateTo) {
        query = query.lte('created_at', filters.dateTo + 'T23:59:59');
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar contratos:', error);
        throw error;
      }

      // Mapear dados para o formato esperado
      return (data || []).map((item: any) => ({
        id: item.id,
        nome: item.nome,
        cpf: item.cpf,
        email: item.email,
        telefone: item.telefone,
        plano_id: item.plano_id,
        plano_nome: item.planos?.nome || 'Plano não encontrado',
        contract_status: item.contract_status || 'not_requested',
        autentique_document_id: item.autentique_document_id,
        autentique_signature_link: item.autentique_signature_link,
        contract_signed_at: item.contract_signed_at,
        created_at: item.created_at,
        updated_at: item.updated_at,
        unidade_nome: item.unidades?.nome || null,
      })) as Contrato[];
    },
  });

  // Query para estatísticas
  const { data: stats } = useQuery({
    queryKey: ['contratos-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('beneficiarios')
        .select('contract_status')
        .not('autentique_document_id', 'is', null);

      if (error) {
        console.error('Erro ao buscar estatísticas:', error);
        throw error;
      }

      const stats: ContratosStats = {
        total: data?.length || 0,
        pending: data?.filter(c => c.contract_status === 'pending_signature').length || 0,
        signed: data?.filter(c => c.contract_status === 'signed').length || 0,
        refused: data?.filter(c => c.contract_status === 'refused').length || 0,
      };

      return stats;
    },
  });

  // Mutation para reenviar contrato
  const resendContractMutation = useMutation({
    mutationFn: async (beneficiarioId: string) => {
      const { data, error } = await supabase.functions.invoke('create-autentique-contract', {
        body: { beneficiario_id: beneficiarioId }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Contrato reenviado",
        description: "Um novo contrato foi gerado e enviado para assinatura.",
      });
      queryClient.invalidateQueries({ queryKey: ['contratos'] });
      queryClient.invalidateQueries({ queryKey: ['contratos-stats'] });
    },
    onError: (error) => {
      console.error('Erro ao reenviar contrato:', error);
      toast({
        title: "Erro ao reenviar contrato",
        description: error instanceof Error ? error.message : "Tente novamente mais tarde.",
        variant: "destructive",
      });
    },
  });

  // Função para abrir link de assinatura
  const openSignatureLink = (link: string | null) => {
    if (link) {
      window.open(link, '_blank');
    } else {
      toast({
        title: "Link não disponível",
        description: "O link de assinatura não está disponível para este contrato.",
        variant: "destructive",
      });
    }
  };

  // Função para baixar PDF (via API do Autentique)
  const downloadPdf = async (documentId: string | null) => {
    if (!documentId) {
      toast({
        title: "PDF não disponível",
        description: "O documento ainda não foi assinado.",
        variant: "destructive",
      });
      return;
    }

    // URL do PDF assinado do Autentique
    const pdfUrl = `https://api.autentique.com.br/documentos/${documentId}/assinado.pdf`;
    window.open(pdfUrl, '_blank');
  };

  return {
    contratos: contratos || [],
    stats: stats || { total: 0, pending: 0, signed: 0, refused: 0 },
    isLoading,
    error,
    refetch,
    resendContract: resendContractMutation.mutate,
    isResending: resendContractMutation.isPending,
    openSignatureLink,
    downloadPdf,
  };
}

