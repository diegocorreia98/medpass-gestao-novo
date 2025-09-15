import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { UserPlus, FileSpreadsheet, Link, RefreshCw, CreditCard, ExternalLink } from "lucide-react";
import { useBeneficiarios } from "@/hooks/useBeneficiarios";
import { useUnidades } from "@/hooks/useUnidades";
import { useAuth } from "@/contexts/AuthContext";
import { usePaymentStatus } from "@/hooks/usePaymentStatus";
import { AdesoesDataTable } from "@/components/adesao/AdesoesDataTable";
import { UnidadeAdesaoModal } from "@/components/adesao/UnidadeAdesaoModal";
import { ImportacaoLoteModal } from "@/components/adesao/ImportacaoLoteModal";
import { GerarLinkModal } from "@/components/adesao/GerarLinkModal";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
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
  const [quickLinkOpen, setQuickLinkOpen] = useState(false); // ✅ NOVO: Quick link modal

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

  // ✅ NOVA: Gerar link rápido por CPF (para quando tabela está vazia)
  const [isGeneratingQuickLink, setIsGeneratingQuickLink] = useState(false);
  const [quickCpf, setQuickCpf] = useState('');
  
  const handleQuickVindiLink = async () => {
    if (!quickCpf) {
      toast({
        title: "CPF obrigatório",
        description: "Digite o CPF do beneficiário para gerar o link",
        variant: "destructive"
      });
      return;
    }
    
    setIsGeneratingQuickLink(true);
    
    try {
      console.log('🔍 [QUICK-LINK] Buscando beneficiário por CPF:', quickCpf);
      
      // Buscar beneficiário por CPF
      const { data: beneficiario, error: searchError } = await supabase
        .from('beneficiarios')
        .select('*, plano:planos(*)')
        .eq('cpf', quickCpf.replace(/\D/g, '')) // Remove máscaras
        .eq('status', 'ativo')
        .single();
      
      if (searchError || !beneficiario) {
        throw new Error('Beneficiário ativo não encontrado com este CPF');
      }
      
      console.log('✅ [QUICK-LINK] Beneficiário encontrado:', beneficiario.nome);
      
      // Gerar link via Edge Function
      const { data, error } = await supabase.functions.invoke('generate-payment-link-v2', {
        body: { 
          beneficiario_id: beneficiario.id,
          payment_method: 'bank_slip'
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      console.log('✅ [QUICK-LINK] Link gerado:', data);
      
      // Copiar link e mostrar feedback
      const linkToCopy = data.checkout_url || data.payment_url;
      if (linkToCopy) {
        await navigator.clipboard.writeText(linkToCopy);
        toast({
          title: `Link gerado para ${beneficiario.nome}! 🔗`,
          description: "Link copiado. Clique para abrir e testar.",
          action: (
            <Button
              size="sm"
              onClick={() => window.open(linkToCopy, '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              Abrir
            </Button>
          )
        });
      }
      
      // Limpar CPF
      setQuickCpf('');
      
    } catch (error: any) {
      console.error('❌ [QUICK-LINK] Erro:', error);
      toast({
        title: "Erro ao gerar link",
        description: error.message || "Erro interno do servidor",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingQuickLink(false);
    }
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
          {/* ✅ NOVO: Botão para gerar link rápido por CPF */}
          <Button 
            onClick={() => setQuickLinkOpen(true)} 
            variant="outline"
            className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
          >
            <CreditCard className="h-4 w-4 mr-2" />
            Link Rápido Vindi
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
      
      {/* ✅ NOVO: Modal para gerar link rápido por CPF */}
      <QuickVindiLinkModal 
        open={quickLinkOpen}
        onClose={() => setQuickLinkOpen(false)}
        onSuccess={() => refetch()}
      />
    </div>
  );
}

// ✅ NOVO: Modal Quick Link para gerar link via CPF
interface QuickVindiLinkModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

function QuickVindiLinkModal({ open, onClose, onSuccess }: QuickVindiLinkModalProps) {
  const [cpf, setCpf] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();
  
  const handleGenerate = async () => {
    if (!cpf) {
      toast({
        title: "CPF obrigatório",
        description: "Digite o CPF do beneficiário",
        variant: "destructive"
      });
      return;
    }
    
    setIsGenerating(true);
    
    try {
      console.log('🔍 [QUICK-VINDI] Buscando beneficiário por CPF:', cpf);
      
      // Buscar beneficiário por CPF
      const { data: beneficiario, error: searchError } = await supabase
        .from('beneficiarios')
        .select('*, plano:planos(*)')
        .eq('cpf', cpf.replace(/\D/g, ''))
        .eq('status', 'ativo')
        .single();
      
      if (searchError || !beneficiario) {
        throw new Error('Beneficiário ativo não encontrado com este CPF');
      }
      
      console.log('✅ [QUICK-VINDI] Beneficiário encontrado:', beneficiario.nome);
      
      // Gerar link via Edge Function
      const { data, error } = await supabase.functions.invoke('generate-payment-link-v2', {
        body: { 
          beneficiario_id: beneficiario.id,
          payment_method: 'bank_slip'
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      console.log('✅ [QUICK-VINDI] Link gerado:', data);
      
      // Copiar link e mostrar feedback
      const linkToCopy = data.checkout_url || data.payment_url;
      if (linkToCopy) {
        await navigator.clipboard.writeText(linkToCopy);
        toast({
          title: `Link gerado para ${beneficiario.nome}! 🔗`,
          description: "Link copiado para área de transferência",
          action: (
            <Button
              size="sm"
              onClick={() => window.open(linkToCopy, '_blank')}
              className="ml-2"
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              Abrir
            </Button>
          )
        });
      }
      
      // Fechar modal e atualizar
      setCpf('');
      onClose();
      onSuccess?.();
      
    } catch (error: any) {
      console.error('❌ [QUICK-VINDI] Erro:', error);
      toast({
        title: "Erro ao gerar link",
        description: error.message || "Erro interno do servidor",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };
  
  const handleClose = () => {
    setCpf('');
    onClose();
  };
  
  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-blue-600" />
            Gerar Link Vindi Rápido
          </DialogTitle>
          <DialogDescription>
            Digite o CPF do beneficiário para gerar link de pagamento via API Vindi
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cpf">CPF do Beneficiário</Label>
            <Input
              id="cpf"
              value={cpf}
              onChange={(e) => setCpf(e.target.value)}
              placeholder="000.000.000-00"
              maxLength={14}
            />
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={handleGenerate}
              disabled={isGenerating || !cpf}
              className="flex-1"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Gerando...
                </>
              ) : (
                <>
                  <Link className="h-4 w-4 mr-2" />
                  Gerar Link
                </>
              )}
            </Button>
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
          </div>
          
          <div className="text-xs text-muted-foreground bg-blue-50 p-3 rounded">
            📝 <strong>Como funciona:</strong><br />
            1. Digite o CPF do beneficiário ativo<br />
            2. Link será gerado e copiado automaticamente<br />
            3. Compartilhe o link com o cliente
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}