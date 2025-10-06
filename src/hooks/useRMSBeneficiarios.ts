import { useQuery } from "@tanstack/react-query";
import { consultarBeneficiarios } from "@/services/rms-consulta-beneficiarios";
import type { ConsultaBeneficiariosFilters } from "@/types/rms";

interface UseRMSBeneficiariosParams {
  filters: ConsultaBeneficiariosFilters;
  offset?: number;
  enabled?: boolean;
}

/**
 * Hook para consultar beneficiários na API RMS
 *
 * Utiliza React Query para cache e gerenciamento de estado
 * - Cache de 30 minutos (staleTime)
 * - Dados mantidos em memória por 60 minutos (gcTime)
 * - Mantém dados anteriores durante transições (keepPreviousData)
 */
export const useRMSBeneficiarios = ({
  filters,
  offset = 0,
  enabled = true,
}: UseRMSBeneficiariosParams) => {
  return useQuery({
    queryKey: ['rms-beneficiarios', filters, offset],
    queryFn: () => consultarBeneficiarios({
      cpf: filters.cpf,
      dataInicial: filters.dataInicial,
      dataFinal: filters.dataFinal,
      offset,
    }),
    enabled: enabled && !!filters.dataInicial && !!filters.dataFinal,
    staleTime: 30 * 60 * 1000,    // 30 minutos - dados considerados "frescos"
    gcTime: 60 * 60 * 1000,       // 60 minutos - tempo que mantém no cache
    retry: 1,
    refetchOnWindowFocus: false,
    placeholderData: (previousData) => previousData, // Mantém dados anteriores durante carregamento
  });
};
