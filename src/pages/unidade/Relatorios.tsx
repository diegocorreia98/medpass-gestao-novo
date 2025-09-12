import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { 
  Download, 
  Calendar, 
  FileText, 
  BarChart3,
  TrendingUp,
  Users,
  DollarSign,
  Target
} from "lucide-react"
import { useBeneficiarios } from "@/hooks/useBeneficiarios"
import { useComissoes } from "@/hooks/useComissoes"
import { useToast } from "@/hooks/use-toast"

export default function Relatorios() {
  const [selectedPeriod, setSelectedPeriod] = useState("mensal")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  const { beneficiarios, isLoading: beneficiariosLoading } = useBeneficiarios()
  const { comissoes, isLoading: comissoesLoading } = useComissoes()
  const { toast } = useToast()
  
  const isLoading = beneficiariosLoading || comissoesLoading

  // Calcular métricas reais
  const totalVendas = beneficiarios.length
  const clientesAtivos = beneficiarios.filter(b => b.status === 'ativo').length
  
  const comissaoMesAtual = comissoes
    .filter(c => {
      const mesAtual = new Date().getMonth()
      const anoAtual = new Date().getFullYear()
      const comissaoData = new Date(c.mes_referencia)
      return comissaoData.getMonth() === mesAtual && comissaoData.getFullYear() === anoAtual
    })
    .reduce((total, c) => total + (c.valor_comissao || 0), 0)

  const metaMensal = 20000
  const metaAtingida = Math.min((comissaoMesAtual / metaMensal) * 100, 100)

  const vendasMesAtual = beneficiarios.filter(b => {
    const mesAtual = new Date().getMonth()
    const anoAtual = new Date().getFullYear()
    const adesaoData = new Date(b.data_adesao)
    return adesaoData.getMonth() === mesAtual && adesaoData.getFullYear() === anoAtual
  }).length

  const relatoriosDisponiveis = [
    {
      id: "vendas",
      titulo: "Relatório de Vendas",
      descricao: "Análise detalhada das vendas por período",
      icon: BarChart3,
      badge: "Novo"
    },
    {
      id: "comissoes",
      titulo: "Relatório de Comissões",
      descricao: "Histórico completo de comissões recebidas",
      icon: DollarSign,
      badge: null
    },
    {
      id: "clientes",
      titulo: "Relatório de Clientes",
      descricao: "Status e informações dos clientes",
      icon: Users,
      badge: null
    },
    {
      id: "performance",
      titulo: "Relatório de Performance",
      descricao: "Análise de metas e objetivos",
      icon: Target,
      badge: "Popular"
    },
    {
      id: "recorrencia",
      titulo: "Relatório de Recorrência",
      descricao: "Análise da base recorrente",
      icon: TrendingUp,
      badge: null
    },
    {
      id: "geral",
      titulo: "Relatório Geral",
      descricao: "Visão consolidada de todas as métricas",
      icon: FileText,
      badge: "Completo"
    }
  ]

  const handleGenerateReport = (reportId: string) => {
    toast({
      title: "Relatório em Geração",
      description: `O relatório ${reportId} será processado em breve.`,
    })
    
    // Aqui você implementaria a lógica real de geração do relatório
    console.log(`Gerando relatório: ${reportId}`)
    console.log(`Período: ${selectedPeriod}`)
    console.log(`Data início: ${startDate}`)
    console.log(`Data fim: ${endDate}`)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Relatórios</h1>
          <p className="text-muted-foreground">
            Gere relatórios detalhados sobre sua performance
          </p>
        </div>
      </div>

      {/* Filtros de Período */}
      <Card>
        <CardHeader>
          <CardTitle>Configurações do Relatório</CardTitle>
          <CardDescription>
            Defina o período e parâmetros para gerar os relatórios
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label htmlFor="period">Período</Label>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="semanal">Semanal</SelectItem>
                  <SelectItem value="mensal">Mensal</SelectItem>
                  <SelectItem value="trimestral">Trimestral</SelectItem>
                  <SelectItem value="semestral">Semestral</SelectItem>
                  <SelectItem value="anual">Anual</SelectItem>
                  <SelectItem value="personalizado">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedPeriod === "personalizado" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="start-date">Data Início</Label>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="end-date">Data Fim</Label>
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </>
            )}

            <div className="flex items-end">
              <Button className="w-full gap-2">
                <Calendar className="h-4 w-4" />
                Aplicar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Métricas Rápidas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Total de Vendas</span>
            </div>
            <div className="text-2xl font-bold mt-2">
              {isLoading ? '...' : vendasMesAtual}
            </div>
            <p className="text-xs text-muted-foreground">Este mês</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Comissões</span>
            </div>
            <div className="text-2xl font-bold mt-2">
              {isLoading ? '...' : `R$ ${comissaoMesAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            </div>
            <p className="text-xs text-muted-foreground">Este mês</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Clientes Ativos</span>
            </div>
            <div className="text-2xl font-bold mt-2">
              {isLoading ? '...' : clientesAtivos}
            </div>
            <p className="text-xs text-muted-foreground">Total ativo</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium">Meta Atingida</span>
            </div>
            <div className="text-2xl font-bold mt-2">
              {isLoading ? '...' : `${metaAtingida.toFixed(1)}%`}
            </div>
            <p className="text-xs text-muted-foreground">Meta mensal</p>
          </CardContent>
        </Card>
      </div>

      {/* Relatórios Disponíveis */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {relatoriosDisponiveis.map((relatorio) => {
          const Icon = relatorio.icon
          return (
            <Card key={relatorio.id} className="hover:shadow-md transition-shadow flex flex-col">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{relatorio.titulo}</CardTitle>
                      {relatorio.badge && (
                        <Badge variant="outline" className="mt-1">
                          {relatorio.badge}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <CardDescription className="mt-2">
                  {relatorio.descricao}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 mt-auto">
                <Button 
                  className="w-full gap-2"
                  onClick={() => handleGenerateReport(relatorio.id)}
                >
                  <Download className="h-4 w-4" />
                  Gerar Relatório
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Últimos Relatórios */}
      <Card>
        <CardHeader>
          <CardTitle>Últimos Relatórios Gerados</CardTitle>
          <CardDescription>
            Histórico dos relatórios gerados recentemente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-4 text-muted-foreground">
                Carregando histórico...
              </div>
            ) : (
              [
                { 
                  nome: `Relatório de Vendas - ${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`, 
                  data: new Date().toISOString(), 
                  tipo: "PDF" 
                },
                { 
                  nome: `Relatório de Comissões - ${new Date(Date.now() - 30*24*60*60*1000).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`, 
                  data: new Date(Date.now() - 30*24*60*60*1000).toISOString(), 
                  tipo: "Excel" 
                },
                { 
                  nome: `Relatório Geral - ${new Date(Date.now() - 60*24*60*60*1000).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`, 
                  data: new Date(Date.now() - 60*24*60*60*1000).toISOString(), 
                  tipo: "PDF" 
                },
              ].map((relatorio, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{relatorio.nome}</p>
                      <p className="text-sm text-muted-foreground">
                        Gerado em {new Date(relatorio.data).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{relatorio.tipo}</Badge>
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}