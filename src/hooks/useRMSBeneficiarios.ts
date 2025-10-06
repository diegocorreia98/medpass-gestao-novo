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
 * Cache de 5 minutos por padrão
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
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000,   // 10 minutos (garbage collection)
    retry: 1,
    refetchOnWindowFocus: false,
  });
};
