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
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground leading-tight">
            Dashboard da Unidade
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Acompanhe o desempenho da unidade: {unidadeDoUsuario?.nome || 'Carregando...'}
          </p>
        </div>
        <Badge variant="outline" className="gap-2 h-10 sm:h-8 w-fit self-start sm:self-auto">
          <Calendar className="h-4 w-4" />
          <span className="text-xs sm:text-sm">
            {new Date().toLocaleDateString('pt-BR', {
              month: 'long',
              year: 'numeric'
            })}
          </span>
        </Badge>
      </div>

      {/* Gráfico de Adesões e Cancelamentos */}
      <ChartAreaInteractive unidadeId={unidadeDoUsuario?.id} />

      {/* Métricas Principais */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 p-4 sm:p-6 sm:pb-2">
            <CardTitle className="text-sm sm:text-base font-medium leading-tight">
              Comissão Mensal
            </CardTitle>
            <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="text-xl sm:text-2xl font-bold text-primary">
              {isLoading ? '...' : `R$ ${comissaoMensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Mês atual
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 p-4 sm:p-6 sm:pb-2">
            <CardTitle className="text-sm sm:text-base font-medium leading-tight">
              Clientes Ativos
            </CardTitle>
            <Users className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="text-xl sm:text-2xl font-bold">
              {isLoading ? '...' : clientesAtivos}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Total ativo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 p-4 sm:p-6 sm:pb-2">
            <CardTitle className="text-sm sm:text-base font-medium leading-tight">
              Recorrência
            </CardTitle>
            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="text-xl sm:text-2xl font-bold text-green-600">
              {isLoading ? '...' : `R$ ${receitaRecorrente.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Base recorrente mensal
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 p-4 sm:p-6 sm:pb-2">
            <CardTitle className="text-sm sm:text-base font-medium leading-tight">
              Meta Mensal
            </CardTitle>
            <Target className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="text-xl sm:text-2xl font-bold">
              {isLoading ? '...' : `${progressoMeta.toFixed(1)}%`}
            </div>
            <Progress value={progressoMeta} className="mt-2 h-2 sm:h-3" />
          </CardContent>
        </Card>
      </div>

      {/* Status de Clientes */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Users className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 flex-shrink-0" />
              <span>Planos Ativos</span>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Clientes com planos em dia
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="text-2xl sm:text-3xl font-bold text-green-600">
              {isLoading ? '...' : clientesAtivos}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-2">
              100% ativos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500 flex-shrink-0" />
              <span>Pendências</span>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Clientes com status pendente
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="text-2xl sm:text-3xl font-bold text-yellow-600">
              {isLoading ? '...' : beneficiarios.filter(b => b.status === 'pendente').length}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-2">
              Requer atenção
            </p>
          </CardContent>
        </Card>

        <Card className="sm:col-span-2 lg:col-span-1">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-red-500 flex-shrink-0" />
              <span>Inativos</span>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Clientes inativos
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="text-2xl sm:text-3xl font-bold text-red-600">
              {isLoading ? '...' : beneficiarios.filter(b => b.status === 'inativo').length}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-2">
              Status inativo
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Ações Rápidas */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg">Ações Rápidas</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Acesse rapidamente as funcionalidades mais utilizadas
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <div className="p-4 sm:p-5 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors touch-manipulation min-h-[80px] sm:min-h-[96px] flex flex-col justify-center">
              <h3 className="font-medium mb-2 text-sm sm:text-base">Novo Orçamento</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Gerar orçamento para novo cliente
              </p>
            </div>
            <div className="p-4 sm:p-5 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors touch-manipulation min-h-[80px] sm:min-h-[96px] flex flex-col justify-center">
              <h3 className="font-medium mb-2 text-sm sm:text-base">Gestão de Clientes</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Visualizar e gerenciar clientes
              </p>
            </div>
            <div className="p-4 sm:p-5 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors touch-manipulation min-h-[80px] sm:min-h-[96px] flex flex-col justify-center">
              <h3 className="font-medium mb-2 text-sm sm:text-base">Relatório Mensal</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Gerar relatório do período
              </p>
            </div>
            <div className="p-4 sm:p-5 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors touch-manipulation min-h-[80px] sm:min-h-[96px] flex flex-col justify-center sm:col-span-2 lg:col-span-1">
              <h3 className="font-medium mb-2 text-sm sm:text-base">Carteira</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Ver comissões e recorrência
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}