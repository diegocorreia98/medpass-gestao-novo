import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { format, subDays, startOfDay, endOfDay } from "date-fns"
import { ptBR } from "date-fns/locale"
import { useAuth } from "@/contexts/AuthContext"

interface AdesoesCancelamentosData {
  date: string
  adesoes: number
  cancelamentos: number
}

export function useAdesoesCancelamentos(timeRange: string = "90d", unidadeId?: string) {
  const { user, profile } = useAuth();

  return useQuery({
    queryKey: ["adesoes-cancelamentos", timeRange, unidadeId, user?.id],
    queryFn: async (): Promise<AdesoesCancelamentosData[]> => {
      if (!user) throw new Error('Usuário não autenticado');

      console.log('[USE-ADESOES] Executando query para user:', user?.id);
      console.log('[USE-ADESOES] Profile type:', profile?.user_type);
      console.log('[USE-ADESOES] UnidadeId:', unidadeId);
      const now = new Date()
      let daysToSubtract = 90
      
      if (timeRange === "30d") {
        daysToSubtract = 30
      } else if (timeRange === "7d") {
        daysToSubtract = 7
      }
      
      const startDate = startOfDay(subDays(now, daysToSubtract))
      const endDate = endOfDay(now)
      
      // Fetch adesões (beneficiários criados)
      let adesoesQuery = supabase
        .from("beneficiarios")
        .select("data_adesao, created_at")
        .gte("data_adesao", format(startDate, "yyyy-MM-dd"))
        .lte("data_adesao", format(endDate, "yyyy-MM-dd"))
        .eq("status", "ativo")

      // 🔒 SECURITY: Sempre filtrar por user_id para usuários unidade
      if (profile?.user_type === 'unidade') {
        console.log('[SECURITY] Aplicando filtro de segurança para usuário unidade em adesões');
        adesoesQuery = adesoesQuery.eq('user_id', user?.id);
      }

      // Filtrar por unidade se especificado
      if (unidadeId) {
        adesoesQuery = adesoesQuery.eq("unidade_id", unidadeId)
      }

      const { data: adesoes, error: adesoesError } = await adesoesQuery
      
      if (adesoesError) {
        console.error("Erro ao buscar adesões:", adesoesError)
        throw adesoesError
      }
      
      // Fetch cancelamentos
      let cancelamentosQuery = supabase
        .from("cancelamentos")
        .select(`
          data_cancelamento,
          created_at,
          beneficiario:beneficiarios!inner(unidade_id, user_id)
        `)
        .gte("data_cancelamento", format(startDate, "yyyy-MM-dd"))
        .lte("data_cancelamento", format(endDate, "yyyy-MM-dd"))

      // 🔒 SECURITY: Sempre filtrar por user_id para usuários unidade
      if (profile?.user_type === 'unidade') {
        console.log('[SECURITY] Aplicando filtro de segurança para usuário unidade em cancelamentos');
        cancelamentosQuery = cancelamentosQuery.eq('beneficiario.user_id', user?.id);
      }

      // Filtrar por unidade se especificado
      if (unidadeId) {
        cancelamentosQuery = cancelamentosQuery.eq("beneficiario.unidade_id", unidadeId)
      }

      const { data: cancelamentos, error: cancelamentosError } = await cancelamentosQuery
      
      if (cancelamentosError) {
        console.error("Erro ao buscar cancelamentos:", cancelamentosError)
        throw cancelamentosError
      }
      
      // Criar mapa de dados por data
      const dataMap = new Map<string, { adesoes: number; cancelamentos: number }>()
      
      // Preencher com zeros para todas as datas no intervalo
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const dateStr = format(d, "yyyy-MM-dd")
        dataMap.set(dateStr, { adesoes: 0, cancelamentos: 0 })
      }
      
      // Contar adesões por data
      adesoes?.forEach((adesao) => {
        const dateStr = adesao.data_adesao
        const existing = dataMap.get(dateStr)
        if (existing) {
          existing.adesoes += 1
        }
      })
      
      // Contar cancelamentos por data
      cancelamentos?.forEach((cancelamento) => {
        const dateStr = cancelamento.data_cancelamento
        const existing = dataMap.get(dateStr)
        if (existing) {
          existing.cancelamentos += 1
        }
      })
      
      // Converter para array e formatar
      return Array.from(dataMap.entries())
        .map(([date, data]) => ({
          date,
          adesoes: data.adesoes,
          cancelamentos: data.cancelamentos,
        }))
        .sort((a, b) => a.date.localeCompare(b.date))
    },
    enabled: !!user,
    // Removed auto-refresh to prevent notification spam
  })
}