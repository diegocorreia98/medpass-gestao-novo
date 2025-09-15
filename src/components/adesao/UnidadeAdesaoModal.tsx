import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { UserPlus, MapPin, Loader2, DollarSign } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { usePlanos } from "@/hooks/usePlanos";
import { useUnidades } from "@/hooks/useUnidades";
import { useEmpresas } from "@/hooks/useEmpresas";
import { useAuth } from "@/contexts/AuthContext";
import { ApiStatusIndicator } from "@/components/adesao/ApiStatusIndicator";
import { DependentesForm, type DependenteFormData } from "@/components/adesao/DependentesForm";

interface UnidadeAdesaoModalProps {
  open: boolean;
  onClose: () => void;
}

interface BeneficiarioFormData {
  nome: string;
  cpf: string;
  data_nascimento: string;
  telefone: string;
  email: string;
  cep: string;
  endereco: string;
  cidade: string;
  estado: string;
  plano_id: string;
  observacoes: string;
  empresa_id: string;
}

const estadosBrasil = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"];

export function UnidadeAdesaoModal({ open, onClose }: UnidadeAdesaoModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { planos } = usePlanos();
  const { unidades } = useUnidades();
  const { empresas, isLoading: isLoadingEmpresas } = useEmpresas();
    const [isCreating, setIsCreating] = useState(false);

    const onSubmit = async (values: any) => {
      try {
        setIsCreating(true);
        
        if (!minhaUnidade?.id && !user?.id) {
          throw new Error('Usuário ou unidade não encontrada');
        }
        
        // Get plan details for price
        const planoSelecionado = planos.find(p => p.id === values.plano_id);
        if (!planoSelecionado) {
          throw new Error('Plano não encontrado');
        }

        console.log('🔄 [UNIDADE-ADESAO] Iniciando criação de adesão', {
          unidade: minhaUnidade?.nome,
          cliente: values.nome,
          plano: planoSelecionado.nome
        });

        // ✅ STEP 1: Save beneficiary FIRST to ensure data persistence
        const { data: beneficiarioData, error: beneficiarioError } = await supabase
          .from('beneficiarios')
          .insert({
            user_id: user?.id,
            unidade_id: minhaUnidade?.id || null,
            empresa_id: values.empresa_id || null,
            plano_id: values.plano_id,
            nome: values.nome,
            cpf: values.cpf,
            email: values.email || null,
            telefone: values.telefone || null,
            data_nascimento: values.data_nascimento || null,
            endereco: values.endereco || null,
            cidade: values.cidade || null,
            estado: values.estado || null,
            cep: values.cep || null,
            valor_plano: planoSelecionado.valor,
            observacoes: values.observacoes || null,
            status: 'pendente', // Status pendente até confirmação do pagamento
            payment_status: 'payment_requested' // Status válido conforme constraint
          })
          .select()
          .single();

        if (beneficiarioError) {
          console.error('❌ [UNIDADE-ADESAO] Erro ao salvar beneficiário:', beneficiarioError);
          throw new Error('Erro ao salvar beneficiário: ' + beneficiarioError.message);
        }

        console.log('✅ [UNIDADE-ADESAO] Beneficiário salvo com sucesso:', beneficiarioData.id);

        // ✅ STEP 2: Gerar CHECKOUT TRANSPARENTE (conforme especificação)
        let checkoutUrl = null;
        
        try {
          console.log('🔄 [UNIDADE-ADESAO] Gerando checkout transparente');
          
          // ✅ CORREÇÃO: Gerar link para CHECKOUT TRANSPARENTE onde cliente escolhe método
          const baseUrl = window.location.origin;
          const checkoutParams = new URLSearchParams({
            plan_id: values.plano_id,
            customer_name: values.nome,
            customer_email: values.email || '',
            customer_document: values.cpf,
            customer_phone: values.telefone || '',
            // Adicionar dados de endereço se disponível
            customer_address: values.endereco || '',
            customer_city: values.cidade || '',
            customer_state: values.estado || '',
            customer_zipcode: values.cep || '',
            // Metadata da adesão
            unidade_id: minhaUnidade?.id || '',
            empresa_id: values.empresa_id || '',
            beneficiario_id: beneficiarioData.id
          });
          
          // ✅ LINK PARA CHECKOUT TRANSPARENTE (cliente escolhe método)
          checkoutUrl = `${baseUrl}/checkout/transparent?${checkoutParams.toString()}`;
          
          console.log('✅ [UNIDADE-ADESAO] Checkout transparente URL gerada:', checkoutUrl);
          
          // Salvar link no beneficiário
          const { error: updateError } = await supabase
            .from('beneficiarios')
            .update({ 
              checkout_link: checkoutUrl,
              payment_status: 'link_generated' // Status indicando que link foi gerado
            })
            .eq('id', beneficiarioData.id);

          if (updateError) {
            console.warn('⚠️ [UNIDADE-ADESAO] Erro ao salvar link:', updateError.message);
          } else {
            console.log('✅ [UNIDADE-ADESAO] Link de checkout transparente salvo');
          }

        } catch (linkError) {
          console.warn('⚠️ [UNIDADE-ADESAO] Erro na geração de link transparente:', linkError);
          // Beneficiário já foi salvo, não é erro crítico
        }

        console.log('✅ [UNIDADE-ADESAO] Processo concluído com sucesso');
        
        // Show success message based on whether checkout link was generated
        toast({
          title: "Adesão criada com sucesso! 🎉",
          description: checkoutUrl 
            ? "Beneficiário salvo e link de pagamento gerado."
            : "Beneficiário salvo. Link de pagamento pode ser gerado posteriormente.",
          variant: "default"
        });

        // Show payment link if available
        if (checkoutUrl) {
          toast({
            title: "Link de pagamento disponível 🔗",
            description: "Compartilhe o link com o cliente para efetuar o pagamento",
            action: (
              <Button
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(checkoutUrl);
                  toast({ title: "Link copiado!", description: "Link copiado para a área de transferência" });
                }}
              >
                Copiar Link
              </Button>
            )
          });
        }
        
        // Reset form
        setBeneficiario({
          nome: "",
          cpf: "",
          data_nascimento: "",
          telefone: "",
          email: "",
          cep: "",
          endereco: "",
          cidade: "",
          estado: "",
          plano_id: "",
          observacoes: "",
          empresa_id: "",
        });
        onClose();
      } catch (error: any) {
        console.error('Erro ao criar adesão:', error);
        toast({
          title: "Erro ao criar adesão",
          description: error.message || "Ocorreu um erro inesperado",
          variant: "destructive"
        });
      } finally {
        setIsCreating(false);
      }
    };
  
  const [beneficiario, setBeneficiario] = useState<BeneficiarioFormData>({
    nome: "",
    cpf: "",
    data_nascimento: "",
    telefone: "",
    email: "",
    cep: "",
    endereco: "",
    cidade: "",
    estado: "",
    plano_id: "",
    observacoes: "",
    empresa_id: "",
  });

  // Filtrar empresas do usuário
  const empresasUsuario = user ? empresas.filter(empresa => 
    // Unit users can see only their own companies
    empresa.user_id === user.id
  ) : [];
  
  const [dependentes, setDependentes] = useState<DependenteFormData[]>([]);
  const [apiStatus, setApiStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [apiMessage, setApiMessage] = useState('');

  // Buscar unidade do usuário logado
  const minhaUnidade = unidades.find(u => u.user_id === user?.id);

  // Debug logs para verificar unidade
  console.log('[UNIDADE-MODAL] User ID:', user?.id);
  console.log('[UNIDADE-MODAL] Unidades disponíveis:', unidades.length);
  console.log('[UNIDADE-MODAL] Minha unidade:', minhaUnidade);

  // Buscar plano selecionado
  const planoSelecionado = planos.find(p => p.id === beneficiario.plano_id);
  const isPlanoFamiliar = planoSelecionado?.nome.toLowerCase().includes('familiar');

  // Validar campos obrigatórios
  const nome = beneficiario.nome.trim();
  const cpf = beneficiario.cpf.trim(); 
  const dataNascimento = beneficiario.data_nascimento;
  const telefone = beneficiario.telefone.trim();
  const email = beneficiario.email.trim();
  const planoId = beneficiario.plano_id;
  
  console.log('[UNIDADE-MODAL] Campos individuais:', {
    nome: nome.length > 0,
    cpf: cpf.length > 0,
    dataNascimento: !!dataNascimento,
    telefone: telefone.length > 0,
    email: email.length > 0,
    planoId: !!planoId,
    isCreating
  });
  
  const todosPreenchidos = nome.length > 0 && 
                          cpf.length > 0 && 
                          !!dataNascimento && 
                          telefone.length > 0 && 
                          email.length > 0 && 
                          !!planoId;
                          
  const podeEnviar = todosPreenchidos && !isCreating;

  console.log('[UNIDADE-MODAL] Campos obrigatórios preenchidos:', todosPreenchidos);
  console.log('[UNIDADE-MODAL] isCreating:', isCreating);
  console.log('[UNIDADE-MODAL] Pode enviar:', podeEnviar);
  
  // Se não há unidade, vamos mostrar aviso mas permitir continuar
  if (!minhaUnidade && user) {
    console.warn('[UNIDADE-MODAL] Usuário sem unidade cadastrada. Processando mesmo assim.');
  }

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
            estado: result.data.uf
          });
        }
      } catch (error) {
        console.error('Erro ao buscar CEP:', error);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Nova Adesão de Beneficiário
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Formulário Principal */}
          <div className="xl:col-span-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Dados do Beneficiário
                </CardTitle>
                <CardDescription>Preencha todas as informações necessárias</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Dados Pessoais */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-foreground">Dados Pessoais</h4>
                    
                    <div>
                      <Label htmlFor="nome">Nome Completo *</Label>
                      <Input 
                        id="nome" 
                        value={beneficiario.nome} 
                        onChange={e => setBeneficiario({...beneficiario, nome: e.target.value})} 
                        placeholder="Nome completo" 
                        disabled={isCreating} 
                      />
                    </div>

                    <div>
                      <Label htmlFor="cpf">CPF *</Label>
                      <Input 
                        id="cpf" 
                        value={beneficiario.cpf} 
                        onChange={e => setBeneficiario({...beneficiario, cpf: e.target.value})} 
                        placeholder="000.000.000-00" 
                        disabled={isCreating} 
                      />
                    </div>

                    <div>
                      <Label htmlFor="data_nascimento">Data de Nascimento *</Label>
                      <Input 
                        id="data_nascimento" 
                        type="date" 
                        value={beneficiario.data_nascimento} 
                        onChange={e => setBeneficiario({...beneficiario, data_nascimento: e.target.value})} 
                        disabled={isCreating} 
                      />
                    </div>

                    <div>
                      <Label htmlFor="telefone">Telefone *</Label>
                      <Input 
                        id="telefone" 
                        value={beneficiario.telefone} 
                        onChange={e => setBeneficiario({...beneficiario, telefone: e.target.value})} 
                        placeholder="(11) 99999-9999" 
                        disabled={isCreating} 
                      />
                    </div>

                    <div>
                      <Label htmlFor="email">E-mail *</Label>
                      <Input 
                        id="email" 
                        type="email" 
                        value={beneficiario.email} 
                        onChange={e => setBeneficiario({...beneficiario, email: e.target.value})} 
                        placeholder="email@exemplo.com" 
                        disabled={isCreating} 
                      />
                    </div>
                  </div>

                  {/* Endereço e Plano */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-foreground">Endereço</h4>
                    
                    <div>
                      <Label htmlFor="cep">CEP</Label>
                      <div className="relative">
                        <Input 
                          id="cep" 
                          value={beneficiario.cep} 
                          onChange={e => {
                            const cep = e.target.value.replace(/\D/g, '');
                            setBeneficiario({...beneficiario, cep});
                            if (cep.length === 8) {
                              buscarCEP(cep);
                            }
                          }} 
                          placeholder="00000-000" 
                          disabled={isCreating} 
                        />
                        <MapPin className="h-4 w-4 absolute right-3 top-3 text-muted-foreground" />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="endereco">Endereço</Label>
                      <Input 
                        id="endereco" 
                        value={beneficiario.endereco} 
                        onChange={e => setBeneficiario({...beneficiario, endereco: e.target.value})} 
                        placeholder="Rua, número, bairro" 
                        disabled={isCreating} 
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="cidade">Cidade</Label>
                        <Input 
                          id="cidade" 
                          value={beneficiario.cidade} 
                          onChange={e => setBeneficiario({...beneficiario, cidade: e.target.value})} 
                          placeholder="Nome da cidade" 
                          disabled={isCreating} 
                        />
                      </div>

                      <div>
                        <Label htmlFor="estado">Estado</Label>
                        <Select 
                          value={beneficiario.estado} 
                          onValueChange={value => setBeneficiario({...beneficiario, estado: value})} 
                          disabled={isCreating}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="UF" />
                          </SelectTrigger>
                          <SelectContent>
                            {estadosBrasil.map(estado => (
                              <SelectItem key={estado} value={estado}>{estado}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="plano_id">Plano *</Label>
                      <Select 
                        value={beneficiario.plano_id} 
                        onValueChange={value => setBeneficiario({...beneficiario, plano_id: value})} 
                        disabled={isCreating}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o plano..." />
                        </SelectTrigger>
                        <SelectContent>
                          {planos.map(plano => (
                            <SelectItem key={plano.id} value={plano.id}>
                              {plano.nome} - R$ {plano.valor.toFixed(2)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="empresa_id">Empresa (Opcional)</Label>
                      <Select 
                        value={beneficiario.empresa_id} 
                        onValueChange={value => setBeneficiario({...beneficiario, empresa_id: value})} 
                        disabled={isLoadingEmpresas || isCreating}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma empresa (opcional)" />
                        </SelectTrigger>
                        <SelectContent>
                          {empresasUsuario.map(empresa => (
                            <SelectItem key={empresa.id} value={empresa.id}>
                              {empresa.razao_social} - {empresa.cidade}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="observacoes">Observações</Label>
                      <Input 
                        id="observacoes" 
                        value={beneficiario.observacoes} 
                        onChange={e => setBeneficiario({...beneficiario, observacoes: e.target.value})} 
                        placeholder="Observações adicionais" 
                        disabled={isCreating} 
                      />
                    </div>
                  </div>
                </div>

                {/* Seção de Dependentes para Plano Familiar */}
                {isPlanoFamiliar && (
                  <div className="mt-8">
                    <DependentesForm
                      dependentes={dependentes}
                      onDependentesChange={setDependentes}
                      disabled={isCreating}
                    />
                  </div>
                )}

                <div className="flex justify-end gap-4 mt-8">
                  <Button onClick={onClose} variant="outline" disabled={isCreating}>
                    Cancelar
                  </Button>
                  <Button onClick={() => onSubmit(beneficiario)} disabled={!podeEnviar} size="lg">
                    {isCreating ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processando...
                      </>
                     ) : (
                       <>
                         <UserPlus className="h-4 w-4 mr-2" />
                         Processar Adesão
                       </>
                     )}
                  </Button>
                </div>

                {/* Status da API */}
                {apiStatus !== 'idle' && (
                  <div className="mt-4">
                    <ApiStatusIndicator status={apiStatus} message={apiMessage} />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar com Informações */}
          <div className="space-y-6">
            {/* Resumo do Plano */}
            {planoSelecionado && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Resumo do Plano</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium">{planoSelecionado.nome}</h4>
                    <p className="text-2xl font-bold text-primary">
                      R$ {planoSelecionado.valor.toFixed(2)}
                      <span className="text-sm font-normal">/mês</span>
                    </p>
                    {planoSelecionado.descricao && (
                      <p className="text-sm text-muted-foreground mt-2">
                        {planoSelecionado.descricao}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                    <DollarSign className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="text-sm font-medium">Suas Comissões</p>
                      <div className="space-y-2">
                        <div className="p-2 bg-green-50 rounded">
                          <p className="text-sm font-medium text-green-700">Adesão (1ª vez)</p>
                          <p className="text-lg font-bold text-green-600">
                            R$ {(planoSelecionado.valor * (planoSelecionado.comissao_adesao_percentual || 100) / 100).toFixed(2)}
                          </p>
                          <p className="text-xs text-green-600">
                            {planoSelecionado.comissao_adesao_percentual || 100}% do valor do plano
                          </p>
                        </div>
                        
                        <div className="p-2 bg-blue-50 rounded">
                          <p className="text-sm font-medium text-blue-700">Recorrente (mensal)</p>
                          <p className="text-lg font-bold text-blue-600">
                            R$ {(planoSelecionado.valor * (planoSelecionado.comissao_recorrente_percentual || 30) / 100).toFixed(2)}
                            <span className="text-sm font-normal">/mês</span>
                          </p>
                          <p className="text-xs text-blue-600">
                            {planoSelecionado.comissao_recorrente_percentual || 30}% do valor do plano
                          </p>
                        </div>
                      </div>
                      {isPlanoFamiliar && dependentes.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-2">
                          Inclui {dependentes.length} dependente{dependentes.length > 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Informações da Unidade */}
            {minhaUnidade && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Sua Unidade</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="font-medium">{minhaUnidade.nome}</p>
                  <p className="text-sm text-muted-foreground">{minhaUnidade.cidade}, {minhaUnidade.estado}</p>
                  <Separator />
                  <p className="text-sm text-muted-foreground">• Processamento automático</p>
                  <p className="text-sm text-muted-foreground">• Comissão gerada automaticamente</p>
                  <p className="text-sm text-muted-foreground">• Sincronização com API externa</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}