
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import {
  Server,
  TestTube,
  Eye,
  EyeOff,
  FileText,
  User,
  Users,
  UserX
} from "lucide-react"

interface TestData {
  // Campos para adesão
  nome: string
  cpf: string
  dataNascimento: string
  celular: string
  email: string
  cep: string
  numero: string
  uf: string
  codigoExterno: string
  idBeneficiarioTipo: number
  tipoPlano: number
  cpfTitular: string // CPF do titular (obrigatório para dependentes)

  // Campos para cancelamento
  motivo: string
  dataCancelamento: string
}

export default function RealDataTestCard() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  
  const [testData, setTestData] = useState<TestData>({
    nome: "",
    cpf: "",
    dataNascimento: "",
    celular: "",
    email: "",
    cep: "",
    numero: "",
    uf: "",
    codigoExterno: "",
    idBeneficiarioTipo: 1,
    tipoPlano: 102303,
    cpfTitular: "",
    motivo: "",
    dataCancelamento: new Date().toISOString().split('T')[0]
  })
  
  const [showJsonPreview, setShowJsonPreview] = useState(false)
  const [lastResponse, setLastResponse] = useState<any>(null)

  // Função para converter data de YYYY-MM-DD para DDMMYYYY
  const convertDateToDDMMYYYY = (dateString: string): string => {
    if (!dateString) return ""
    
    // Se já está no formato DDMMYYYY, retorna como está
    if (/^\d{8}$/.test(dateString)) {
      return dateString
    }
    
    // Converte de YYYY-MM-DD para DDMMYYYY
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      const [year, month, day] = dateString.split('-')
      return `${day}${month}${year}`
    }
    
    return dateString
  }

  const testAdesao = useMutation({
    mutationFn: async () => {
      // Converter data antes de enviar
      const dataNascimentoFormatted = convertDateToDDMMYYYY(testData.dataNascimento)
      
      console.log('=== DEBUG REAL DATA TEST CARD ===')
      console.log('Data original:', testData.dataNascimento)
      console.log('Data convertida:', dataNascimentoFormatted)
      
      const dataToSend = {
        nome: testData.nome,
        cpf: testData.cpf,
        dataNascimento: dataNascimentoFormatted,
        celular: testData.celular,
        email: testData.email,
        cep: testData.cep,
        numero: testData.numero,
        uf: testData.uf,
        codigoExterno: testData.codigoExterno,
        idBeneficiarioTipo: testData.idBeneficiarioTipo,
        tipoPlano: testData.tipoPlano,
        // Incluir cpfTitular se for dependente (tipo 3)
        ...(testData.idBeneficiarioTipo === 3 && testData.cpfTitular && { cpfTitular: testData.cpfTitular })
      }
      
      console.log('Dados que serão enviados:', JSON.stringify(dataToSend, null, 2))

      const { data, error } = await supabase.functions.invoke('notify-external-api', {
        body: {
          operation: 'test-adesao',
          data: dataToSend
        }
      })

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      toast({
        title: "Teste de Adesão",
        description: "Teste com dados reais executado com sucesso. Verifique os logs para ver a resposta.",
      })
      setLastResponse(data)
      queryClient.invalidateQueries({ queryKey: ['api-logs'] })
    },
    onError: (error: any) => {
      toast({
        title: "Erro no Teste de Adesão",
        description: error.message || "Erro ao executar teste com dados reais",
        variant: "destructive"
      })
      setLastResponse(error)
    }
  })

  const testCancelamento = useMutation({
    mutationFn: async () => {
      // Converter data antes de enviar
      const dataCancelamentoFormatted = convertDateToDDMMYYYY(testData.dataCancelamento)
      
      console.log('=== DEBUG CANCELAMENTO REAL DATA ===')
      console.log('Data cancelamento original:', testData.dataCancelamento)
      console.log('Data cancelamento convertida:', dataCancelamentoFormatted)

      const dataToSend = {
        codigoExterno: testData.codigoExterno,
        cpf: testData.cpf,
        motivo: testData.motivo,
        dataCancelamento: dataCancelamentoFormatted
      }
      
      console.log('Dados cancelamento que serão enviados:', JSON.stringify(dataToSend, null, 2))

      const { data, error } = await supabase.functions.invoke('notify-external-api', {
        body: {
          operation: 'test-cancelamento',
          data: dataToSend
        }
      })

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      toast({
        title: "Teste de Cancelamento",
        description: "Teste com dados reais executado com sucesso. Verifique os logs para ver a resposta.",
      })
      setLastResponse(data)
      queryClient.invalidateQueries({ queryKey: ['api-logs'] })
    },
    onError: (error: any) => {
      toast({
        title: "Erro no Teste de Cancelamento",
        description: error.message || "Erro ao executar teste com dados reais",
        variant: "destructive"
      })
      setLastResponse(error)
    }
  })

  const loadExampleData = () => {
    setTestData({
      nome: "João Silva",
      cpf: "11144477735", // CPF válido para teste
      dataNascimento: "1990-01-15", // Formato YYYY-MM-DD que será convertido
      celular: "11999999999",
      email: "joao.silva@email.com",
      cep: "01234567",
      numero: "123",
      uf: "SP",
      codigoExterno: "EXT123456",
      idBeneficiarioTipo: 1,
      tipoPlano: 102303,
      cpfTitular: "12345678901", // CPF do titular (para quando testar dependente)
      motivo: "Teste de cancelamento",
      dataCancelamento: new Date().toISOString().split('T')[0] // Data atual
    })

    toast({
      title: "Dados de Exemplo",
      description: "Dados de exemplo carregados com sucesso (CPF válido para teste)",
    })
  }

  const loadDependenteExample = () => {
    setTestData({
      nome: "Maria Silva Dependente",
      cpf: "22255588844", // CPF válido para teste do dependente
      dataNascimento: "2010-05-20", // Dependente menor de idade
      celular: "11988887777",
      email: "maria.dependente@email.com",
      cep: "01234567",
      numero: "123",
      uf: "SP",
      codigoExterno: "EXTDEP123",
      idBeneficiarioTipo: 3, // Dependente
      tipoPlano: 102304, // Plano Familiar
      cpfTitular: "11144477735", // CPF do titular
      motivo: "Teste de cancelamento de dependente",
      dataCancelamento: new Date().toISOString().split('T')[0]
    })

    toast({
      title: "Dados de Dependente",
      description: "Dados de exemplo para teste de dependente carregados com sucesso",
    })
  }

  const getJsonPreview = (operation: 'adesao' | 'cancelamento') => {
    if (operation === 'adesao') {
      const baseJson = {
        idClienteContrato: "{{ID_CLIENTE_CONTRATO}}",
        idBeneficiarioTipo: testData.idBeneficiarioTipo,
        nome: testData.nome,
        codigoExterno: testData.codigoExterno,
        idCliente: "{{ID_CLIENTE}}",
        cpf: testData.cpf,
        dataNascimento: convertDateToDDMMYYYY(testData.dataNascimento),
        celular: testData.celular,
        email: testData.email,
        cep: testData.cep,
        numero: testData.numero,
        uf: testData.uf,
        tipoPlano: testData.tipoPlano
      }

      // Adicionar cpfTitular se for dependente
      if (testData.idBeneficiarioTipo === 3 && testData.cpfTitular) {
        return { ...baseJson, cpfTitular: testData.cpfTitular }
      }

      return baseJson
    } else {
      return {
        idClienteContrato: "{{ID_CLIENTE_CONTRATO}}",
        idCliente: "{{ID_CLIENTE}}",
        codigoExterno: testData.codigoExterno,
        cpf: testData.cpf
      }
    }
  }

  const isAdesaoValid = testData.nome && testData.cpf && testData.email && testData.codigoExterno &&
    (testData.idBeneficiarioTipo !== 3 || testData.cpfTitular) // Para dependentes, cpfTitular é obrigatório
  const isCancelamentoValid = testData.codigoExterno && testData.cpf

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="h-5 w-5" />
          Teste com Dados Reais
        </CardTitle>
        <CardDescription>
          Teste a API externa com dados reais para validar o funcionamento completo. Suporte a titulares e dependentes (datas em formato DDMMYYYY)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Informação sobre dependentes */}
        {testData.idBeneficiarioTipo === 3 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <h4 className="text-sm font-medium text-blue-800 mb-1">Teste de Dependente</h4>
            <p className="text-xs text-blue-700">
              Para testes de dependentes, é obrigatório informar o CPF do titular. O tipo de plano deve ser Familiar (102304) e o tipo de beneficiário deve ser Dependente (3).
            </p>
          </div>
        )}

        {/* Formulário de Dados */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Nome *</Label>
            <Input 
              value={testData.nome}
              onChange={(e) => setTestData(prev => ({ ...prev, nome: e.target.value }))}
              placeholder="Nome completo"
            />
          </div>
          
          <div className="space-y-2">
            <Label>CPF *</Label>
            <Input 
              value={testData.cpf}
              onChange={(e) => setTestData(prev => ({ ...prev, cpf: e.target.value }))}
              placeholder="12345678901"
            />
          </div>
          
          <div className="space-y-2">
            <Label>Código Externo *</Label>
            <Input 
              value={testData.codigoExterno}
              onChange={(e) => setTestData(prev => ({ ...prev, codigoExterno: e.target.value }))}
              placeholder="EXT123456"
            />
          </div>
          
          <div className="space-y-2">
            <Label>Data Nascimento (será convertida para DDMMYYYY)</Label>
            <Input 
              type="date"
              value={testData.dataNascimento}
              onChange={(e) => setTestData(prev => ({ ...prev, dataNascimento: e.target.value }))}
            />
          </div>
          
          <div className="space-y-2">
            <Label>Celular</Label>
            <Input 
              value={testData.celular}
              onChange={(e) => setTestData(prev => ({ ...prev, celular: e.target.value }))}
              placeholder="11999999999"
            />
          </div>
          
          <div className="space-y-2">
            <Label>Email *</Label>
            <Input 
              type="email"
              value={testData.email}
              onChange={(e) => setTestData(prev => ({ ...prev, email: e.target.value }))}
              placeholder="email@exemplo.com"
            />
          </div>
          
          <div className="space-y-2">
            <Label>CEP</Label>
            <Input 
              value={testData.cep}
              onChange={(e) => setTestData(prev => ({ ...prev, cep: e.target.value }))}
              placeholder="01234567"
            />
          </div>
          
          <div className="space-y-2">
            <Label>Número</Label>
            <Input 
              value={testData.numero}
              onChange={(e) => setTestData(prev => ({ ...prev, numero: e.target.value }))}
              placeholder="123"
            />
          </div>
          
          <div className="space-y-2">
            <Label>UF</Label>
            <Input 
              value={testData.uf}
              onChange={(e) => setTestData(prev => ({ ...prev, uf: e.target.value }))}
              placeholder="SP"
              maxLength={2}
            />
          </div>
          
          <div className="space-y-2">
            <Label>Tipo Plano</Label>
            <Select value={testData.tipoPlano.toString()} onValueChange={(value) => setTestData(prev => ({ ...prev, tipoPlano: parseInt(value) }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="102303">Individual (102303)</SelectItem>
                <SelectItem value="102304">Familiar (102304)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Tipo Beneficiário</Label>
            <Select value={testData.idBeneficiarioTipo.toString()} onValueChange={(value) => setTestData(prev => ({ ...prev, idBeneficiarioTipo: parseInt(value) }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Titular (1)</SelectItem>
                <SelectItem value="3">Dependente (3)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Campo CPF Titular - só aparece se for dependente */}
          {testData.idBeneficiarioTipo === 3 && (
            <div className="space-y-2">
              <Label>CPF do Titular * <span className="text-xs text-muted-foreground">(obrigatório para dependentes)</span></Label>
              <Input
                value={testData.cpfTitular}
                onChange={(e) => setTestData(prev => ({ ...prev, cpfTitular: e.target.value }))}
                placeholder="12345678901"
              />
            </div>
          )}
        </div>

        {/* Campos para Cancelamento */}
        <div className="border-t pt-4">
          <h4 className="text-sm font-medium mb-3 text-muted-foreground">Campos para Teste de Cancelamento</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Motivo do Cancelamento</Label>
              <Textarea 
                value={testData.motivo}
                onChange={(e) => setTestData(prev => ({ ...prev, motivo: e.target.value }))}
                placeholder="Motivo do cancelamento"
                rows={2}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Data Cancelamento (será convertida para DDMMYYYY)</Label>
              <Input 
                type="date"
                value={testData.dataCancelamento}
                onChange={(e) => setTestData(prev => ({ ...prev, dataCancelamento: e.target.value }))}
              />
            </div>
          </div>
        </div>

        {/* Ações */}
        <div className="flex flex-wrap gap-2">
          <Button onClick={loadExampleData} variant="outline" size="sm">
            <User className="h-4 w-4 mr-2" />
            Exemplo Titular
          </Button>

          <Button onClick={loadDependenteExample} variant="outline" size="sm">
            <Users className="h-4 w-4 mr-2" />
            Exemplo Dependente
          </Button>
          
          <Button 
            onClick={() => setShowJsonPreview(!showJsonPreview)} 
            variant="outline" 
            size="sm"
          >
            {showJsonPreview ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
            {showJsonPreview ? "Ocultar" : "Mostrar"} JSON
          </Button>
          
          <Button 
            onClick={() => testAdesao.mutate()}
            disabled={!isAdesaoValid || testAdesao.isPending}
            size="sm"
          >
            <User className="h-4 w-4 mr-2" />
            {testAdesao.isPending ? "Testando..." : "Testar Adesão"}
          </Button>
          
          <Button 
            onClick={() => testCancelamento.mutate()}
            disabled={!isCancelamentoValid || testCancelamento.isPending}
            variant="destructive"
            size="sm"
          >
            <UserX className="h-4 w-4 mr-2" />
            {testCancelamento.isPending ? "Testando..." : "Testar Cancelamento"}
          </Button>
        </div>

        {/* Preview JSON */}
        {showJsonPreview && (
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2">JSON para Adesão (com datas em DDMMYYYY):</h4>
              <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
                {JSON.stringify(getJsonPreview('adesao'), null, 2)}
              </pre>
            </div>
            
            <div>
              <h4 className="text-sm font-medium mb-2">JSON para Cancelamento (com datas em DDMMYYYY):</h4>
              <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
                {JSON.stringify(getJsonPreview('cancelamento'), null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* Última Resposta */}
        {lastResponse && (
          <div>
            <h4 className="text-sm font-medium mb-2">Última Resposta:</h4>
            <div className="bg-muted p-3 rounded">
              {lastResponse.success ? (
                <Badge variant="default" className="mb-2">Sucesso</Badge>
              ) : (
                <Badge variant="destructive" className="mb-2">Erro</Badge>
              )}
              <pre className="text-xs overflow-x-auto">
                {JSON.stringify(lastResponse, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
