import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { 
  Key, 
  CheckCircle, 
  AlertCircle, 
  Server,
  ExternalLink,
  RefreshCw
} from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"

export default function CredentialTestCard() {
  const [isTestingCredentials, setIsTestingCredentials] = useState(false)
  const [credentialStatus, setCredentialStatus] = useState<{
    status: 'untested' | 'valid' | 'invalid'
    message?: string
    apiKey?: string
    error?: string
  }>({ status: 'untested' })
  const { toast } = useToast()

  const testCredentials = async () => {
    setIsTestingCredentials(true)
    
    try {
      console.log('=== INICIANDO TESTE DE CREDENCIAIS ===')
      console.log('Timestamp:', Date.now())
      
      // Força recarregamento das configurações adicionando timestamp
      const { data, error } = await supabase.functions.invoke('notify-external-api', {
        body: {
          operation: 'test-credentials',
          data: {
            forceReload: true,
            timestamp: Date.now()
          }
        }
      })

      console.log('=== RESPOSTA DA EDGE FUNCTION ===')
      console.log('Error:', error)
      console.log('Data:', data)

      if (error) {
        console.error('Erro na edge function:', error)
        throw error
      }

      if (data.success) {
        setCredentialStatus({
          status: 'valid',
          message: data.message,
          apiKey: data.apiKey
        })
        toast({
          title: "Credenciais Válidas",
          description: "A API key está funcionando corretamente.",
        })
      } else {
        setCredentialStatus({
          status: 'invalid',
          error: data.error,
          apiKey: data.apiKey
        })
        toast({
          title: "Credenciais Inválidas",
          description: data.error,
          variant: "destructive"
        })
      }
    } catch (error: any) {
      console.error('Erro ao testar credenciais:', error)
      setCredentialStatus({
        status: 'invalid',
        error: error.message || 'Erro ao conectar com a API'
      })
      toast({
        title: "Erro no Teste",
        description: error.message || 'Erro ao conectar com a API',
        variant: "destructive"
      })
    } finally {
      setIsTestingCredentials(false)
    }
  }

  const getStatusBadge = () => {
    switch (credentialStatus.status) {
      case 'valid':
        return <Badge className="bg-green-100 text-green-700">Válida</Badge>
      case 'invalid':
        return <Badge variant="destructive">Inválida</Badge>
      default:
        return <Badge variant="outline">Não testada</Badge>
    }
  }

  const getStatusIcon = () => {
    switch (credentialStatus.status) {
      case 'valid':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'invalid':
        return <AlertCircle className="h-5 w-5 text-red-600" />
      default:
        return <Key className="h-5 w-5 text-muted-foreground" />
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getStatusIcon()}
          Teste de Credenciais da API
        </CardTitle>
        <CardDescription>
          Validar a API key e conectividade com a API externa
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium">Status da Credencial</p>
            <div className="flex items-center gap-2">
              {getStatusBadge()}
              {credentialStatus.apiKey && (
                <span className="text-xs text-muted-foreground font-mono">
                  {credentialStatus.apiKey}
                </span>
              )}
            </div>
          </div>
          <Button 
            onClick={testCredentials}
            disabled={isTestingCredentials}
            variant="outline"
          >
            {isTestingCredentials ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Testando...
              </>
            ) : (
              <>
                <Server className="h-4 w-4 mr-2" />
                Testar Credenciais
              </>
            )}
          </Button>
        </div>

        {credentialStatus.status === 'valid' && credentialStatus.message && (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              {credentialStatus.message}
            </AlertDescription>
          </Alert>
        )}

        {credentialStatus.status === 'invalid' && credentialStatus.error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Erro:</strong> {credentialStatus.error}
            </AlertDescription>
          </Alert>
        )}

        {credentialStatus.status === 'invalid' && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Para corrigir:</strong> Verifique a EXTERNAL_API_KEY nas configurações do Supabase. 
              A chave deve ser: <code className="bg-muted px-1 rounded">cEEQqgXm853TIBATOryTK2lNTchmL72E3Thm196Q</code>
              <br />
              <Button 
                variant="link" 
                className="h-auto p-0 mt-2"
                onClick={() => window.open('https://supabase.com/dashboard/project/yhxoihyjtcgulnfipqej/settings/functions', '_blank')}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Abrir Configurações do Supabase
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>API Key esperada:</strong> cEEQqgXm853TIBATOryTK2lNTchmL72E3Thm196Q</p>
          <p><strong>Variável:</strong> EXTERNAL_API_KEY</p>
          <p><strong>Local:</strong> Supabase → Edge Functions → Secrets</p>
        </div>
      </CardContent>
    </Card>
  )
}