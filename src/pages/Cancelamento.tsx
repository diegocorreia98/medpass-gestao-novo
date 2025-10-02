import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertTriangle, UserMinus, CheckCircle2, AlertCircle, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";

interface CancelamentoData {
  idClienteContrato: string;
  idCliente: string;
  cpf: string;
  codigoExterno: string;
}

export default function Cancelamento() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [dados, setDados] = useState<CancelamentoData>({
    idClienteContrato: "",
    idCliente: "",
    cpf: "",
    codigoExterno: "",
  });

  const cleanCPF = (cpf: string) => {
    return cpf.replace(/\D/g, '');
  };

  const processarCancelamento = async () => {
    // Validações
    if (!dados.idClienteContrato || !dados.idCliente || !dados.cpf) {
      toast({
        title: "Erro",
        description: "ID Cliente Contrato, ID Cliente e CPF são obrigatórios",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      // Buscar configurações da API
      const { data: settings, error: settingsError } = await supabase
        .from('api_settings')
        .select('setting_name, setting_value')
        .in('setting_name', ['EXTERNAL_API_KEY', 'EXTERNAL_API_CANCELAMENTO_URL']);

      if (settingsError || !settings || settings.length === 0) {
        throw new Error('Configurações da API RMS não encontradas. Configure em Configurações.');
      }

      const settingsMap = Object.fromEntries(
        settings.map(s => [s.setting_name, s.setting_value])
      );

      const apiKey = settingsMap['EXTERNAL_API_KEY'];
      const apiUrl = settingsMap['EXTERNAL_API_CANCELAMENTO_URL'];

      if (!apiKey || !apiUrl) {
        throw new Error('API Key ou URL de Cancelamento não configuradas.');
      }

      // Preparar payload conforme documentação RMS V4.0
      const payload: any = {
        idClienteContrato: parseInt(dados.idClienteContrato),
        idCliente: parseInt(dados.idCliente),
        cpf: cleanCPF(dados.cpf),
      };

      // Adicionar codigoExterno se preenchido (opcional)
      if (dados.codigoExterno) {
        payload.codigoExterno = dados.codigoExterno;
      }

      console.log('Enviando cancelamento para RMS:', payload);

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
        const errorMsg = responseData.mensagem || `Erro ${rmsResponse.status}: ${rmsResponse.statusText}`;
        const errorCode = responseData.codigoErro ? ` (Código: ${responseData.codigoErro})` : '';
        throw new Error(errorMsg + errorCode);
      }

      setResponse(responseData);

      // Logar a chamada
      await supabase.functions.invoke('log-api-call', {
        body: {
          operation: 'cancelamento_manual',
          requestData: payload,
          responseData,
          status: 'success',
        }
      });

      toast({
        title: "Cancelamento processado com sucesso!",
        description: responseData.mensagem || "Beneficiário cancelado na RMS",
      });

      // Limpar formulário após sucesso
      setDados({
        idClienteContrato: "",
        idCliente: "",
        cpf: "",
        codigoExterno: "",
      });

    } catch (err: any) {
      console.error('Erro ao processar cancelamento:', err);
      const errorMessage = err.message || 'Erro desconhecido ao processar cancelamento';
      setError(errorMessage);

      // Logar erro
      try {
        await supabase.functions.invoke('log-api-call', {
          body: {
            operation: 'cancelamento_manual',
            requestData: {
              idClienteContrato: dados.idClienteContrato,
              idCliente: dados.idCliente,
              cpf: dados.cpf,
              codigoExterno: dados.codigoExterno
            },
            status: 'error',
            errorMessage: errorMessage,
          }
        });
      } catch (logError) {
        console.error('Erro ao logar chamada:', logError);
      }

      toast({
        title: "Erro ao processar cancelamento",
        description: errorMessage,
        variant: "destructive"
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
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Cancelamento de Beneficiário</h2>
        <p className="text-muted-foreground">Envie cancelamentos diretamente para a API da Rede Mais Saúde</p>
      </div>

      <Alert className="border-warning bg-warning/5">
        <AlertTriangle className="h-4 w-4 text-warning" />
        <AlertDescription className="text-foreground">
          <strong>Atenção:</strong> Para cancelar, o registro deve ter sido enviado na API de Adesão e aguardar <strong>mínimo de 15 minutos</strong> para processamento.
        </AlertDescription>
      </Alert>

      <div className="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserMinus className="h-5 w-5" />
              Dados para Cancelamento
            </CardTitle>
            <CardDescription>
              Preencha conforme a documentação da API RMS V4.0
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="idClienteContrato">
                    ID Cliente Contrato (RMS) <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="idClienteContrato"
                    type="number"
                    value={dados.idClienteContrato}
                    onChange={(e) => setDados({ ...dados, idClienteContrato: e.target.value })}
                    placeholder="999999999"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="idCliente">
                    ID Cliente <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="idCliente"
                    type="number"
                    value={dados.idCliente}
                    onChange={(e) => setDados({ ...dados, idCliente: e.target.value })}
                    placeholder="999999"
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="cpf">
                  CPF do Beneficiário <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="cpf"
                  value={dados.cpf}
                  onChange={(e) => setDados({ ...dados, cpf: e.target.value })}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  required
                />
                <p className="text-xs text-muted-foreground mt-1">
                  CPF do titular ou dependente a ser cancelado
                </p>
              </div>

              <div>
                <Label htmlFor="codigoExterno">Código Externo (opcional)</Label>
                <Input
                  id="codigoExterno"
                  value={dados.codigoExterno}
                  onChange={(e) => setDados({ ...dados, codigoExterno: e.target.value })}
                  placeholder="Código único no seu sistema"
                  maxLength={50}
                />
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                <h4 className="font-medium text-foreground">Informações Importantes:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Aguarde no mínimo 15 minutos após envio da adesão</li>
                  <li>• O cancelamento será processado imediatamente na RMS</li>
                  <li>• Beneficiários já cancelados não podem ser reenviados</li>
                  <li>• Esta ação não pode ser desfeita</li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end space-x-4">
              <Button
                variant="outline"
                onClick={() => {
                  setDados({
                    idClienteContrato: "",
                    idCliente: "",
                    cpf: "",
                    codigoExterno: "",
                  });
                  setResponse(null);
                  setError(null);
                }}
                disabled={loading}
              >
                Limpar
              </Button>

              <Button
                onClick={processarCancelamento}
                disabled={loading}
                variant="destructive"
                className="min-w-32"
              >
                {loading ? (
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <>
                    <UserMinus className="h-4 w-4 mr-2" />
                    Processar Cancelamento
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Resposta de Sucesso */}
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

        {/* Resposta de Erro */}
        {error && (
          <Card className="mt-6 border-destructive">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                Erro ao Processar Cancelamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>

              <div className="mt-4 p-4 bg-muted rounded-md">
                <h4 className="font-medium mb-2">Códigos de Erro Comuns:</h4>
                <ul className="text-sm space-y-1">
                  <li><strong>1000:</strong> Campo obrigatório faltando</li>
                  <li><strong>1001:</strong> Tipo do valor diferente do esperado</li>
                  <li><strong>1003:</strong> Cliente inativo ou inexistente</li>
                  <li><strong>1005:</strong> Contrato inativo ou inexistente</li>
                  <li><strong>1010:</strong> CPF inválido</li>
                  <li><strong>1018:</strong> Beneficiário já cancelado no sistema</li>
                  <li><strong>401:</strong> Acesso negado - Credencial inválida</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Card Informativo */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Documentação da API RMS</CardTitle>
            <CardDescription>
              Integração por API – Cancelamento V4.0
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Campos Obrigatórios:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• <strong>idClienteContrato:</strong> Código do contrato/plano (fixo da RMS)</li>
                  <li>• <strong>idCliente:</strong> ID do cliente no sistema RMS</li>
                  <li>• <strong>cpf:</strong> CPF do beneficiário (11 dígitos, apenas números)</li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium mb-2">Campos Opcionais:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• <strong>codigoExterno:</strong> Código de referência no seu sistema</li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium mb-2">Ambientes:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• <strong>Homologação:</strong> https://ddt8urmaeb.execute-api.us-east-1.amazonaws.com/hml-v1/rms1</li>
                  <li>• <strong>Produção:</strong> Enviado após homologação</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
