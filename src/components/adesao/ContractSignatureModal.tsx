import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, FileText, CheckCircle, X, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ContractSignatureModalProps {
  open: boolean;
  beneficiarioId: string;
  customerData: {
    nome: string;
    cpf: string;
    email: string;
    telefone?: string;
    endereco?: string;
    cidade?: string;
    estado?: string;
    cep?: string;
    data_nascimento?: string;
  };
  planoData: {
    nome: string;
    valor: number;
  };
  onSignatureComplete: (documentId: string) => void;
  onCancel: () => void;
}

type ContractStatus = 'generating' | 'ready' | 'signing' | 'completed' | 'error';

export function ContractSignatureModal({
  open,
  beneficiarioId,
  customerData,
  planoData,
  onSignatureComplete,
  onCancel
}: ContractSignatureModalProps) {
  const [status, setStatus] = useState<ContractStatus>('generating');
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (open && status === 'generating') {
      generateContract();
    }

    // Cleanup polling on unmount
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [open]);

  const generateContract = async () => {
    try {
      setStatus('generating');
      setError(null);

      console.log('📄 [CONTRACT-MODAL] Gerando contrato para:', customerData.nome);

      // Chamar edge function para gerar contrato preenchido e enviar ao Autentique
      const { data, error: contractError } = await supabase.functions.invoke(
        'create-autentique-contract',
        {
          body: {
            beneficiario_id: beneficiarioId,
            customer_data: customerData,
            plano_data: planoData
          }
        }
      );

      if (contractError) {
        console.error('❌ [CONTRACT-MODAL] Erro ao chamar função:', contractError);
        throw contractError;
      }

      console.log('📥 [CONTRACT-MODAL] Resposta recebida:', data);

      if (!data.success) {
        throw new Error(data.error || 'Erro ao gerar contrato');
      }

      setSignatureUrl(data.signature_link);
      setDocumentId(data.document_id);
      setStatus('ready');

      // Iniciar polling para verificar status da assinatura
      startPolling(data.document_id);

      toast({
        title: "✅ Contrato gerado",
        description: "Agora você pode revisar e assinar o documento",
      });

    } catch (err) {
      console.error('❌ [CONTRACT-MODAL] Erro ao gerar contrato:', err);
      setError(err instanceof Error ? err.message : 'Erro ao gerar contrato');
      setStatus('error');
      toast({
        title: "Erro",
        description: "Não foi possível gerar o contrato. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  const startPolling = (docId: string) => {
    console.log('🔄 [CONTRACT-MODAL] Iniciando polling para documento:', docId);
    
    // Verificar status da assinatura a cada 5 segundos
    const interval = setInterval(async () => {
      try {
        const { data: beneficiario } = await supabase
          .from('beneficiarios')
          .select('contract_status, autentique_signed_data')
          .eq('id', beneficiarioId)
          .single();

        console.log('🔍 [CONTRACT-MODAL] Status atual:', beneficiario?.contract_status);

        if (beneficiario?.contract_status === 'signed') {
          console.log('✅ [CONTRACT-MODAL] Contrato assinado detectado!');
          clearInterval(interval);
          setStatus('completed');
          
          setTimeout(() => {
            onSignatureComplete(docId);
          }, 2000);
        }
      } catch (err) {
        console.error('⚠️ [CONTRACT-MODAL] Erro ao verificar status:', err);
      }
    }, 5000);

    setPollingInterval(interval);
  };

  const handleIframeLoad = () => {
    console.log('✅ [CONTRACT-MODAL] Iframe do Autentique carregado');
  };

  const handleCancel = () => {
    if (pollingInterval) {
      clearInterval(pollingInterval);
    }
    onCancel();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleCancel()}>
      <DialogContent className="max-w-5xl max-h-[95vh] p-0 overflow-hidden" aria-describedby="contract-description">
        <DialogHeader className="p-6 pb-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="p-2 bg-blue-600 rounded-lg">
              <FileText className="h-5 w-5 text-white" />
            </div>
            Contrato de Adesão
          </DialogTitle>
          <DialogDescription id="contract-description" className="text-base mt-2">
            Revise atentamente todas as cláusulas e assine digitalmente o contrato de fidelidade
          </DialogDescription>
        </DialogHeader>

        <div className="relative flex-1 min-h-[650px]">
          {/* Estado: Gerando */}
          {status === 'generating' && (
            <div className="flex flex-col items-center justify-center h-[650px] gap-6 p-8">
              <div className="relative">
                <Loader2 className="h-16 w-16 animate-spin text-blue-600" />
                <div className="absolute inset-0 h-16 w-16 animate-ping text-blue-400 opacity-20">
                  <Loader2 className="h-16 w-16" />
                </div>
              </div>
              <div className="text-center space-y-2">
                <p className="text-xl font-semibold text-gray-900">
                  Gerando contrato personalizado...
                </p>
                <p className="text-sm text-gray-600 max-w-md">
                  Estamos preenchendo o documento com seus dados e configurando a assinatura digital
                </p>
              </div>
              <div className="flex gap-2 text-xs text-gray-500">
                <span className="px-3 py-1 bg-gray-100 rounded-full">✓ Validando dados</span>
                <span className="px-3 py-1 bg-gray-100 rounded-full">✓ Gerando PDF</span>
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full animate-pulse">
                  ⟳ Enviando ao Autentique
                </span>
              </div>
            </div>
          )}

          {/* Estado: Pronto para assinar */}
          {(status === 'ready' || status === 'signing') && signatureUrl && (
            <div className="relative h-[650px]">
              {status === 'ready' && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-10">
                  <Alert className="max-w-md bg-white shadow-2xl border-2 border-blue-200">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <AlertDescription className="mt-3">
                      <p className="font-semibold text-lg mb-2 text-gray-900">
                        Contrato pronto para assinatura!
                      </p>
                      <p className="text-sm mb-4 text-gray-600">
                        O documento será aberto abaixo. Leia atentamente todas as cláusulas 
                        e clique em <strong>"Assinar"</strong> no documento do Autentique.
                      </p>
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                        <p className="text-xs text-amber-900 flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                          <span>
                            Ao assinar, você concorda com o período de fidelidade de 12 meses e 
                            demais condições estabelecidas no contrato.
                          </span>
                        </p>
                      </div>
                      <Button 
                        onClick={() => setStatus('signing')} 
                        className="w-full bg-blue-600 hover:bg-blue-700"
                        size="lg"
                      >
                        Visualizar e Assinar Contrato
                      </Button>
                    </AlertDescription>
                  </Alert>
                </div>
              )}
              
              <iframe
                src={signatureUrl}
                className="w-full h-full border-0"
                title="Assinatura de Contrato - Autentique"
                onLoad={handleIframeLoad}
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
                allow="clipboard-write"
              />
            </div>
          )}

          {/* Estado: Assinatura concluída */}
          {status === 'completed' && (
            <div className="flex flex-col items-center justify-center h-[650px] gap-6 p-8">
              <div className="relative">
                <div className="rounded-full bg-green-100 p-6">
                  <CheckCircle className="h-16 w-16 text-green-600" />
                </div>
                <div className="absolute -top-2 -right-2">
                  <div className="bg-green-600 text-white rounded-full px-3 py-1 text-xs font-bold animate-bounce">
                    Sucesso!
                  </div>
                </div>
              </div>
              <div className="text-center space-y-2">
                <p className="text-2xl font-bold text-gray-900">
                  Contrato assinado com sucesso!
                </p>
                <p className="text-sm text-gray-600 max-w-md">
                  Sua assinatura foi registrada e validada. 
                  Redirecionando para finalizar o pagamento...
                </p>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                <span>Processando próxima etapa</span>
              </div>
            </div>
          )}

          {/* Estado: Erro */}
          {status === 'error' && (
            <div className="flex flex-col items-center justify-center h-[650px] gap-6 p-8">
              <div className="rounded-full bg-red-100 p-6">
                <X className="h-16 w-16 text-red-600" />
              </div>
              <div className="text-center max-w-md space-y-2">
                <p className="text-xl font-semibold text-gray-900">
                  Erro ao gerar contrato
                </p>
                <p className="text-sm text-gray-600">
                  {error || 'Ocorreu um erro inesperado ao processar o contrato'}
                </p>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleCancel} size="lg">
                  Cancelar
                </Button>
                <Button onClick={generateContract} size="lg" className="bg-blue-600 hover:bg-blue-700">
                  Tentar Novamente
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé com informações */}
        {status === 'signing' && (
          <div className="p-4 border-t bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
                  <span>Aguardando assinatura...</span>
                </div>
                <div className="text-xs text-gray-500 border-l pl-3">
                  <FileText className="h-3 w-3 inline mr-1" />
                  Certificado por Autentique
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={handleCancel}>
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

