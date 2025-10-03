import { useState } from "react";
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

interface AdesaoFormData {
  // Campos obrigatórios
  idClienteContrato: string;
  idBeneficiarioTipo: string;
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

  // Campos opcionais
  nomeSocial?: string;
  rg?: string;
  sexo?: string;
  estadoCivil?: string;
  nomeMae?: string;
  telefone?: string;
  telefoneComercial?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
}

export default function RMSAdesao() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<AdesaoFormData>({
    idClienteContrato: "",
    idBeneficiarioTipo: "1",
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

  const generateCodigoExterno = () => {
    // Gerar código baseado no timestamp e CPF
    const timestamp = Date.now().toString().slice(-6); // Últimos 6 dígitos do timestamp
    const cpfNumbers = formData.cpf.replace(/\D/g, '').slice(0, 6); // Primeiros 6 dígitos do CPF
    const codigo = `MP${cpfNumbers || timestamp}${timestamp}`.slice(0, 15);
    handleInputChange('codigoExterno', codigo);

    toast({
      title: "Código gerado!",
      description: `Código externo: ${codigo}`,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      // Buscar configurações da API
      const { data: settings, error: settingsError } = await supabase
        .from('api_settings')
        .select('setting_name, setting_value')
        .in('setting_name', ['EXTERNAL_API_KEY', 'EXTERNAL_API_ADESAO_URL']);

      if (settingsError || !settings || settings.length === 0) {
        throw new Error('Configurações da API RMS não encontradas. Configure em Configurações.');
      }

      const settingsMap = Object.fromEntries(
        settings.map(s => [s.setting_name, s.setting_value])
      );

      const apiKey = settingsMap['EXTERNAL_API_KEY'];
      const apiUrl = settingsMap['EXTERNAL_API_ADESAO_URL'];

      if (!apiKey || !apiUrl) {
        throw new Error('API Key ou URL de Adesão não configuradas.');
      }

      // Validar campos obrigatórios
      if (!formData.nome || !formData.cpf || !formData.dataNascimento || !formData.celular ||
          !formData.email || !formData.cep || !formData.numero || !formData.uf || !formData.tipoPlano) {
        throw new Error('Preencha todos os campos obrigatórios');
      }

      // Preparar payload conforme documentação RMS
      const payload: any = {
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

      // Adicionar campos opcionais se preenchidos
      if (formData.nomeSocial) payload.nomeSocial = formData.nomeSocial.toUpperCase();
      if (formData.rg) payload.rg = formData.rg;
      if (formData.sexo) payload.sexo = formData.sexo;
      if (formData.estadoCivil) payload.estadoCivil = formData.estadoCivil;
      if (formData.nomeMae) payload.nomeMae = formData.nomeMae.toUpperCase();
      if (formData.telefone) payload.telefone = cleanCPF(formData.telefone);
      if (formData.telefoneComercial) payload.telefoneComercial = cleanCPF(formData.telefoneComercial);
      if (formData.complemento) payload.complemento = formData.complemento;
      if (formData.bairro) payload.bairro = formData.bairro.toUpperCase();
      if (formData.cidade) payload.cidade = formData.cidade.toUpperCase();

      console.log('Enviando para RMS:', payload);

      // Chamar API RMS
      const rmsResponse = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
        },
        body: JSON.stringify(payload),
      });

      const responseData = await rmsResponse.json();

      if (!rmsResponse.ok) {
        throw new Error(responseData.mensagem || `Erro ${rmsResponse.status}: ${rmsResponse.statusText}`);
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
      if (err.message?.includes('Failed to fetch')) {
        errorMessage = 'Erro de conexão com a API RMS. Verifique a URL da API nas configurações.';
      } else if (err.message?.includes('API Key')) {
        errorMessage = 'API Key não configurada. Configure nas Configurações do sistema.';
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
            {/* Tipo de Beneficiário */}
            <div className="grid grid-cols-2 gap-4">
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
                />
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
                  <div className="flex gap-2">
                    <Input
                      id="codigoExterno"
                      value={formData.codigoExterno}
                      onChange={(e) => handleInputChange('codigoExterno', e.target.value)}
                      placeholder="Código único no seu sistema"
                      maxLength={50}
                      required
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={generateCodigoExterno}
                      className="whitespace-nowrap"
                    >
                      Gerar Código
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Código único para identificar o beneficiário no seu sistema
                  </p>
                </div>
              </div>

              {/* Campos Opcionais */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nomeSocial">Nome Social (opcional)</Label>
                  <Input
                    id="nomeSocial"
                    value={formData.nomeSocial || ""}
                    onChange={(e) => handleInputChange('nomeSocial', e.target.value)}
                    maxLength={100}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rg">RG (opcional)</Label>
                  <Input
                    id="rg"
                    value={formData.rg || ""}
                    onChange={(e) => handleInputChange('rg', e.target.value)}
                    maxLength={20}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sexo">Sexo (opcional)</Label>
                  <Select
                    value={formData.sexo || ""}
                    onValueChange={(value) => handleInputChange('sexo', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M">Masculino</SelectItem>
                      <SelectItem value="F">Feminino</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estadoCivil">Estado Civil (opcional)</Label>
                  <Select
                    value={formData.estadoCivil || ""}
                    onValueChange={(value) => handleInputChange('estadoCivil', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Solteiro(a)</SelectItem>
                      <SelectItem value="2">Casado(a)</SelectItem>
                      <SelectItem value="3">Divorciado(a)</SelectItem>
                      <SelectItem value="4">Viúvo(a)</SelectItem>
                      <SelectItem value="5">União Estável</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 col-span-2">
                  <Label htmlFor="nomeMae">Nome da Mãe (opcional)</Label>
                  <Input
                    id="nomeMae"
                    value={formData.nomeMae || ""}
                    onChange={(e) => handleInputChange('nomeMae', e.target.value)}
                    maxLength={100}
                  />
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

                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone Fixo (opcional)</Label>
                  <Input
                    id="telefone"
                    value={formData.telefone || ""}
                    onChange={(e) => handleInputChange('telefone', e.target.value)}
                    placeholder="1133334444"
                    maxLength={11}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="telefoneComercial">Telefone Comercial (opcional)</Label>
                  <Input
                    id="telefoneComercial"
                    value={formData.telefoneComercial || ""}
                    onChange={(e) => handleInputChange('telefoneComercial', e.target.value)}
                    placeholder="1133334444"
                    maxLength={11}
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

                <div className="space-y-2">
                  <Label htmlFor="complemento">Complemento (opcional)</Label>
                  <Input
                    id="complemento"
                    value={formData.complemento || ""}
                    onChange={(e) => handleInputChange('complemento', e.target.value)}
                    maxLength={50}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bairro">Bairro (opcional)</Label>
                  <Input
                    id="bairro"
                    value={formData.bairro || ""}
                    onChange={(e) => handleInputChange('bairro', e.target.value)}
                    maxLength={50}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cidade">Cidade (opcional)</Label>
                  <Input
                    id="cidade"
                    value={formData.cidade || ""}
                    onChange={(e) => handleInputChange('cidade', e.target.value)}
                    maxLength={50}
                  />
                </div>
              </div>
            </div>

            {/* Plano */}
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Plano</h3>

              <div className="space-y-2">
                <Label htmlFor="tipoPlano">
                  Tipo de Plano (Código RMS) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="tipoPlano"
                  value={formData.tipoPlano}
                  onChange={(e) => handleInputChange('tipoPlano', e.target.value)}
                  placeholder="9999"
                  required
                />
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
