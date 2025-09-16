import { useState } from "react";
import { Button } from "@/components/ui/button";
import { UserPlus, FileSpreadsheet, RefreshCw } from "lucide-react";
import { useBeneficiarios } from "@/hooks/useBeneficiarios";
import { usePaymentStatus } from "@/hooks/usePaymentStatus";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { AdesoesDataTable } from "@/components/adesao/AdesoesDataTable";
import { AdesaoModal } from "@/components/adesao/AdesaoModal";
import { ImportacaoLoteModal } from "@/components/adesao/ImportacaoLoteModal";

export default function Adesao() {
  const { beneficiarios, isLoading, refetch } = useBeneficiarios();
  const { isRefreshing, refreshPaymentStatuses } = usePaymentStatus();
  const { toast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [importacaoModalOpen, setImportacaoModalOpen] = useState(false);

  const handleRefreshStatuses = async () => {
    try {
      const result = await refreshPaymentStatuses();

      // Show detailed success message
      const message = result?.message || "Status atualizados com sucesso";
      const updates = result?.updates || 0;
      const localSyncs = result?.local_syncs || 0;
      const vindiSyncs = result?.vindi_syncs || 0;

      if (updates > 0) {
        // Wait a bit for database updates to propagate
        setTimeout(async () => {
          await refetch(); // Refresh the beneficiarios data after database updates
        }, 1000);

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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Adesões de Beneficiários</h2>
          <p className="text-muted-foreground">Gerencie todas as adesões do sistema</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setModalOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Nova Adesão
          </Button>
          <Button onClick={() => setImportacaoModalOpen(true)} variant="outline">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Importar em Lote
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

      <AdesoesDataTable 
        beneficiarios={beneficiarios} 
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