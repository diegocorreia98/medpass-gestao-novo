import { useState } from "react";
import { Button } from "@/components/ui/button";
import { UserPlus, FileSpreadsheet, RefreshCw } from "lucide-react";
import { useBeneficiarios } from "@/hooks/useBeneficiarios";
import { usePaymentStatus } from "@/hooks/usePaymentStatus";
import { useToast } from "@/hooks/use-toast";
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
      await Promise.all([
        refreshPaymentStatuses(),
        refetch()
      ]);
      toast({
        title: "Status atualizados",
        description: "Os status e status de pagamento foram atualizados com sucesso",
      });
    } catch (error) {
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar os status",
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