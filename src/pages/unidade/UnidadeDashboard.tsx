import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  Target, 
  Calendar,
  CreditCard
} from "lucide-react"
import { useBeneficiarios } from "@/hooks/useBeneficiarios"
import { useComissoes } from "@/hooks/useComissoes"
import { useUnidades } from "@/hooks/useUnidades"
import { ChartAreaInteractive } from "@/components/charts/ChartAreaInteractive"

export default function UnidadeDashboard() {
  // Buscar a unidade do usuário logado
  const { unidades, isLoading: unidadesLoading } = useUnidades()
  const unidadeDoUsuario = unidades?.[0] // Para usuário de unidade, sempre há apenas uma unidade

  // Filtrar dados apenas da unidade do usuário
  const { beneficiarios, isLoading: beneficiariosLoading } = useBeneficiarios({
    unidadeId: unidadeDoUsuario?.id
  })
  const { comissoes, isLoading: comissoesLoading } = useComissoes({
    unidadeId: unidadeDoUsuario?.id
  })

  const isLoading = beneficiariosLoading || comissoesLoading || unidadesLoading

  // Calcular métricas baseadas nos dados reais
  const clientesAtivos = beneficiarios.filter(b => b.status === 'ativo').length
  
  const comissaoMensal = comissoes
    .filter(c => {
      const mesAtual = new Date().getMonth()
      const anoAtual = new Date().getFullYear()
      const comissaoData = new Date(c.mes_referencia)
      return comissaoData.getMonth() === mesAtual && comissaoData.getFullYear() === anoAtual
    })
    .reduce((total, c) => total + (c.valor_comissao || 0), 0)

  const comissoesAtivas = comissoes.filter(c => !c.pago)
  const receitaRecorrente = comissoesAtivas.reduce((total, c) => total + (c.valor_comissao || 0), 0)
  
  const metaMensal = 20000
  const progressoMeta = Math.min((comissaoMensal / metaMensal) * 100, 100)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard da Unidade</h1>
          <p className="text-muted-foreground">
            Acompanhe o desempenho da unidade: {unidadeDoUsuario?.nome || 'Carregando...'}
          </p>
        </div>
        <Badge variant="outline" className="gap-2">
          <Calendar className="h-4 w-4" />
          {new Date().toLocaleDateString('pt-BR', { 
            month: 'long', 
            year: 'numeric' 
          })}
        </Badge>
      </div>

      {/* Gráfico de Adesões e Cancelamentos */}
      <ChartAreaInteractive unidadeId={unidadeDoUsuario?.id} />

      {/* Métricas Principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Comissão Mensal
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {isLoading ? '...' : `R$ ${comissaoMensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            </div>
            <p className="text-xs text-muted-foreground">
              Mês atual
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Clientes Ativos
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '...' : clientesAtivos}
            </div>
            <p className="text-xs text-muted-foreground">
              Total ativo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Recorrência
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {isLoading ? '...' : `R$ ${receitaRecorrente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            </div>
            <p className="text-xs text-muted-foreground">
              Base recorrente mensal
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Meta Mensal
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '...' : `${progressoMeta.toFixed(1)}%`}
            </div>
            <Progress value={progressoMeta} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Status de Clientes */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-green-500" />
              Planos Ativos
            </CardTitle>
            <CardDescription>
              Clientes com planos em dia
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600">
              {isLoading ? '...' : clientesAtivos}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              100% ativos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5 text-yellow-500" />
              Pendências
            </CardTitle>
            <CardDescription>
              Clientes com status pendente
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">
              {isLoading ? '...' : beneficiarios.filter(b => b.status === 'pendente').length}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Requer atenção
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-red-500" />
              Inativos
            </CardTitle>
            <CardDescription>
              Clientes inativos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">
              {isLoading ? '...' : beneficiarios.filter(b => b.status === 'inativo').length}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Status inativo
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Ações Rápidas */}
      <Card>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
          <CardDescription>
            Acesse rapidamente as funcionalidades mais utilizadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
              <h3 className="font-medium mb-2">Novo Orçamento</h3>
              <p className="text-sm text-muted-foreground">
                Gerar orçamento para novo cliente
              </p>
            </div>
            <div className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
              <h3 className="font-medium mb-2">Gestão de Clientes</h3>
              <p className="text-sm text-muted-foreground">
                Visualizar e gerenciar clientes
              </p>
            </div>
            <div className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
              <h3 className="font-medium mb-2">Relatório Mensal</h3>
              <p className="text-sm text-muted-foreground">
                Gerar relatório do período
              </p>
            </div>
            <div className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors">
              <h3 className="font-medium mb-2">Carteira</h3>
              <p className="text-sm text-muted-foreground">
                Ver comissões e recorrência
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}