import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { UserPlus, FileSpreadsheet, RefreshCw, Download, UserCog } from "lucide-react";
import { useBeneficiarios } from "@/hooks/useBeneficiarios";
import { usePaymentStatus } from "@/hooks/usePaymentStatus";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { AdesoesDataTable } from "@/components/adesao/AdesoesDataTable";
import { AdesaoModal } from "@/components/adesao/AdesaoModal";
import { ImportacaoLoteModal } from "@/components/adesao/ImportacaoLoteModal";
import { AdesoesFilters, type AdesoesFilterValues } from "@/components/adesao/AdesoesFilters";
import { exportBeneficiariosToExcel } from "@/utils/excelExport";
import type { BeneficiarioCompleto } from "@/types/database";

export default function Adesao() {
  const navigate = useNavigate();
  const { beneficiarios, isLoading, refetch } = useBeneficiarios();
  const { isRefreshing, refreshPaymentStatuses } = usePaymentStatus();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [importacaoModalOpen, setImportacaoModalOpen] = useState(false);
  const [filters, setFilters] = useState<AdesoesFilterValues>({
    searchTerm: "",
    status: "all",
    paymentStatus: "all",
    planoId: "all",
    unidadeId: "all",
    dataInicio: "",
    dataFim: "",
    telefone: "",
    cep: "",
    cidade: "",
    estado: "all",
    hasCheckoutLink: "all",
    dataNascimentoInicio: "",
    dataNascimentoFim: ""
  });

  // Filter beneficiarios based on filter values
  const filteredBeneficiarios = useMemo(() => {
    return beneficiarios.filter((beneficiario) => {
      // Search term filter (nome, CPF, email)
      if (filters.searchTerm) {
        const searchLower = filters.searchTerm.toLowerCase();
        const matchesSearch =
          beneficiario.nome.toLowerCase().includes(searchLower) ||
          beneficiario.cpf.includes(filters.searchTerm) ||
          (beneficiario.email && beneficiario.email.toLowerCase().includes(searchLower));

        if (!matchesSearch) return false;
      }

      // Telefone filter
      if (filters.telefone && beneficiario.telefone) {
        if (!beneficiario.telefone.includes(filters.telefone)) {
          return false;
        }
      }

      // CEP filter
      if (filters.cep && beneficiario.cep) {
        if (!beneficiario.cep.includes(filters.cep)) {
          return false;
        }
      }

      // Cidade filter
      if (filters.cidade && beneficiario.cidade) {
        const cidadeLower = filters.cidade.toLowerCase();
        if (!beneficiario.cidade.toLowerCase().includes(cidadeLower)) {
          return false;
        }
      }

      // Estado filter
      if (filters.estado && filters.estado !== 'all' && beneficiario.estado !== filters.estado) {
        return false;
      }

      // Status filter
      if (filters.status && filters.status !== 'all' && beneficiario.status !== filters.status) {
        return false;
      }

      // Payment status filter
      if (filters.paymentStatus && filters.paymentStatus !== 'all') {
        const paymentStatus = beneficiario.payment_status || 'not_requested';
        if (paymentStatus !== filters.paymentStatus) {
          return false;
        }
      }

      // Plano filter
      if (filters.planoId && filters.planoId !== 'all' && beneficiario.plano_id !== filters.planoId) {
        return false;
      }

      // Unidade filter
      if (filters.unidadeId && filters.unidadeId !== 'all' && beneficiario.unidade_id !== filters.unidadeId) {
        return false;
      }

      // Checkout link filter
      if (filters.hasCheckoutLink && filters.hasCheckoutLink !== 'all') {
        const hasLink = !!beneficiario.checkout_link;
        if (filters.hasCheckoutLink === 'yes' && !hasLink) {
          return false;
        }
        if (filters.hasCheckoutLink === 'no' && hasLink) {
          return false;
        }
      }

      // Data nascimento início filter
      if (filters.dataNascimentoInicio && beneficiario.data_nascimento) {
        const dataNascimento = new Date(beneficiario.data_nascimento);
        const dataInicio = new Date(filters.dataNascimentoInicio);
        if (dataNascimento < dataInicio) {
          return false;
        }
      }

      // Data nascimento fim filter
      if (filters.dataNascimentoFim && beneficiario.data_nascimento) {
        const dataNascimento = new Date(beneficiario.data_nascimento);
        const dataFim = new Date(filters.dataNascimentoFim);
        dataFim.setHours(23, 59, 59, 999);
        if (dataNascimento > dataFim) {
          return false;
        }
      }

      // Data adesão início filter
      if (filters.dataInicio) {
        const dataAdesao = new Date(beneficiario.data_adesao);
        const dataInicio = new Date(filters.dataInicio);
        if (dataAdesao < dataInicio) {
          return false;
        }
      }

      // Data adesão fim filter
      if (filters.dataFim) {
        const dataAdesao = new Date(beneficiario.data_adesao);
        const dataFim = new Date(filters.dataFim);
        // Set time to end of day for inclusive comparison
        dataFim.setHours(23, 59, 59, 999);
        if (dataAdesao > dataFim) {
          return false;
        }
      }

      return true;
    });
  }, [beneficiarios, filters]);

  const handleRefreshStatuses = async () => {
    try {
      const result = await refreshPaymentStatuses();

      // Show detailed success message
      const updates = result?.updates || 0;
      const localSyncs = result?.local_syncs || 0;
      const vindiSyncs = result?.vindi_syncs || 0;

      if (updates > 0) {
        // Immediately invalidate all beneficiarios queries to force refresh
        queryClient.invalidateQueries({ queryKey: ['beneficiarios'] });

        // Also force refetch for immediate UI update
        setTimeout(async () => {
          await refetch(); // Refresh the beneficiarios data after database updates
        }, 500);

        toast({
          title: `✅ ${updates} Status Atualizados!`,
          description: localSyncs > 0 && vindiSyncs > 0
            ? `${localSyncs} sincronizações locais + ${vindiSyncs} da API Vindi`
            : localSyncs > 0
            ? `${localSyncs} beneficiários sincronizados localmente`
            : `${vindiSyncs} sincronizados da API Vindi`,
        });
      } else {
        toast({
          title: "Status verificados",
          description: "Todos os status já estão atualizados",
        });
      }
    } catch (error) {
      console.error('Error refreshing statuses:', error);
      toast({
        title: "Erro ao atualizar",
        description: error?.message || "Não foi possível atualizar os status",
        variant: "destructive",
      });
    }
  };

  const handleExportExcel = () => {
    if (filteredBeneficiarios.length === 0) {
      toast({
        title: "Nenhum dado para exportar",
        description: "Não há adesões para exportar com os filtros aplicados",
        variant: "destructive",
      });
      return;
    }

    try {
      exportBeneficiariosToExcel(filteredBeneficiarios);
      toast({
        title: "Exportação concluída!",
        description: `${filteredBeneficiarios.length} ${filteredBeneficiarios.length === 1 ? 'registro exportado' : 'registros exportados'} com sucesso`,
      });
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      toast({
        title: "Erro ao exportar",
        description: "Não foi possível exportar os dados",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Adesões de Beneficiários</h2>
          <p className="text-muted-foreground">Gerencie todas as adesões do sistema</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setModalOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Nova Adesão
          </Button>
          <Button onClick={() => navigate('/rms-adesao')} variant="outline">
            <UserCog className="h-4 w-4 mr-2" />
            Adesão Direta RMS
          </Button>
          <Button onClick={() => setImportacaoModalOpen(true)} variant="outline">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Importar em Lote
          </Button>
          <Button
            onClick={handleExportExcel}
            variant="outline"
            disabled={isLoading || filteredBeneficiarios.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar Excel
          </Button>
          <Button
            onClick={handleRefreshStatuses}
            variant="outline"
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Atualizar Status
          </Button>
        </div>
      </div>

      <AdesoesFilters
        filters={filters}
        onFiltersChange={setFilters}
        resultCount={filteredBeneficiarios.length}
      />

      <AdesoesDataTable
        beneficiarios={filteredBeneficiarios}
        isLoading={isLoading}
      />

      <AdesaoModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />

      <ImportacaoLoteModal
        open={importacaoModalOpen}
        onClose={() => setImportacaoModalOpen(false)}
      />
    </div>
  );
}