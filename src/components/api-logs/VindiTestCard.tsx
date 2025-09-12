import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  CreditCard, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw,
  Users,
  Receipt,
  Search,
  Activity,
  Copy,
  ExternalLink
} from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { useApiLogs } from "@/hooks/useApiLogs"
import { usePlanos } from "@/hooks/usePlanos"

interface TestData {
  customerName: string
  customerEmail: string
  customerDocument: string
  planId: string
  subscriptionId: string
}

interface TestStatus {
  status: 'untested' | 'success' | 'error'
  message?: string
  data?: any
}

export default function VindiTestCard() {
  const [testData, setTestData] = useState<TestData>({
    customerName: '',
    customerEmail: '',
    customerDocument: '',
    planId: '',
    subscriptionId: ''
  })
  
  const [conectivityStatus, setConectivityStatus] = useState<TestStatus>({ status: 'untested' })
  const [customerStatus, setCustomerStatus] = useState<TestStatus>({ status: 'untested' })
  const [subscriptionStatus, setSubscriptionStatus] = useState<TestStatus>({ status: 'untested' })
  const [refreshStatus, setRefreshStatus] = useState<TestStatus>({ status: 'untested' })
  
  const [isTestingConnectivity, setIsTestingConnectivity] = useState(false)
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false)
  const [isCreatingSubscription, setIsCreatingSubscription] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  
  const { toast } = useToast()
  const { refreshVindiStatuses, isRefreshingVindi } = useApiLogs()
  const { planos, isLoading: isLoadingPlanos } = usePlanos()

  // Filtrar planos que têm vindi_plan_id configurado
  const planosComVindi = planos.filter(plano => plano.vindi_plan_id && plano.vindi_plan_id !== null)

  const loadExampleData = () => {
    setTestData({
      customerName: 'João Silva',
      customerEmail: 'joao.teste@exemplo.com',
      customerDocument: '12345678909', // CPF válido para teste
      planId: planosComVindi[0]?.id || '',
      subscriptionId: ''
    })
  }

  const testVindiConnectivity = async () => {
    setIsTestingConnectivity(true)
    
    try {
      const { data, error } = await supabase.functions.invoke('notify-external-api', {
        body: {
          operation: 'vindi-connectivity',
          data: {
            timestamp: Date.now()
          }
        }
      })

      if (error) throw error

      if (data.success) {
        setConectivityStatus({
          status: 'success',
          message: data.message,
          data: data.data
        })
        toast({
          title: "Conectividade Vindi OK",
          description: "API key da Vindi está válida."
        })
      } else {
        setConectivityStatus({
          status: 'error',
          message: data.error
        })
        toast({
          title: "Erro na Conectividade",
          description: data.error,
          variant: "destructive"
        })
      }
    } catch (error: any) {
      setConectivityStatus({
        status: 'error',
        message: error.message
      })
      toast({
        title: "Erro no Teste",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setIsTestingConnectivity(false)
    }
  }

  const createTestCustomer = async () => {
    if (!testData.customerName || !testData.customerEmail || !testData.customerDocument) {
      toast({
        title: "Dados Incompletos",
        description: "Preencha nome, email e CPF do cliente.",
        variant: "destructive"
      })
      return
    }

    setIsCreatingCustomer(true)
    
    try {
      const { data, error } = await supabase.functions.invoke('notify-external-api', {
        body: {
          operation: 'vindi-create-customer',
          data: {
            name: testData.customerName,
            email: testData.customerEmail,
            registry_code: testData.customerDocument
          }
        }
      })

      if (error) throw error

      if (data.success) {
        setCustomerStatus({
          status: 'success',
          message: 'Cliente criado com sucesso',
          data: data.customer
        })
        toast({
          title: "Cliente Criado",
          description: `Cliente ID: ${data.customer?.id}`
        })
      } else {
        setCustomerStatus({
          status: 'error',
          message: data.error
        })
        toast({
          title: "Erro ao Criar Cliente",
          description: data.error,
          variant: "destructive"
        })
      }
    } catch (error: any) {
      setCustomerStatus({
        status: 'error',
        message: error.message
      })
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setIsCreatingCustomer(false)
    }
  }

  const createTestSubscription = async () => {
    if (!testData.planId || !customerStatus.data?.id) {
      toast({
        title: "Dados Incompletos",
        description: "Plano e cliente são obrigatórios.",
        variant: "destructive"
      })
      return
    }

    setIsCreatingSubscription(true)
    
    try {
      const selectedPlan = planos.find(p => p.id === testData.planId)
      if (!selectedPlan || !selectedPlan.vindi_plan_id) {
        throw new Error('Plano não encontrado ou sem ID Vindi configurado')
      }

      const { data, error } = await supabase.functions.invoke('notify-external-api', {
        body: {
          operation: 'vindi-create-subscription',
          data: {
            customer_id: customerStatus.data.id,
            plan_id: selectedPlan.vindi_plan_id,
            payment_method_code: 'credit_card'
          }
        }
      })

      if (error) throw error

      if (data.success) {
        setSubscriptionStatus({
          status: 'success',
          message: 'Assinatura criada com sucesso',
          data: {
            ...data.subscription,
            checkout_link: data.checkout_link  // Incluir o checkout_link da resposta
          }
        })
        // Atualizar o subscriptionId para testes de consulta
        setTestData(prev => ({ ...prev, subscriptionId: data.subscription?.id?.toString() || '' }))
        toast({
          title: "Assinatura Criada",
          description: `Assinatura ID: ${data.subscription?.id}`
        })
      } else {
        setSubscriptionStatus({
          status: 'error',
          message: data.error
        })
        toast({
          title: "Erro ao Criar Assinatura",
          description: data.error,
          variant: "destructive"
        })
      }
    } catch (error: any) {
      setSubscriptionStatus({
        status: 'error',
        message: error.message
      })
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setIsCreatingSubscription(false)
    }
  }

  const refreshPaymentStatuses = async () => {
    setIsRefreshing(true)
    
    try {
      await refreshVindiStatuses.mutateAsync()
      setRefreshStatus({
        status: 'success',
        message: 'Atualização de status executada',
        data: {}
      })
    } catch (error: any) {
      setRefreshStatus({
        status: 'error',
        message: error.message
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  const getStatusBadge = (status: TestStatus['status']) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-100 text-green-700">Sucesso</Badge>
      case 'error':
        return <Badge variant="destructive">Erro</Badge>
      default:
        return <Badge variant="outline">Não testado</Badge>
    }
  }

  const getStatusIcon = (status: TestStatus['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      default:
        return <Activity className="h-4 w-4 text-muted-foreground" />
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Testes da API Vindi (Assinaturas)
        </CardTitle>
        <CardDescription>
          Teste as funcionalidades de assinatura e pagamento da Vindi
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Dados para Teste */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Dados para Teste</h4>
            <Button variant="outline" size="sm" onClick={loadExampleData}>
              Carregar Exemplo
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customerName">Nome do Cliente</Label>
              <Input
                id="customerName"
                value={testData.customerName}
                onChange={(e) => setTestData(prev => ({ ...prev, customerName: e.target.value }))}
                placeholder="João Silva"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerEmail">Email do Cliente</Label>
              <Input
                id="customerEmail"
                type="email"
                value={testData.customerEmail}
                onChange={(e) => setTestData(prev => ({ ...prev, customerEmail: e.target.value }))}
                placeholder="joao@exemplo.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerDocument">CPF do Cliente</Label>
              <Input
                id="customerDocument"
                value={testData.customerDocument}
                onChange={(e) => setTestData(prev => ({ ...prev, customerDocument: e.target.value }))}
                placeholder="11111111111"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="planId">Plano</Label>
              {isLoadingPlanos ? (
                <div className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 items-center text-sm text-muted-foreground">
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Carregando planos...
                </div>
              ) : planosComVindi.length === 0 ? (
                <div className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 items-center text-sm text-muted-foreground">
                  Nenhum plano com ID Vindi configurado
                </div>
              ) : (
                <Select value={testData.planId} onValueChange={(value) => setTestData(prev => ({ ...prev, planId: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um plano" />
                  </SelectTrigger>
                  <SelectContent>
                    {planosComVindi.map((plano) => (
                      <SelectItem key={plano.id} value={plano.id}>
                        {plano.nome} (Vindi Plan ID: {plano.vindi_plan_id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="subscriptionId">ID da Assinatura (para consultas)</Label>
              <Input
                id="subscriptionId"
                value={testData.subscriptionId}
                onChange={(e) => setTestData(prev => ({ ...prev, subscriptionId: e.target.value }))}
                placeholder="ID da assinatura para testes"
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Teste de Conectividade */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon(conectivityStatus.status)}
              <h4 className="text-sm font-medium">Conectividade Vindi</h4>
              {getStatusBadge(conectivityStatus.status)}
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={testVindiConnectivity}
              disabled={isTestingConnectivity}
            >
              {isTestingConnectivity ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Testando...
                </>
              ) : (
                <>
                  <Activity className="h-4 w-4 mr-2" />
                  Testar
                </>
              )}
            </Button>
          </div>
          
          {conectivityStatus.status === 'success' && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                {conectivityStatus.message}
              </AlertDescription>
            </Alert>
          )}
          
          {conectivityStatus.status === 'error' && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Erro:</strong> {conectivityStatus.message}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <Separator />

        {/* Criar Cliente */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon(customerStatus.status)}
              <h4 className="text-sm font-medium">Criar Cliente</h4>
              {getStatusBadge(customerStatus.status)}
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={createTestCustomer}
              disabled={isCreatingCustomer}
            >
              {isCreatingCustomer ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <Users className="h-4 w-4 mr-2" />
                  Criar Cliente
                </>
              )}
            </Button>
          </div>
          
          {customerStatus.status === 'success' && customerStatus.data && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Cliente criado com sucesso! ID: {customerStatus.data.id}
                <br />
                <code className="text-xs bg-muted p-1 rounded mt-1 block">
                  {JSON.stringify(customerStatus.data, null, 2)}
                </code>
              </AlertDescription>
            </Alert>
          )}
          
          {customerStatus.status === 'error' && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Erro:</strong> {customerStatus.message}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <Separator />

        {/* Criar Assinatura */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon(subscriptionStatus.status)}
              <h4 className="text-sm font-medium">Criar Assinatura</h4>
              {getStatusBadge(subscriptionStatus.status)}
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={createTestSubscription}
              disabled={isCreatingSubscription}
            >
              {isCreatingSubscription ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <Receipt className="h-4 w-4 mr-2" />
                  Criar Assinatura
                </>
              )}
            </Button>
          </div>
          
          {subscriptionStatus.status === 'success' && subscriptionStatus.data && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Assinatura criada com sucesso! ID: {subscriptionStatus.data.id}
                <br />
                Status: {subscriptionStatus.data.status}
                {subscriptionStatus.data.checkout_link && (
                  <>
                    <br />
                    <div className="mt-3 space-y-2">
                      <Label className="text-xs font-medium">Link de Checkout da MedPass:</Label>
                      <div className="flex gap-2">
                        <Input
                          value={subscriptionStatus.data.checkout_link}
                          readOnly
                          className="text-xs font-mono"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            navigator.clipboard.writeText(subscriptionStatus.data.checkout_link)
                            toast({
                              title: "URL copiada!",
                              description: "Link de checkout copiado para a área de transferência."
                            })
                          }}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(subscriptionStatus.data.checkout_link, '_blank')}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </>
                )}
                <br />
                <code className="text-xs bg-muted p-1 rounded mt-1 block">
                  {JSON.stringify(subscriptionStatus.data, null, 2)}
                </code>
              </AlertDescription>
            </Alert>
          )}
          
          {subscriptionStatus.status === 'error' && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Erro:</strong> {subscriptionStatus.message}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <Separator />

        {/* Refresh Payment Statuses */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon(refreshStatus.status)}
              <h4 className="text-sm font-medium">Atualizar Status de Pagamentos</h4>
              {getStatusBadge(refreshStatus.status)}
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={refreshPaymentStatuses}
              disabled={isRefreshing || isRefreshingVindi}
            >
              {(isRefreshing || isRefreshingVindi) ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Atualizando...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Atualizar Status
                </>
              )}
            </Button>
          </div>
          
          {refreshStatus.status === 'success' && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                {refreshStatus.message}
              </AlertDescription>
            </Alert>
          )}
          
          {refreshStatus.status === 'error' && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Erro:</strong> {refreshStatus.message}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  )
}