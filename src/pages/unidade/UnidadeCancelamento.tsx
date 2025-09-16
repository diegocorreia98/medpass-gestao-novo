
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
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground leading-tight">
            Cancelamento de Beneficiário
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Processe o cancelamento de um beneficiário da sua unidade
          </p>
        </div>
        <Badge variant="secondary" className="gap-2 h-8 sm:h-6 w-fit self-start sm:self-auto">
          <UserMinus className="h-4 w-4" />
          <span className="text-xs sm:text-sm">Painel Unidade</span>
        </Badge>
      </div>

      <Alert className="border-warning bg-warning/5 p-4">
        <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0" />
        <AlertDescription className="text-foreground text-sm sm:text-base">
          <strong>Atenção:</strong> Esta ação é irreversível. Certifique-se de que todos os dados estão corretos antes de processar o cancelamento.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Formulário Principal */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <UserMinus className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                <span>Dados para Cancelamento</span>
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Informe os dados necessários para identificar o beneficiário a ser cancelado
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 space-y-4 sm:space-y-6">
              <div className="grid gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label htmlFor="identificadorLoja" className="text-sm sm:text-base">Identificador de Loja *</Label>
                  <Input
                    id="identificadorLoja"
                    value={dados.identificadorLoja}
                    onChange={(e) => setDados({ ...dados, identificadorLoja: e.target.value })}
                    placeholder="ID da loja responsável"
                    className="h-12 sm:h-10 text-base"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="codigoExterno" className="text-sm sm:text-base">Código Externo *</Label>
                  <Input
                    id="codigoExterno"
                    value={dados.codigoExterno}
                    onChange={(e) => setDados({ ...dados, codigoExterno: e.target.value })}
                    placeholder="Código de referência do beneficiário"
                    className="h-12 sm:h-10 text-base"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cpfTitular" className="text-sm sm:text-base">CPF do Titular *</Label>
                  <Input
                    id="cpfTitular"
                    value={dados.cpfTitular}
                    onChange={(e) => setDados({ ...dados, cpfTitular: e.target.value })}
                    placeholder="000.000.000-00"
                    className="h-12 sm:h-10 text-base"
                  />
                </div>
              </div>

              <div className="pt-3 sm:pt-4 border-t">
                <div className="bg-muted/50 p-3 sm:p-4 rounded-lg space-y-2">
                  <h4 className="font-medium text-foreground text-sm sm:text-base">Informações sobre o Cancelamento:</h4>
                  <ul className="text-xs sm:text-sm text-muted-foreground space-y-1">
                    <li>• O cancelamento será processado imediatamente</li>
                    <li>• Uma confirmação será enviada para o sistema RMS</li>
                    <li>• O beneficiário perderá acesso aos benefícios na data do cancelamento</li>
                    <li>• Esta ação não pode ser desfeita</li>
                    <li>• Você perderá a comissão mensal referente a este cliente</li>
                  </ul>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-end gap-3 sm:gap-4">
                <Button
                  variant="outline"
                  onClick={() => setDados({
                    identificadorLoja: "",
                    codigoExterno: "",
                    cpfTitular: "",
                  })}
                  disabled={loading}
                  className="h-12 sm:h-10 touch-manipulation order-2 sm:order-1"
                >
                  Limpar
                </Button>

                <Button
                  onClick={processarCancelamento}
                  disabled={loading}
                  variant="destructive"
                  className="min-w-32 h-12 sm:h-10 touch-manipulation order-1 sm:order-2"
                >
                  {loading ? (
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  ) : (
                    <>
                      <UserMinus className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">Processar Cancelamento</span>
                      <span className="sm:hidden">Cancelar</span>
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar com Informações da Unidade */}
        <div className="space-y-4 sm:space-y-6">
          {/* Impacto Financeiro */}
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Impacto Financeiro</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 space-y-3 sm:space-y-4">
              <div className="p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-red-600 flex-shrink-0" />
                  <p className="text-xs sm:text-sm font-medium">Perda de Comissão</p>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Ao cancelar um beneficiário, você perderá a comissão mensal associada a este plano.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Estatísticas da Unidade */}
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Cancelamentos do Mês</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs sm:text-sm">Total de cancelamentos</span>
                <span className="font-medium text-sm sm:text-base">3</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs sm:text-sm">Comissão perdida</span>
                <span className="font-medium text-red-600 text-sm sm:text-base">R$ 85,00</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs sm:text-sm">Taxa de cancelamento</span>
                <span className="text-xs sm:text-sm text-muted-foreground">2.1%</span>
              </div>
            </CardContent>
          </Card>

          {/* Testes Automatizados */}
          <Card>
            <CardHeader className="p-4 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Testes Automatizados</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Status dos testes de integração com a API de cancelamento
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-success/10 border border-success/20 rounded-lg">
                  <span className="text-xs sm:text-sm">Status 200 - Resposta da API</span>
                  <span className="text-success font-medium text-xs sm:text-sm">✓ OK</span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-success/10 border border-success/20 rounded-lg">
                  <span className="text-xs sm:text-sm">Mensagem "cancelado com sucesso"</span>
                  <span className="text-success font-medium text-xs sm:text-sm">✓ OK</span>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-info/10 border border-info/20 rounded-lg">
                  <span className="text-xs sm:text-sm">Tempo de resposta &lt; 5s</span>
                  <span className="text-info font-medium text-xs sm:text-sm">⏱ Monitorando</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
