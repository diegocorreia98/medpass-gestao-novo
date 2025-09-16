import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { UserPlus, FileSpreadsheet, Link, RefreshCw } from "lucide-react";
import { useBeneficiarios } from "@/hooks/useBeneficiarios";
import { useUnidades } from "@/hooks/useUnidades";
import { useAuth } from "@/contexts/AuthContext";
import { usePaymentStatus } from "@/hooks/usePaymentStatus";
import { AdesoesDataTable } from "@/components/adesao/AdesoesDataTable";
import { UnidadeAdesaoModal } from "@/components/adesao/UnidadeAdesaoModal";
import { ImportacaoLoteModal } from "@/components/adesao/ImportacaoLoteModal";
import { GerarLinkModal } from "@/components/adesao/GerarLinkModal";
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
  const [gerarLinkModalOpen, setGerarLinkModalOpen] = useState(false);

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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Adesões de Beneficiários</h2>
          <p className="text-muted-foreground">Gerencie todas as adesões de sua unidade</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => setModalOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Nova Adesão
          </Button>
          <Button onClick={() => setImportacaoModalOpen(true)} variant="outline">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Importar em Lote
          </Button>
          <Button onClick={() => setGerarLinkModalOpen(true)} variant="outline">
            <Link className="h-4 w-4 mr-2" />
            Gerar Link
          </Button>
          <Button 
            onClick={handleManualRefresh} 
            variant="outline" 
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Atualizar Status
          </Button>
        </div>
      </div>

      {profile?.user_type === 'unidade' && !unidadeUsuario && (
        <div className="text-center py-8 space-y-4">
          <p className="text-muted-foreground">
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

      <GerarLinkModal 
        open={gerarLinkModalOpen}
        onClose={() => {
          setGerarLinkModalOpen(false);
          refetch();
        }}
        beneficiarios={beneficiariosUnidade}
      />
    </div>
  );
}

