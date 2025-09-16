import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { UserPlus, FileSpreadsheet, RefreshCw } from "lucide-react";
import { useBeneficiarios } from "@/hooks/useBeneficiarios";
import { useUnidades } from "@/hooks/useUnidades";
import { useAuth } from "@/contexts/AuthContext";
import { usePaymentStatus } from "@/hooks/usePaymentStatus";
import { AdesoesDataTable } from "@/components/adesao/AdesoesDataTable";
import { UnidadeAdesaoModal } from "@/components/adesao/UnidadeAdesaoModal";
import { ImportacaoLoteModal } from "@/components/adesao/ImportacaoLoteModal";
import { useToast } from "@/hooks/use-toast";
export default function UnidadeAdesao() {
  const { user, profile } = useAuth();
  const { unidades, createUnidade, isCreating } = useUnidades();
  const { isRefreshing, refreshPaymentStatuses } = usePaymentStatus();
  const { toast } = useToast();
  
  // Buscar a unidade do usuário logado primeiro
  const unidadeUsuario = unidades.find(u => u.user_id === user?.id);
  
  // Usar filtro por unidade para o hook de beneficiários
  const filters = profile?.user_type === 'unidade' && unidadeUsuario 
    ? { unidadeId: unidadeUsuario.id }
    : undefined;
    
  const { beneficiarios, isLoading, refetch } = useBeneficiarios(filters);
  
  console.log('[UNIDADE-ADESAO] Unidade do usuário:', unidadeUsuario);
  console.log('[UNIDADE-ADESAO] Filtros aplicados:', filters);
  console.log('[UNIDADE-ADESAO] Total beneficiários encontrados:', beneficiarios.length);
  const [modalOpen, setModalOpen] = useState(false);
  const [importacaoModalOpen, setImportacaoModalOpen] = useState(false);

  // Consolidate refresh functions with useCallback to prevent unnecessary re-renders
  const handleRefresh = useCallback(async (showToast = false) => {
    try {
      await Promise.all([
        refreshPaymentStatuses(),
        refetch()
      ]);
      if (showToast) {
        toast({
          title: "Status atualizados",
          description: "Os status de pagamento foram atualizados com sucesso",
        });
      }
    } catch (error) {
      if (showToast) {
        toast({
          title: "Erro ao atualizar",
          description: "Não foi possível atualizar os status de pagamento",
          variant: "destructive",
        });
      }
    }
  }, [refreshPaymentStatuses, refetch, toast]);

  // Removed auto-refresh to prevent notification spam

  // Para usuários matriz, mostrar todos os beneficiários
  // Para usuários unidade, os beneficiários já foram filtrados no hook
  const beneficiariosUnidade = beneficiarios;

  const handleManualRefresh = async () => {
    await handleRefresh(true);
  };


  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground leading-tight">
            Adesões de Beneficiários
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Gerencie todas as adesões de sua unidade
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button
            onClick={() => setModalOpen(true)}
            className="h-10 sm:h-9 touch-manipulation order-1 sm:order-none"
            size="sm"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Nova Adesão</span>
            <span className="sm:hidden">Nova Adesão</span>
          </Button>
          <Button
            onClick={() => setImportacaoModalOpen(true)}
            variant="outline"
            className="h-10 sm:h-9 touch-manipulation order-2 sm:order-none"
            size="sm"
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Importar em Lote</span>
            <span className="sm:hidden">Importar</span>
          </Button>
          <Button
            onClick={handleManualRefresh}
            variant="outline"
            disabled={isRefreshing}
            className="h-10 sm:h-9 touch-manipulation order-3 sm:order-none"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Atualizar Status</span>
            <span className="sm:hidden">Atualizar</span>
          </Button>
        </div>
      </div>

      {profile?.user_type === 'unidade' && !unidadeUsuario && (
        <div className="text-center py-8 sm:py-12 space-y-4">
          <p className="text-sm sm:text-base text-muted-foreground max-w-md mx-auto px-4">
            Você não possui uma unidade cadastrada. Entre em contato com o administrador para criar sua unidade.
          </p>
        </div>
      )}

      {(profile?.user_type === 'matriz' || unidadeUsuario) && (
        <AdesoesDataTable 
          beneficiarios={beneficiariosUnidade} 
          isLoading={isLoading} 
        />
      )}

      <UnidadeAdesaoModal 
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

