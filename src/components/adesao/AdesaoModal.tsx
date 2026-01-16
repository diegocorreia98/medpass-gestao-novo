import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { UserPlus, Save, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { usePlanos } from "@/hooks/usePlanos";
import { useUnidades } from "@/hooks/useUnidades";
import { useEmpresas } from "@/hooks/useEmpresas";
import { useAuth } from "@/contexts/AuthContext";
import { ApiStatusIndicator } from "./ApiStatusIndicator";
import { DependentesForm, type DependenteFormData } from "./DependentesForm";
import { isValidCPF, formatCPF, validateCPFWithMessage } from "@/utils/cpfValidator";

interface BeneficiarioFormData {
  nome: string;
  cpf: string;
  email: string;
  telefone: string;
  data_nascimento: string;
  endereco: string;
  numero_endereco: string;
  cidade: string;
  estado: string;
  cep: string;
  plano_id: string;
  valor_plano: number;
  observacoes: string;
  unidade_id: string;
  id_beneficiario_tipo: number;
  codigo_externo: string;
  empresa_id: string;
}

interface AdesaoModalProps {
  open: boolean;
  onClose: () => void;
}

export function AdesaoModal({ open, onClose }: AdesaoModalProps) {
  const { toast } = useToast();
  const { user, profile } = useAuth();
  const { planos, isLoading: isLoadingPlanos } = usePlanos();
  const { unidades, isLoading: isLoadingUnidades } = useUnidades();
  const { empresas, isLoading: isLoadingEmpresas } = useEmpresas();
  const [isCreating, setIsCreating] = useState(false);
  const [apiStatus, setApiStatus] = useState<'idle' | 'loading' | 'success' | 'error' | 'partial'>('idle');
  const [apiMessage, setApiMessage] = useState<string>('');
  const [cpfError, setCpfError] = useState<string>('');
  const [generatePaymentLink, setGeneratePaymentLink] = useState(true); // Toggle para gerar link de pagamento

  // Filtrar empresas do usuário
  const empresasUsuario = user && profile ? empresas.filter(empresa => 
    // Matrix users can see all companies, unit users can see only their own companies
    profile.user_type === 'matriz' || empresa.user_id === user.id
  ) : [];

  const [beneficiario, setBeneficiario] = useState<BeneficiarioFormData>({
    nome: "",
    cpf: "",
    email: "",
    telefone: "",
    data_nascimento: "",
    endereco: "",
    numero_endereco: "",
    cidade: "",
    estado: "",
    cep: "",
    plano_id: "",
    valor_plano: 0,
    observacoes: "",
    unidade_id: "",
    id_beneficiario_tipo: 1,
    codigo_externo: "",
    empresa_id: "",
  });
  const [dependentes, setDependentes] = useState<DependenteFormData[]>([]);

  // Verificar se é plano familiar
  const planoSelecionado = planos.find(p => p.id === beneficiario.plano_id);
  const isPlanoFamiliar = planoSelecionado?.nome.toLowerCase().includes('familiar');

  const estadosBrasil = [
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
    "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
    "RS", "RO", "RR", "SC", "SP", "SE", "TO"
  ];

  const onSubmit = async (values: BeneficiarioFormData) => {
    try {
      setIsCreating(true);

      // Validate CPF before submitting
      const cpfValidationError = validateCPFWithMessage(values.cpf);
      if (cpfValidationError) {
        setCpfError(cpfValidationError);
        toast({
          title: "CPF inválido",
          description: cpfValidationError,
          variant: "destructive"
        });
        return;
      }

      // Get plan details for price
      const planoSelecionado = planos.find(p => p.id === values.plano_id);
      if (!planoSelecionado) {
        throw new Error('Plano não encontrado');
      }

      // First, save beneficiary directly to beneficiarios table with pending status
      const { data: beneficiarioData, error: beneficiarioError } = await supabase
        .from('beneficiarios')
        .insert({
          user_id: user?.id,
          unidade_id: values.unidade_id || null,
          empresa_id: values.empresa_id || null,
          plano_id: values.plano_id,
          nome: values.nome,
          cpf: values.cpf,
          email: values.email?.toLowerCase() || null,
          telefone: values.telefone || null,
          data_nascimento: values.data_nascimento || null,
          endereco: values.endereco ? `${values.endereco}, ${values.numero_endereco}` : null,
          cidade: values.cidade || null,
          estado: values.estado || null,
          cep: values.cep || null,
          valor_plano: planoSelecionado.valor,
          observacoes: values.observacoes || null,
          status: 'ativo', // Status ativo para permitir geração de link de pagamento
          payment_status: 'not_requested' // Status inicial antes da geração do link
        })
        .select()
        .single();

      if (beneficiarioError) {
        throw new Error('Erro ao salvar beneficiário: ' + beneficiarioError.message);
      }

      console.log('Beneficiário salvo com sucesso:', beneficiarioData);

      let checkoutUrl = null;

      // Só gerar link de pagamento se o toggle estiver ativado
      if (generatePaymentLink) {
        console.log('🔄 [MATRIZ-ADESAO] Creating Vindi customer for beneficiary:', beneficiarioData.id);

        // ✅ NOVO FLUXO CORRETO: Apenas criar cliente + checkout (não assinatura ainda)
        console.log('🔄 [MATRIZ-ADESAO] Chamando create-vindi-customer para beneficiário:', beneficiarioData.id);

        const { data: vindiData, error: vindiError } = await supabase.functions.invoke('create-vindi-customer', {
          body: { beneficiario_id: beneficiarioData.id }
        });

        console.log('📋 [MATRIZ-ADESAO] Resposta da função create-vindi-customer:', {
          success: vindiData?.success,
          hasCheckoutUrl: !!vindiData?.checkout_url,
          error: vindiError?.message,
          fullResponse: vindiData
        });

        if (vindiError) {
          console.error('❌ [MATRIZ-ADESAO] Erro ao criar cliente Vindi:', vindiError);
          // Don't throw error here, beneficiary is already saved
        }

        if (vindiData?.success && vindiData?.checkout_url) {
          checkoutUrl = vindiData.checkout_url;
          console.log('✅ [MATRIZ-ADESAO] Checkout URL gerada:', checkoutUrl);

          // Update beneficiary with checkout link
          const { error: updateError } = await supabase
            .from('beneficiarios')
            .update({
              checkout_link: checkoutUrl,
              payment_status: 'payment_requested'
            })
            .eq('id', beneficiarioData.id);

          if (updateError) {
            console.error('❌ [MATRIZ-ADESAO] Erro ao salvar link de checkout:', updateError);
          } else {
            console.log('✅ [MATRIZ-ADESAO] Link de checkout salvo para beneficiário:', beneficiarioData.id);
          }
        } else if (vindiData && !vindiData.success) {
          console.error('❌ [MATRIZ-ADESAO] Função retornou sucesso = false:', vindiData);
        } else {
          console.warn('⚠️ [MATRIZ-ADESAO] Checkout URL não foi gerada - resposta:', vindiData);
        }
      } else {
        console.log('ℹ️ [MATRIZ-ADESAO] Geração de link de pagamento desativada pelo usuário');
      }

      toast({
        title: "Adesão processada com sucesso",
        description: generatePaymentLink && checkoutUrl
          ? "Beneficiário salvo e link de pagamento gerado!"
          : "Beneficiário salvo com sucesso!"
      });

      // ✅ Force refresh da tabela para mostrar novo beneficiário
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('refresh-beneficiarios'));
      }, 500);

      // Show payment link if available
      if (checkoutUrl) {
        toast({
          title: "Link de pagamento gerado",
          description: "Compartilhe o link com o cliente para efetuar o pagamento",
          action: (
            <Button
              size="sm"
              onClick={() => window.open(checkoutUrl, '_blank')}
            >
              Abrir Link
            </Button>
          )
        });
      }
      
      // Reset form
      setBeneficiario({
        nome: "",
        cpf: "",
        email: "",
        telefone: "",
        data_nascimento: "",
        endereco: "",
        numero_endereco: "",
        cidade: "",
        estado: "",
        cep: "",
        plano_id: "",
        valor_plano: 0,
        observacoes: "",
        unidade_id: "",
        id_beneficiario_tipo: 1,
        codigo_externo: "",
        empresa_id: "",
      });
      setDependentes([]);
      setGeneratePaymentLink(true); // Reset toggle para valor padrão
      onClose();
    } catch (error: unknown) {
      console.error('Erro ao criar adesão:', error);
      toast({
        title: "Erro ao criar adesão",
        description: error instanceof Error ? error.message : "Ocorreu um erro inesperado",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  const buscarCEP = async (cep: string) => {
    if (cep.length === 8) {
      try {
        const { buscarCEPSeguro } = await import('@/utils/apiSecurity');
        const result = await buscarCEPSeguro(cep);
        
        if (result.success && result.data) {
          setBeneficiario({
            ...beneficiario,
            cep: result.data.cep,
            endereco: result.data.logradouro ? `${result.data.logradouro}, ${result.data.bairro}` : '',
            cidade: result.data.localidade,
            estado: result.data.uf,
          });
        }
      } catch (error) {
        console.error('Erro ao buscar CEP:', error);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Nova Adesão de Beneficiário
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Dados Pessoais */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Dados Pessoais</h4>
            
            <div>
              <Label htmlFor="nome">Nome Completo *</Label>
              <Input
                id="nome"
                value={beneficiario.nome}
                onChange={(e) => setBeneficiario({ ...beneficiario, nome: e.target.value })}
                placeholder="Nome completo"
              />
            </div>

            <div>
              <Label htmlFor="cpf">CPF *</Label>
              <Input
                id="cpf"
                value={beneficiario.cpf}
                onChange={(e) => {
                  const cleanCpf = e.target.value.replace(/\D/g, '');
                  setBeneficiario({ ...beneficiario, cpf: cleanCpf });

                  // Clear error when user starts typing
                  if (cpfError) setCpfError('');

                  // Validate CPF in real-time if has 11 digits
                  if (cleanCpf.length === 11) {
                    const error = validateCPFWithMessage(cleanCpf);
                    setCpfError(error || '');
                  }
                }}
                placeholder="00000000000"
                maxLength={11}
                className={cpfError ? "border-red-500" : ""}
              />
              {cpfError && (
                <p className="text-sm text-red-500 mt-1">{cpfError}</p>
              )}
            </div>

            <div>
              <Label htmlFor="email">E-mail *</Label>
              <Input
                id="email"
                type="email"
                value={beneficiario.email}
                onChange={(e) => setBeneficiario({ ...beneficiario, email: e.target.value.toLowerCase() })}
                placeholder="email@exemplo.com"
              />
            </div>

            <div>
              <Label htmlFor="telefone">Telefone *</Label>
              <Input
                id="telefone"
                value={beneficiario.telefone}
                onChange={(e) => setBeneficiario({ ...beneficiario, telefone: e.target.value })}
                placeholder="(11) 99999-9999"
              />
            </div>

            <div>
              <Label htmlFor="data_nascimento">Data de Nascimento</Label>
              <Input
                id="data_nascimento"
                type="date"
                value={beneficiario.data_nascimento}
                onChange={(e) => setBeneficiario({ ...beneficiario, data_nascimento: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="codigo_externo">Código Externo</Label>
              <Input
                id="codigo_externo"
                value={beneficiario.codigo_externo}
                onChange={(e) => setBeneficiario({ ...beneficiario, codigo_externo: e.target.value })}
                placeholder="Código de referência (opcional)"
              />
            </div>

            <div>
              <Label htmlFor="observacoes">Observações</Label>
              <Input
                id="observacoes"
                value={beneficiario.observacoes}
                onChange={(e) => setBeneficiario({ ...beneficiario, observacoes: e.target.value })}
                placeholder="Observações gerais"
              />
            </div>
          </div>

          {/* Endereço e Plano */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Endereço</h4>
            
            <div>
              <Label htmlFor="cep">CEP</Label>
              <Input
                id="cep"
                value={beneficiario.cep}
                onChange={(e) => {
                  const cep = e.target.value.replace(/\D/g, '');
                  setBeneficiario({ ...beneficiario, cep });
                  if (cep.length === 8) {
                    buscarCEP(cep);
                  }
                }}
                placeholder="00000-000"
              />
            </div>

            <div>
              <Label htmlFor="endereco">Endereço Completo</Label>
              <Input
                id="endereco"
                value={beneficiario.endereco}
                onChange={(e) => setBeneficiario({ ...beneficiario, endereco: e.target.value })}
                placeholder="Rua, bairro"
              />
            </div>

            <div>
              <Label htmlFor="numero_endereco">Número *</Label>
              <Input
                id="numero_endereco"
                value={beneficiario.numero_endereco}
                onChange={(e) => setBeneficiario({ ...beneficiario, numero_endereco: e.target.value })}
                placeholder="Número"
              />
            </div>

            <div>
              <Label htmlFor="cidade">Cidade</Label>
              <Input
                id="cidade"
                value={beneficiario.cidade}
                onChange={(e) => setBeneficiario({ ...beneficiario, cidade: e.target.value })}
                placeholder="Nome da cidade"
              />
            </div>

            <div>
              <Label htmlFor="estado">Estado</Label>
              <Select
                value={beneficiario.estado}
                onValueChange={(value) => setBeneficiario({ ...beneficiario, estado: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Estado..." />
                </SelectTrigger>
                <SelectContent>
                  {estadosBrasil.map((estado) => (
                    <SelectItem key={estado} value={estado}>{estado}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <h4 className="font-semibold text-foreground pt-4">Unidade e Plano</h4>

            <div>
              <Label htmlFor="unidade_id">Unidade</Label>
              <Select
                value={beneficiario.unidade_id}
                onValueChange={(value) => setBeneficiario({ ...beneficiario, unidade_id: value })}
                disabled={isLoadingUnidades}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a unidade..." />
                </SelectTrigger>
                <SelectContent>
                  {unidades.map((unidade) => (
                    <SelectItem key={unidade.id} value={unidade.id}>
                      {unidade.nome} - {unidade.cidade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="id_beneficiario_tipo">Tipo de Beneficiário *</Label>
              <Select
                value={beneficiario.id_beneficiario_tipo.toString()}
                onValueChange={(value) => setBeneficiario({ ...beneficiario, id_beneficiario_tipo: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">TITULAR</SelectItem>
                  <SelectItem value="3">DEPENDENTE</SelectItem>
                  <SelectItem value="5">RESPONSÁVEL FINANCEIRO</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="plano_id">Tipo de Plano *</Label>
              <Select
                value={beneficiario.plano_id}
                onValueChange={(value) => setBeneficiario({ ...beneficiario, plano_id: value })}
                disabled={isLoadingPlanos}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o plano..." />
                </SelectTrigger>
                <SelectContent>
                  {planos.map((plano) => (
                    <SelectItem key={plano.id} value={plano.id}>
                      {plano.nome} - R$ {Number(plano.valor).toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="empresa_id">Empresa (Opcional)</Label>
              <Select
                value={beneficiario.empresa_id}
                onValueChange={(value) => setBeneficiario({ ...beneficiario, empresa_id: value })}
                disabled={isLoadingEmpresas}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma empresa (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  {empresasUsuario.map((empresa) => (
                    <SelectItem key={empresa.id} value={empresa.id}>
                      {empresa.razao_social} - {empresa.cidade}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Seção de Dependentes para Plano Familiar */}
        {isPlanoFamiliar && (
          <div className="mt-6">
            <DependentesForm
              dependentes={dependentes}
              onDependentesChange={setDependentes}
              disabled={isCreating}
            />
          </div>
        )}

        {/* Toggle para gerar link de pagamento */}
        <div className="mt-6 p-4 bg-muted/50 rounded-lg border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              <div>
                <Label htmlFor="generate-payment-link" className="text-sm font-medium cursor-pointer">
                  Gerar link de pagamento
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {generatePaymentLink
                    ? "Um link de pagamento será gerado automaticamente"
                    : "O beneficiário será salvo sem link de pagamento"}
                </p>
              </div>
            </div>
            <Switch
              id="generate-payment-link"
              checked={generatePaymentLink}
              onCheckedChange={setGeneratePaymentLink}
              disabled={isCreating}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            onClick={() => onSubmit(beneficiario)}
            disabled={isCreating || !beneficiario.nome || !beneficiario.cpf || !beneficiario.email}
          >
            {isCreating ? (
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Processar Adesão
              </>
            )}
          </Button>
        </div>
      </DialogContent>
      
      <ApiStatusIndicator 
        status={apiStatus} 
        message={apiMessage}
        showDetails={true}
      />
    </Dialog>
  );
}
