import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Globe, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw,
  ExternalLink,
  UserPlus,
  UserX
} from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"

interface EndpointStatus {
  status: 'untested' | 'success' | 'error'
  message?: string
  error?: string
  response?: any
  url?: string
}

export default function EndpointTestCard() {
  const [isTestingAdesao, setIsTestingAdesao] = useState(false)
  const [isTestingCancelamento, setIsTestingCancelamento] = useState(false)
  
  const [adesaoStatus, setAdesaoStatus] = useState<EndpointStatus>({ status: 'untested' })
  const [cancelamentoStatus, setCancelamentoStatus] = useState<EndpointStatus>({ status: 'untested' })
  
  const { toast } = useToast()

  const testAdesaoEndpoint = async () => {
    setIsTestingAdesao(true)
    
    try {
      const testData = {
        idBeneficiarioTipo: 1,
        nome: "João Teste API",
        codigoExterno: "TEST001",
        cpf: "11144477735", // CPF válido para teste
        dataNascimento: "31121990", // Formato DDMMYYYY (sem separadores)
        celular: "11999999999",
        email: "joao.teste@email.com",
        cep: "01310-100",
        numero: "100",
        uf: "SP",
        tipoPlano: 102303
      }

      // Log de debug para verificar dados antes de enviar
      console.log('=== DEBUG FRONTEND ===')
      console.log('Dados preparados no frontend:', JSON.stringify(testData, null, 2))
      console.log('dataNascimento enviado do frontend:', testData.dataNascimento)
      console.log('Tipo do dataNascimento:', typeof testData.dataNascimento)

      const { data, error } = await supabase.functions.invoke('notify-external-api', {
        body: {
          operation: 'test-adesao',
          data: testData
        }
      })

      if (error) {
        throw error
      }

      if (data.success) {
        setAdesaoStatus({
          status: 'success',
          message: 'Endpoint de adesão funcionando corretamente',
          response: data.response
        })
        toast({
          title: "Endpoint de Adesão OK",
          description: "Teste realizado com sucesso.",
        })
      } else {
        setAdesaoStatus({
          status: 'error',
          error: data.error,
          response: data.response
        })
        toast({
          title: "Erro no Endpoint de Adesão",
          description: data.error,
          variant: "destructive"
        })
      }
    } catch (error: any) {
      console.error('Erro ao testar endpoint de adesão:', error)
      setAdesaoStatus({
        status: 'error',
        error: error.message || 'Erro ao conectar com o endpoint de adesão'
      })
      toast({
        title: "Erro no Teste",
        description: error.message || 'Erro ao conectar com o endpoint de adesão',
        variant: "destructive"
      })
    } finally {
      setIsTestingAdesao(false)
    }
  }

  const testCancelamentoEndpoint = async () => {
    setIsTestingCancelamento(true)
    
    try {
      const testData = {
        codigoExterno: "TEST001",
        cpf: "11144477735", // CPF válido para teste
        motivo: "Teste de cancelamento via API",
        dataCancelamento: "18072025" // Formato DDMMYYYY
      }

      // Log de debug para cancelamento
      console.log('=== DEBUG CANCELAMENTO FRONTEND ===')
      console.log('Dados cancelamento preparados:', JSON.stringify(testData, null, 2))

      const { data, error } = await supabase.functions.invoke('notify-external-api', {
        body: {
          operation: 'test-cancelamento',
          data: testData
        }
      })

      if (error) {
        throw error
      }

      if (data.success) {
        setCancelamentoStatus({
          status: 'success',
          message: 'Endpoint de cancelamento funcionando corretamente',
          response: data.response
        })
        toast({
          title: "Endpoint de Cancelamento OK",
          description: "Teste realizado com sucesso.",
        })
      } else {
        setCancelamentoStatus({
          status: 'error',
          error: data.error,
          response: data.response
        })
        toast({
          title: "Erro no Endpoint de Cancelamento",
          description: data.error,
          variant: "destructive"
        })
      }
    } catch (error: any) {
      console.error('Erro ao testar endpoint de cancelamento:', error)
      setCancelamentoStatus({
        status: 'error',
        error: error.message || 'Erro ao conectar com o endpoint de cancelamento'
      })
      toast({
        title: "Erro no Teste",
        description: error.message || 'Erro ao conectar com o endpoint de cancelamento',
        variant: "destructive"
      })
    } finally {
      setIsTestingCancelamento(false)
    }
  }

  const getStatusBadge = (status: EndpointStatus['status']) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-700">Funcionando</Badge>
      case 'error':
        return <Badge variant="destructive">Erro</Badge>
      default:
        return <Badge variant="outline">Não testado</Badge>
    }
  }

  const getStatusIcon = (status: EndpointStatus['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      default:
        return <Globe className="h-4 w-4 text-muted-foreground" />
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Teste de Endpoints Específicos
        </CardTitle>
        <CardDescription>
          Testar conectividade com endpoints separados de adesão e cancelamento
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Teste Endpoint Adesão */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-blue-600" />
                <p className="text-sm font-medium">Endpoint de Adesão</p>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(adesaoStatus.status)}
                {getStatusBadge(adesaoStatus.status)}
              </div>
            </div>
            <Button 
              onClick={testAdesaoEndpoint}
              disabled={isTestingAdesao}
              variant="outline"
              size="sm"
            >
              {isTestingAdesao ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Testando...
                </>
              ) : (
                'Testar Adesão'
              )}
            </Button>
          </div>

          {adesaoStatus.status === 'success' && adesaoStatus.message && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                {adesaoStatus.message}
              </AlertDescription>
            </Alert>
          )}

          {adesaoStatus.status === 'error' && adesaoStatus.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Erro:</strong> {adesaoStatus.error}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="border-t pt-4" />

        {/* Teste Endpoint Cancelamento */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <UserX className="h-4 w-4 text-red-600" />
                <p className="text-sm font-medium">Endpoint de Cancelamento</p>
              </div>
              <div className="flex items-center gap-2">
                {getStatusIcon(cancelamentoStatus.status)}
                {getStatusBadge(cancelamentoStatus.status)}
              </div>
            </div>
            <Button 
              onClick={testCancelamentoEndpoint}
              disabled={isTestingCancelamento}
              variant="outline"
              size="sm"
            >
              {isTestingCancelamento ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Testando...
                </>
              ) : (
                'Testar Cancelamento'
              )}
            </Button>
          </div>

          {cancelamentoStatus.status === 'success' && cancelamentoStatus.message && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                {cancelamentoStatus.message}
              </AlertDescription>
            </Alert>
          )}

          {cancelamentoStatus.status === 'error' && cancelamentoStatus.error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Erro:</strong> {cancelamentoStatus.error}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="border-t pt-4">
          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong>Configuração:</strong></p>
            <p>• EXTERNAL_API_ADESAO_URL - Endpoint para operações de adesão</p>
            <p>• EXTERNAL_API_CANCELAMENTO_URL - Endpoint para operações de cancelamento</p>
            <Button 
              variant="link" 
              className="h-auto p-0 text-xs"
              onClick={() => window.open('https://supabase.com/dashboard/project/yhxoihyjtcgulnfipqej/settings/functions', '_blank')}
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Configurar no Supabase
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
