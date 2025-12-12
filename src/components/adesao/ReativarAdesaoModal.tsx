
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RefreshCw, User, CreditCard, MapPin, Calendar, Edit, Copy, ExternalLink, CheckCircle, AlertCircle } from "lucide-react";
import { EditarAdesaoModal } from "./EditarAdesaoModal";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useBeneficiarios } from "@/hooks/useBeneficiarios";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { BeneficiarioCompleto } from "@/types/database";

interface ReativarAdesaoModalProps {
  open: boolean;
  onClose: () => void;
  beneficiario?: BeneficiarioCompleto;
}

export function ReativarAdesaoModal({ open, onClose, beneficiario }: ReativarAdesaoModalProps) {
  const [isReactivating, setIsReactivating] = useState(false);
  const [editarModalOpen, setEditarModalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<'confirm' | 'success'>('confirm');
  const [generatedLink, setGeneratedLink] = useState<string>("");
  const [reactivationStatus, setReactivationStatus] = useState({
    rms: false,
    rmsExisting: false, // Indica se o usuário já existia na RMS
    payment: false
  });
  const { updateBeneficiario } = useBeneficiarios();
  const { toast } = useToast();

  // Gerar código externo usando nome da unidade
  const generateExternalCode = () => {
    if (!beneficiario) return '';
    const unidadeName = beneficiario.unidade?.nome || 'MATRIZ';
    const beneficiarioNumbers = beneficiario.id.replace(/[^0-9]/g, '').slice(0, 6);
    const cleanUnitName = unidadeName
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 8);
    return `${cleanUnitName}${beneficiarioNumbers}`.slice(0, 15);
  };

  // Formatar data para RMS (DDMMYYYY)
  const formatDateForRMS = (dateStr: string | null) => {
    if (!dateStr) return '01011990';
    const date = new Date(dateStr);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString();
    return `${day}${month}${year}`;
  };

  const handleReativar = async () => {
    if (!beneficiario) return;

    setIsReactivating(true);
    setReactivationStatus({ rms: false, rmsExisting: false, payment: false });

    try {
      // 1. Consultar RMS primeiro (se já existir ATIVO, pular adesão e ir direto para o link)
      console.log('🔄 [REATIVAÇÃO] Passo 1: Consultando RMS por CPF...');

      let rmsIsActive = false;
      try {
        const { data: consultaData, error: consultaError } = await supabase.functions.invoke('notify-external-api', {
          body: {
            operation: 'consulta-beneficiario',
            data: { cpf: beneficiario.cpf }
          }
        });

        console.log('🔎 [REATIVAÇÃO] Resultado consulta RMS:', {
          success: consultaData?.success,
          found: consultaData?.found,
          status: consultaData?.status,
          isActive: consultaData?.isActive,
          error: consultaData?.error,
          consultaError: consultaError?.message,
        });

        const status = (consultaData?.status || '').toString().toUpperCase();
        // ✅ Regra do fluxo: se EXISTE na RMS (found=true) OU está ATIVO, pular adesão e ir direto para gerar link
        const existsInRms = consultaData?.found === true;
        const isActive = consultaData?.isActive === true || status === 'ATIVO';

        if (!consultaError && consultaData?.success && (existsInRms || isActive)) {
          rmsIsActive = true; // (nome histórico) significa "não precisa criar"
        }
      } catch (e) {
        // Se consulta falhar, seguimos com o fluxo antigo de adesão (fallback)
        console.warn('⚠️ [REATIVAÇÃO] Falha ao consultar RMS, seguindo com adesão:', e);
      }

      if (rmsIsActive) {
        console.log('ℹ️ [REATIVAÇÃO] Beneficiário já está ATIVO na RMS. Pulando adesão e indo para geração do link...');
        setReactivationStatus(prev => ({ ...prev, rms: true, rmsExisting: true }));

        toast({
          title: "Usuário já cadastrado na RMS",
          description: "O beneficiário já possui cadastro ativo na RMS. Prosseguindo com a geração do link de pagamento.",
        });
      } else {
        // 1.2 Enviar para RMS (API externa de adesão)
        console.log('🔄 [REATIVAÇÃO] Passo 1.2: Enviando para RMS (adesão)...');

      const adesaoData = {
        id: beneficiario.id,
        nome: beneficiario.nome,
        cpf: beneficiario.cpf,
        data_nascimento: formatDateForRMS(beneficiario.data_nascimento),
        telefone: beneficiario.telefone || '11999999999',
        email: beneficiario.email,
        cep: beneficiario.cep || '01234567',
        numero_endereco: '123', // Valor padrão para evitar erros
        estado: beneficiario.estado || 'SP',
        plano_id: beneficiario.plano_id,
        id_beneficiario_tipo: 1,
        codigo_externo: generateExternalCode()
      };

      const { data: apiResult, error: apiError } = await supabase.functions.invoke('notify-external-api', {
        body: {
          operation: 'adesao',
          data: adesaoData
        }
      });

      if (apiError) {
        // ✅ Fallback: algumas versões retornam erro HTTP 400 para "já existe ativo" (codigoErro 1016)
        const msg = apiError.message?.toLowerCase?.() || '';
        const isAlreadyActive1016 =
          msg.includes('"codigoerro":"1016"') ||
          msg.includes('codigoerro') && msg.includes('1016') ||
          msg.includes('já existe') ||
          msg.includes('como ativo');

        if (isAlreadyActive1016) {
          console.log('ℹ️ [REATIVAÇÃO] RMS retornou "já existe ativo" via apiError, continuando com geração do link...');
          setReactivationStatus(prev => ({ ...prev, rms: true, rmsExisting: true }));

          toast({
            title: "Usuário já cadastrado na RMS",
            description: "O beneficiário já possui cadastro ativo na RMS. Prosseguindo com a geração do link de pagamento.",
          });
        } else {
          throw new Error(`Erro na API RMS: ${apiError.message}`);
        }
      }

      // Verificar se o usuário já existe na RMS (código 1001 ou mensagem de duplicidade)
      if (!apiError && apiResult && !apiResult.success) {
        const errorMsg = apiResult.error?.toLowerCase() || '';
        const isAlreadyExists =
          apiResult.rms_code === 1001 ||
          apiResult.rms_code === 1016 ||
          apiResult.rms_error_type === 'BENEFICIARIO_JA_ATIVO' ||
          errorMsg.includes('já existe') ||
          errorMsg.includes('already exists') ||
          errorMsg.includes('duplicado') ||
          errorMsg.includes('cadastrado');

        if (isAlreadyExists) {
          console.log('ℹ️ [REATIVAÇÃO] Usuário já existe na RMS, continuando com geração do link...');
          setReactivationStatus(prev => ({ ...prev, rms: true, rmsExisting: true }));

          toast({
            title: "Usuário já cadastrado na RMS",
            description: "O beneficiário já possui cadastro ativo na RMS. Prosseguindo com a geração do link de pagamento.",
          });
        } else {
          throw new Error(apiResult.error || 'Erro na adesão RMS');
        }
      } else {
        console.log('✅ [REATIVAÇÃO] RMS concluído com sucesso');
        setReactivationStatus(prev => ({ ...prev, rms: true }));
      }
      }

      // 2. Gerar novo link de pagamento (Vindi)
      console.log('🔄 [REATIVAÇÃO] Passo 2: Gerando link de pagamento...');

      const { data: paymentResult, error: paymentError } = await supabase.functions.invoke('generate-payment-link', {
        body: { beneficiario_id: beneficiario.id }
      });

      if (paymentError) {
        throw new Error(`Erro ao gerar link de pagamento: ${paymentError.message}`);
      }

      if (paymentResult?.error) {
        throw new Error(paymentResult.error);
      }

      console.log('✅ [REATIVAÇÃO] Link de pagamento gerado:', paymentResult?.payment_url);
      setGeneratedLink(paymentResult?.payment_url || '');
      setReactivationStatus(prev => ({ ...prev, payment: true }));

      // 3. Atualizar o status do beneficiário no banco de dados
      console.log('🔄 [REATIVAÇÃO] Passo 3: Atualizando status...');

      await updateBeneficiario.mutateAsync({
        id: beneficiario.id,
        updates: {
          status: 'ativo',
          checkout_link: paymentResult?.payment_url || null
        }
      });

      console.log('✅ [REATIVAÇÃO] Beneficiário reativado com sucesso!');

      toast({
        title: "Reativação concluída!",
        description: "Beneficiário reativado e link de pagamento gerado com sucesso.",
      });

      setCurrentStep('success');

    } catch (error: any) {
      console.error('❌ [REATIVAÇÃO] Erro:', error);
      toast({
        title: "Erro na reativação",
        description: error.message || "Erro ao reativar beneficiário",
        variant: "destructive",
      });
    } finally {
      setIsReactivating(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(generatedLink);
      toast({
        title: "Link copiado!",
        description: "Link de pagamento copiado para a área de transferência",
      });
    } catch {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar o link",
        variant: "destructive",
      });
    }
  };

  const handleOpenLink = () => {
    window.open(generatedLink, '_blank');
  };

  const handleClose = () => {
    setCurrentStep('confirm');
    setGeneratedLink('');
    setReactivationStatus({ rms: false, rmsExisting: false, payment: false });
    onClose();
  };

  const formatarData = (data: string) => {
    return format(new Date(data), "dd/MM/yyyy", { locale: ptBR });
  };

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valor);
  };

  if (!beneficiario) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {currentStep === 'success' ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <RefreshCw className="h-5 w-5 text-green-600" />
            )}
            {currentStep === 'success' ? 'Reativação Concluída!' : 'Reativar Beneficiário'}
          </DialogTitle>
          <DialogDescription>
            {currentStep === 'success'
              ? 'O beneficiário foi reativado com sucesso. Um novo link de pagamento foi gerado.'
              : 'Confirme a reativação do beneficiário. Esta ação irá enviar os dados para a RMS e gerar um novo link de pagamento.'}
          </DialogDescription>
        </DialogHeader>

        {currentStep === 'confirm' ? (
          <>
            <div className="space-y-6">
              {/* Status atual */}
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <span className="font-medium">Status atual:</span>
                <Badge variant="destructive">Inativo</Badge>
              </div>

              {/* Progresso durante reativação */}
              {isReactivating && (
                <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    {reactivationStatus.rms ? (
                      reactivationStatus.rmsExisting ? (
                        <AlertCircle className="h-4 w-4 text-amber-600" />
                      ) : (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      )
                    ) : (
                      <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                    )}
                    <span className={reactivationStatus.rms ? (reactivationStatus.rmsExisting ? 'text-amber-700' : 'text-green-700') : 'text-blue-700'}>
                      {reactivationStatus.rms
                        ? (reactivationStatus.rmsExisting
                            ? 'RMS: Usuário já cadastrado (continuando...)'
                            : 'RMS: Enviado com sucesso')
                        : 'Enviando para RMS...'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {reactivationStatus.payment ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : reactivationStatus.rms ? (
                      <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border-2 border-gray-300" />
                    )}
                    <span className={reactivationStatus.payment ? 'text-green-700' : reactivationStatus.rms ? 'text-blue-700' : 'text-gray-500'}>
                      {reactivationStatus.payment ? 'Link de pagamento gerado' : reactivationStatus.rms ? 'Gerando link de pagamento...' : 'Aguardando...'}
                    </span>
                  </div>
                </div>
              )}

              {/* Dados do beneficiário */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold">Dados Pessoais</span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Nome:</span>
                    <p className="font-medium">{beneficiario.nome}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">CPF:</span>
                    <p className="font-medium">{beneficiario.cpf}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">E-mail:</span>
                    <p className="font-medium">{beneficiario.email || "Não informado"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Telefone:</span>
                    <p className="font-medium">{beneficiario.telefone || "Não informado"}</p>
                  </div>
                </div>

                <Separator />

                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold">Plano</span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Plano:</span>
                    <p className="font-medium">{beneficiario.plano?.nome}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Valor:</span>
                    <p className="font-medium">{formatarMoeda(Number(beneficiario.valor_plano))}</p>
                  </div>
                </div>

                <Separator />

                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold">Localização</span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Cidade:</span>
                    <p className="font-medium">{beneficiario.cidade || "Não informado"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Estado:</span>
                    <p className="font-medium">{beneficiario.estado || "Não informado"}</p>
                  </div>
                </div>

                <Separator />

                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold">Data de Adesão Original</span>
                </div>

                <div className="text-sm">
                  <span className="text-muted-foreground">Adesão:</span>
                  <p className="font-medium">{formatarData(beneficiario.data_adesao)}</p>
                </div>
              </div>

              {/* Aviso importante */}
              <div className="p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>Atenção:</strong> A reativação irá:
                </p>
                <ul className="text-sm text-yellow-800 dark:text-yellow-200 list-disc list-inside mt-2 space-y-1">
                  <li>Enviar os dados para a RMS (API externa)</li>
                  <li>Gerar um novo link de pagamento na Vindi</li>
                  <li>Alterar o status para "Ativo"</li>
                </ul>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isReactivating}
              >
                Cancelar
              </Button>
              <Button
                variant="secondary"
                onClick={() => setEditarModalOpen(true)}
                disabled={isReactivating}
                className="mr-auto"
              >
                <Edit className="h-4 w-4 mr-2" />
                Editar Dados
              </Button>
              <Button
                onClick={handleReativar}
                disabled={isReactivating}
                className="bg-green-600 hover:bg-green-700"
              >
                {isReactivating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Reativando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Confirmar Reativação
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        ) : (
          /* Tela de sucesso com link de pagamento */
          <div className="space-y-6">
            <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center gap-2 text-green-800 dark:text-green-200 mb-2">
                <CheckCircle className="h-5 w-5" />
                <span className="font-semibold">Reativação realizada com sucesso!</span>
              </div>
              <p className="text-sm text-green-700 dark:text-green-300">
                O beneficiário {beneficiario.nome} foi reativado e um novo link de pagamento foi gerado.
              </p>
            </div>

            {/* Resumo das ações */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                {reactivationStatus.rmsExisting ? (
                  <>
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <span>Usuário já cadastrado na RMS (cadastro mantido)</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span>Enviado para RMS com sucesso</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Link de pagamento gerado</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Status atualizado para "Ativo"</span>
              </div>
            </div>

            {/* Link de pagamento */}
            {generatedLink && (
              <div className="space-y-2">
                <Label>Link de Pagamento</Label>
                <div className="flex space-x-2">
                  <Input
                    value={generatedLink}
                    readOnly
                    className="flex-1 text-xs"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleCopyLink}
                    title="Copiar link"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  variant="outline"
                  onClick={handleOpenLink}
                  className="w-full"
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Abrir Link de Pagamento
                </Button>
              </div>
            )}

            <DialogFooter>
              <Button onClick={handleClose} className="w-full">
                Fechar
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>

      <EditarAdesaoModal
        open={editarModalOpen}
        onClose={() => setEditarModalOpen(false)}
        beneficiario={beneficiario}
      />
    </Dialog>
  );
}
