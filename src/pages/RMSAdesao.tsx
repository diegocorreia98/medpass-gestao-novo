import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Send, Copy, CheckCircle2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { usePlanos } from "@/hooks/usePlanos";
import { useUnidades } from "@/hooks/useUnidades";

interface AdesaoFormData {
  // Campos obrigatórios
  idClienteContrato: string;
  idBeneficiarioTipo: string;
  unidadeId: string;
  nome: string;
  codigoExterno: string;
  cpf: string;
  cpfTitular: string;
  dataNascimento: string;
  celular: string;
  email: string;
  cep: string;
  numero: string;
  uf: string;
  tipoPlano: string;
}

export default function RMSAdesao() {
  const { toast } = useToast();
  const { planos, isLoading: loadingPlanos } = usePlanos();
  const { unidades, isLoading: loadingUnidades } = useUnidades();
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<AdesaoFormData>({
    idClienteContrato: "",
    idBeneficiarioTipo: "1",
    unidadeId: "",
    nome: "",
    codigoExterno: "",
    cpf: "",
    cpfTitular: "",
    dataNascimento: "",
    celular: "",
    email: "",
    cep: "",
    numero: "",
    uf: "SP",
    tipoPlano: "",
  });

  // Buscar ID_CLIENTE_CONTRATO das secrets
  useEffect(() => {
    const fetchIdClienteContrato = async () => {
      const { data: settings, error: settingsError } = await supabase
        .from('api_settings')
        .select('setting_value')
        .eq('setting_name', 'ID_CLIENTE_CONTRATO')
        .maybeSingle();

      if (settings && settings.setting_value) {
        setFormData(prev => ({ ...prev, idClienteContrato: settings.setting_value }));
      }
    };

    fetchIdClienteContrato();
  }, []);

  // Auto-gerar codigoExterno quando o CPF mudar
  useEffect(() => {
    if (formData.cpf && formData.cpf.replace(/\D/g, '').length >= 6) {
      const timestamp = Date.now().toString().slice(-6);
      const cpfNumbers = formData.cpf.replace(/\D/g, '').slice(0, 6);
      const codigo = `MP${cpfNumbers}${timestamp}`.slice(0, 15);
      setFormData(prev => ({ ...prev, codigoExterno: codigo }));
    }
  }, [formData.cpf]);

  const handleInputChange = (field: keyof AdesaoFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const formatDateForAPI = (dateString: string) => {
    // Converter de YYYY-MM-DD para DDMMYYYY
    const [year, month, day] = dateString.split('-');
    return `${day}${month}${year}`;
  };

  const cleanCPF = (cpf: string) => {
    return cpf.replace(/\D/g, '');
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      // Buscar ID_CLIENTE da configuração
      const { data: idClienteData, error: idClienteError } = await supabase
        .from('api_settings')
        .select('setting_value')
        .eq('setting_name', 'ID_CLIENTE')
        .maybeSingle();

      if (idClienteError || !idClienteData) {
        throw new Error('ID_CLIENTE não configurado. Configure em Configurações.');
      }

      const idCliente = parseInt(idClienteData.setting_value);

      // Validar campos obrigatórios pela API RMS V4.3
      // Obrigatórios: idCliente, idClienteContrato, idBeneficiarioTipo, nome, codigoExterno, cpf, dataNascimento, celular, email, cep, numero, uf, tipoPlano
      // Se dependente (tipo 3): cpfTitular também é obrigatório
      if (!formData.nome || !formData.codigoExterno || !formData.cpf || !formData.dataNascimento ||
          !formData.celular || !formData.email || !formData.cep || !formData.numero ||
          !formData.uf || !formData.tipoPlano) {
        throw new Error('Preencha todos os campos obrigatórios marcados com *');
      }

      // Se for dependente, cpfTitular é obrigatório
      if (formData.idBeneficiarioTipo === "3" && !formData.cpfTitular) {
        throw new Error('CPF do Titular é obrigatório para dependentes');
      }

      // Validar se o tipoPlano é um UUID (não tem codigo_rms)
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(formData.tipoPlano);
      if (isUUID) {
        throw new Error('O plano selecionado não possui código RMS. Configure o código RMS do plano em Configurações > Planos.');
      }

      // Preparar payload conforme documentação RMS
      const payload: any = {
        idCliente: idCliente,
        idClienteContrato: parseInt(formData.idClienteContrato),
        idBeneficiarioTipo: parseInt(formData.idBeneficiarioTipo),
        nome: formData.nome.toUpperCase().trim(),
        codigoExterno: formData.codigoExterno.trim(),
        cpf: cleanCPF(formData.cpf),
        dataNascimento: formatDateForAPI(formData.dataNascimento),
        celular: cleanCPF(formData.celular),
        email: formData.email.toUpperCase().trim(),
        cep: cleanCPF(formData.cep),
        numero: formData.numero.trim(),
        uf: formData.uf,
        tipoPlano: formData.tipoPlano.trim(),
      };

      // Adicionar cpfTitular se for dependente
      if (formData.idBeneficiarioTipo === "3" && formData.cpfTitular) {
        payload.cpfTitular = cleanCPF(formData.cpfTitular);
      }

      console.log('Enviando para RMS via Edge Function:', payload);

      // Chamar Edge Function que faz a requisição para a API RMS
      const { data: responseData, error: functionError } = await supabase.functions.invoke('rms-adesao-manual', {
        body: payload,
      });

      console.log('Resposta da Edge Function:', { responseData, functionError });

      if (functionError) {
        throw new Error(functionError.message || 'Erro ao chamar Edge Function');
      }

      if (responseData?.error) {
        throw new Error(responseData.error);
      }

      setResponse(responseData);

      // Logar a chamada
      await supabase.functions.invoke('log-api-call', {
        body: {
          operation: 'adesao_manual',
          requestData: payload,
          responseData,
          status: 'success',
        }
      });

      toast({
        title: "Adesão enviada com sucesso!",
        description: responseData.mensagem || "Beneficiário cadastrado na RMS",
      });

    } catch (err: any) {
      console.error('Erro ao enviar adesão:', err);

      let errorMessage = err.message || 'Erro desconhecido ao enviar adesão';

      // Tratamento de erros comuns
      if (err.message?.includes('Failed to invoke')) {
        errorMessage = 'Erro ao invocar Edge Function. Verifique as configurações.';
      }

      setError(errorMessage);

      // Logar o erro
      await supabase.functions.invoke('log-api-call', {
        body: {
          operation: 'adesao_manual',
          requestData: payload,
          responseData: null,
          status: 'error',
          errorMessage: errorMessage,
        }
      }).catch(console.error);

      toast({
        title: "Erro ao enviar adesão",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: "Resposta copiada para a área de transferência",
    });
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Adesão Direta RMS</h1>
        <p className="text-muted-foreground">
          Envie adesões diretamente para a API da Rede Mais Saúde
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados do Beneficiário</CardTitle>
          <CardDescription>
            Preencha os dados conforme a documentação da API RMS V4.3
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Tipo de Beneficiário e Unidade */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="idBeneficiarioTipo">
                  Tipo de Beneficiário <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.idBeneficiarioTipo}
                  onValueChange={(value) => handleInputChange('idBeneficiarioTipo', value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 - Titular</SelectItem>
                    <SelectItem value="3">3 - Dependente</SelectItem>
                    <SelectItem value="5">5 - Responsável Financeiro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="unidadeId">
                  Unidade <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.unidadeId}
                  onValueChange={(value) => handleInputChange('unidadeId', value)}
                  required
                  disabled={loadingUnidades}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingUnidades ? "Carregando..." : "Selecione uma unidade"} />
                  </SelectTrigger>
                  <SelectContent>
                    {unidades.map((unidade) => (
                      <SelectItem key={unidade.id} value={unidade.id}>
                        {unidade.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="idClienteContrato">
                  ID Cliente Contrato (RMS) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="idClienteContrato"
                  type="number"
                  value={formData.idClienteContrato}
                  onChange={(e) => handleInputChange('idClienteContrato', e.target.value)}
                  placeholder="999999999"
                  required
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Preenchido automaticamente das configurações
                </p>
              </div>
            </div>

            {/* Dados Pessoais */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Dados Pessoais</h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <Label htmlFor="nome">
                    Nome Completo <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => handleInputChange('nome', e.target.value)}
                    placeholder="NOME COMPLETO DO BENEFICIÁRIO"
                    maxLength={100}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cpf">
                    CPF <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="cpf"
                    value={formData.cpf}
                    onChange={(e) => handleInputChange('cpf', e.target.value)}
                    placeholder="000.000.000-00"
                    maxLength={14}
                    required
                  />
                </div>

                {formData.idBeneficiarioTipo === "3" && (
                  <div className="space-y-2">
                    <Label htmlFor="cpfTitular">
                      CPF do Titular <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="cpfTitular"
                      value={formData.cpfTitular}
                      onChange={(e) => handleInputChange('cpfTitular', e.target.value)}
                      placeholder="000.000.000-00"
                      maxLength={14}
                      required
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="dataNascimento">
                    Data de Nascimento <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="dataNascimento"
                    type="date"
                    value={formData.dataNascimento}
                    onChange={(e) => handleInputChange('dataNascimento', e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="codigoExterno">
                    Código Externo <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="codigoExterno"
                    value={formData.codigoExterno}
                    placeholder="Gerado automaticamente"
                    maxLength={50}
                    required
                    readOnly
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">
                    Código único gerado automaticamente a partir do CPF
                  </p>
                </div>
              </div>

            </div>

            {/* Contato */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Contato</h3>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="celular">
                    Celular <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="celular"
                    value={formData.celular}
                    onChange={(e) => handleInputChange('celular', e.target.value)}
                    placeholder="11999999999"
                    maxLength={11}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="email@exemplo.com"
                    maxLength={100}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Endereço */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Endereço</h3>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cep">
                    CEP <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="cep"
                    value={formData.cep}
                    onChange={(e) => handleInputChange('cep', e.target.value)}
                    placeholder="04578000"
                    maxLength={8}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="numero">
                    Número <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="numero"
                    value={formData.numero}
                    onChange={(e) => handleInputChange('numero', e.target.value)}
                    placeholder="123"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="uf">
                    UF <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.uf}
                    onValueChange={(value) => handleInputChange('uf', value)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AC">AC</SelectItem>
                      <SelectItem value="AL">AL</SelectItem>
                      <SelectItem value="AP">AP</SelectItem>
                      <SelectItem value="AM">AM</SelectItem>
                      <SelectItem value="BA">BA</SelectItem>
                      <SelectItem value="CE">CE</SelectItem>
                      <SelectItem value="DF">DF</SelectItem>
                      <SelectItem value="ES">ES</SelectItem>
                      <SelectItem value="GO">GO</SelectItem>
                      <SelectItem value="MA">MA</SelectItem>
                      <SelectItem value="MT">MT</SelectItem>
                      <SelectItem value="MS">MS</SelectItem>
                      <SelectItem value="MG">MG</SelectItem>
                      <SelectItem value="PA">PA</SelectItem>
                      <SelectItem value="PB">PB</SelectItem>
                      <SelectItem value="PR">PR</SelectItem>
                      <SelectItem value="PE">PE</SelectItem>
                      <SelectItem value="PI">PI</SelectItem>
                      <SelectItem value="RJ">RJ</SelectItem>
                      <SelectItem value="RN">RN</SelectItem>
                      <SelectItem value="RS">RS</SelectItem>
                      <SelectItem value="RO">RO</SelectItem>
                      <SelectItem value="RR">RR</SelectItem>
                      <SelectItem value="SC">SC</SelectItem>
                      <SelectItem value="SP">SP</SelectItem>
                      <SelectItem value="SE">SE</SelectItem>
                      <SelectItem value="TO">TO</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Plano */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Plano</h3>

              <div className="space-y-2">
                <Label htmlFor="tipoPlano">
                  Tipo de Plano <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.tipoPlano}
                  onValueChange={(value) => handleInputChange('tipoPlano', value)}
                  required
                  disabled={loadingPlanos}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingPlanos ? "Carregando planos..." : "Selecione um plano"} />
                  </SelectTrigger>
                  <SelectContent>
                    {planos.map((plano) => (
                      <SelectItem key={plano.id} value={plano.rms_plan_code || plano.id}>
                        {plano.nome} {plano.rms_plan_code ? `(RMS: ${plano.rms_plan_code})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Selecione o plano cadastrado no sistema
                </p>
              </div>
            </div>

            {/* Botão de Envio */}
            <div className="flex gap-4">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Enviar Adesão para RMS
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Resposta */}
      {response && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              Resposta da API RMS
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Alert>
                <AlertDescription>
                  <strong>Mensagem:</strong> {response.mensagem}
                </AlertDescription>
              </Alert>

              {response.capNumeroSerie && (
                <Alert>
                  <AlertDescription>
                    <strong>Capitalização - Número de Série:</strong> {response.capNumeroSerie}
                  </AlertDescription>
                </Alert>
              )}

              {response.capNumeroSorte && (
                <Alert>
                  <AlertDescription>
                    <strong>Capitalização - Número de Sorte:</strong> {response.capNumeroSorte}
                  </AlertDescription>
                </Alert>
              )}

              <div className="bg-muted p-4 rounded-md">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Resposta completa (JSON):</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => copyToClipboard(JSON.stringify(response, null, 2))}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copiar
                  </Button>
                </div>
                <pre className="text-xs overflow-auto max-h-64">
                  {JSON.stringify(response, null, 2)}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Erro */}
      {error && (
        <Card className="mt-6 border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Erro ao Enviar Adesão
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
