import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { format, subDays, startOfDay, endOfDay } from "date-fns"
import { ptBR } from "date-fns/locale"

interface AdesoesCancelamentosData {
  date: string
  adesoes: number
  cancelamentos: number
}

export function useAdesoesCancelamentos(timeRange: string = "90d") {
  return useQuery({
    queryKey: ["adesoes-cancelamentos", timeRange],
    queryFn: async (): Promise<AdesoesCancelamentosData[]> => {
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
      const { data: adesoes, error: adesoesError } = await supabase
        .from("beneficiarios")
        .select("data_adesao, created_at")
        .gte("data_adesao", format(startDate, "yyyy-MM-dd"))
        .lte("data_adesao", format(endDate, "yyyy-MM-dd"))
        .eq("status", "ativo")
      
      if (adesoesError) {
        console.error("Erro ao buscar adesões:", adesoesError)
        throw adesoesError
      }
      
      // Fetch cancelamentos
      const { data: cancelamentos, error: cancelamentosError } = await supabase
        .from("cancelamentos")
        .select("data_cancelamento, created_at")
        .gte("data_cancelamento", format(startDate, "yyyy-MM-dd"))
        .lte("data_cancelamento", format(endDate, "yyyy-MM-dd"))
      
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
    // Removed auto-refresh to prevent notification spam
  })
}