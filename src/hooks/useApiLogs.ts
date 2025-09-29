import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"

interface ApiLog {
  id: string
  beneficiario_id?: string
  operation: string
  request_data?: any
  response_data?: any
  status: string
  error_message?: string
  retry_count: number
  created_at: string
  beneficiario_nome?: string
  plano_nome?: string
  plano_codigo_rms?: string
}

interface ApiLogsFilters {
  operation?: string
  status?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  limit?: number
}

export function useApiLogs(filters?: ApiLogsFilters) {
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const page = filters?.page || 1
  const limit = filters?.limit || 20
  const offset = (page - 1) * limit

  const { data: logsData, isLoading, error, refetch } = useQuery({
    queryKey: ['api-logs', filters],
    queryFn: async () => {
      // Primeira query para contar o total
      let countQuery = supabase
        .from('api_integrations_log')
        .select('*', { count: 'exact', head: true })

      if (filters?.operation) {
        countQuery = countQuery.eq('operation', filters.operation)
      }

      if (filters?.status) {
        countQuery = countQuery.eq('status', filters.status)
      }

      if (filters?.dateFrom) {
        countQuery = countQuery.gte('created_at', filters.dateFrom)
      }

      if (filters?.dateTo) {
        countQuery = countQuery.lte('created_at', filters.dateTo)
      }

      const { count, error: countError } = await countQuery

      if (countError) throw countError

      // Segunda query para buscar os dados paginados
      let dataQuery = supabase
        .from('api_integrations_log')
        .select('*')
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (filters?.operation) {
        dataQuery = dataQuery.eq('operation', filters.operation)
      }

      if (filters?.status) {
        dataQuery = dataQuery.eq('status', filters.status)
      }

      if (filters?.dateFrom) {
        dataQuery = dataQuery.gte('created_at', filters.dateFrom)
      }

      if (filters?.dateTo) {
        dataQuery = dataQuery.lte('created_at', filters.dateTo)
      }

      const { data, error } = await dataQuery

      if (error) throw error

      return {
        logs: data as ApiLog[],
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit)
      }
    }
  })

  const logs = logsData?.logs || []
  const pagination = {
    total: logsData?.total || 0,
    page: logsData?.page || 1,
    limit: logsData?.limit || limit,
    totalPages: logsData?.totalPages || 0
  }

  const testApiConnection = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('notify-external-api', {
        body: {
          operation: 'test',
          data: {
            test: true,
            timestamp: new Date().toISOString()
          }
        }
      })

      if (error) throw error
      return data
    },
    onSuccess: () => {
      toast({
        title: "Teste de Conectividade",
        description: "Chamada de teste enviada com sucesso. Verifique os logs para ver a resposta.",
      })
      queryClient.invalidateQueries({ queryKey: ['api-logs'] })
    },
    onError: (error: any) => {
      toast({
        title: "Erro no Teste",
        description: error.message || "Erro ao testar conectividade com a API",
        variant: "destructive"
      })
    }
  })

  const retryApiCall = useMutation({
    mutationFn: async (logId: string) => {
      const log = logs.find(l => l.id === logId)
      if (!log || !log.request_data) {
        throw new Error('Log não encontrado ou dados insuficientes')
      }

      const { data, error } = await supabase.functions.invoke('notify-external-api', {
        body: {
          operation: log.operation,
          data: log.request_data
        }
      })

      if (error) throw error
      return data
    },
    onSuccess: () => {
      toast({
        title: "Retry Executado",
        description: "Chamada reenviada com sucesso. Verifique os logs para ver a nova resposta.",
      })
      queryClient.invalidateQueries({ queryKey: ['api-logs'] })
    },
    onError: (error: any) => {
      toast({
        title: "Erro no Retry",
        description: error.message || "Erro ao reenviar chamada da API",
        variant: "destructive"
      })
    }
  })

  const refreshVindiStatuses = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('refresh-payment-statuses')
      if (error) throw error
      return data
    },
    onSuccess: () => {
      toast({
        title: "Status Atualizados",
        description: "Status de pagamento da Vindi atualizados com sucesso.",
      })
      queryClient.invalidateQueries({ queryKey: ['api-logs'] })
    },
    onError: (error: any) => {
      toast({
        title: "Erro no Refresh",
        description: error.message || "Erro ao atualizar status da Vindi",
        variant: "destructive"
      })
    }
  })

  // Estatísticas dos logs (incluindo operações de teste)
  const stats = {
    total: logs.length,
    success: logs.filter(log => log.status === 'success').length,
    error: logs.filter(log => log.status === 'error').length,
    pending: logs.filter(log => log.status === 'pending').length,
    successRate: logs.length > 0 ? (logs.filter(log => log.status === 'success').length / logs.length * 100).toFixed(1) : '0'
  }

  return {
    logs,
    pagination,
    stats,
    isLoading,
    error,
    refetch,
    testApiConnection,
    retryApiCall,
    refreshVindiStatuses,
    isTestingConnection: testApiConnection.isPending,
    isRetrying: retryApiCall.isPending,
    isRefreshingVindi: refreshVindiStatuses.isPending
  }
}
