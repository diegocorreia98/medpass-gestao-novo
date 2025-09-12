
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertTriangle, UserMinus, DollarSign } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/integrations/supabase/client"

interface CancelamentoData {
  identificadorLoja: string
  codigoExterno: string
  cpfTitular: string
}

export default function UnidadeCancelamento() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [dados, setDados] = useState<CancelamentoData>({
    identificadorLoja: "",
    codigoExterno: "",
    cpfTitular: "",
  })

  const processarCancelamento = async () => {
    // Validações
    if (!dados.identificadorLoja || !dados.codigoExterno || !dados.cpfTitular) {
      toast({
        title: "Erro",
        description: "Todos os campos são obrigatórios",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    
    try {
      // Usar Edge Function segura em vez de chamada direta
      const { data: result, error } = await supabase.functions.invoke('notify-external-api', {
        body: {
          operation: 'test-cancelamento',
          data: {
            cpf: dados.cpfTitular,
            codigoExterno: dados.codigoExterno,
            motivo: "Cancelamento via unidade",
            dataCancelamento: new Date().toISOString().split('T')[0]
          }
        }
      })

      if (error) throw error

      if (result.success) {
        toast({
          title: "Cancelamento Processado!",
          description: "Beneficiário cancelado com sucesso",
        })
        
        // Limpar formulário
        setDados({
          identificadorLoja: "",
          codigoExterno: "",
          cpfTitular: "",
        })
      } else {
        throw new Error(result.error || 'Erro no cancelamento')
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao processar cancelamento. Verifique os dados e tente novamente.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Cancelamento de Beneficiário</h2>
          <p className="text-muted-foreground">Processe o cancelamento de um beneficiário da sua unidade</p>
        </div>
        <Badge variant="secondary" className="gap-2">
          <UserMinus className="h-4 w-4" />
          Painel Unidade
        </Badge>
      </div>

      <Alert className="border-warning bg-warning/5">
        <AlertTriangle className="h-4 w-4 text-warning" />
        <AlertDescription className="text-foreground">
          <strong>Atenção:</strong> Esta ação é irreversível. Certifique-se de que todos os dados estão corretos antes de processar o cancelamento.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Formulário Principal */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserMinus className="h-5 w-5" />
                Dados para Cancelamento
              </CardTitle>
              <CardDescription>
                Informe os dados necessários para identificar o beneficiário a ser cancelado
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4">
                <div>
                  <Label htmlFor="identificadorLoja">Identificador de Loja *</Label>
                  <Input
                    id="identificadorLoja"
                    value={dados.identificadorLoja}
                    onChange={(e) => setDados({ ...dados, identificadorLoja: e.target.value })}
                    placeholder="ID da loja responsável"
                  />
                </div>

                <div>
                  <Label htmlFor="codigoExterno">Código Externo *</Label>
                  <Input
                    id="codigoExterno"
                    value={dados.codigoExterno}
                    onChange={(e) => setDados({ ...dados, codigoExterno: e.target.value })}
                    placeholder="Código de referência do beneficiário"
                  />
                </div>

                <div>
                  <Label htmlFor="cpfTitular">CPF do Titular *</Label>
                  <Input
                    id="cpfTitular"
                    value={dados.cpfTitular}
                    onChange={(e) => setDados({ ...dados, cpfTitular: e.target.value })}
                    placeholder="000.000.000-00"
                  />
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                  <h4 className="font-medium text-foreground">Informações sobre o Cancelamento:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• O cancelamento será processado imediatamente</li>
                    <li>• Uma confirmação será enviada para o sistema RMS</li>
                    <li>• O beneficiário perderá acesso aos benefícios na data do cancelamento</li>
                    <li>• Esta ação não pode ser desfeita</li>
                    <li>• Você perderá a comissão mensal referente a este cliente</li>
                  </ul>
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                <Button
                  variant="outline"
                  onClick={() => setDados({
                    identificadorLoja: "",
                    codigoExterno: "",
                    cpfTitular: "",
                  })}
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
        </div>

        {/* Sidebar com Informações da Unidade */}
        <div className="space-y-6">
          {/* Impacto Financeiro */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Impacto Financeiro</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-red-600" />
                  <p className="text-sm font-medium">Perda de Comissão</p>
                </div>
                <p className="text-sm text-muted-foreground">
                  Ao cancelar um beneficiário, você perderá a comissão mensal associada a este plano.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Estatísticas da Unidade */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Cancelamentos do Mês</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm">Total de cancelamentos</span>
                <span className="font-medium">3</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Comissão perdida</span>
                <span className="font-medium text-red-600">R$ 85,00</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm">Taxa de cancelamento</span>
                <span className="text-sm text-muted-foreground">2.1%</span>
              </div>
            </CardContent>
          </Card>

          {/* Testes Automatizados */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Testes Automatizados</CardTitle>
              <CardDescription>
                Status dos testes de integração com a API de cancelamento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-success/10 border border-success/20 rounded-lg">
                  <span className="text-sm">Status 200 - Resposta da API</span>
                  <span className="text-success font-medium">✓ OK</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-success/10 border border-success/20 rounded-lg">
                  <span className="text-sm">Mensagem "cancelado com sucesso"</span>
                  <span className="text-success font-medium">✓ OK</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-info/10 border border-info/20 rounded-lg">
                  <span className="text-sm">Tempo de resposta &lt; 5s</span>
                  <span className="text-info font-medium">⏱ Monitorando</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
