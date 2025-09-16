import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  Download,
  CreditCard,
  Target,
  Repeat
} from "lucide-react"
import { useComissoes } from "@/hooks/useComissoes"
import { useBeneficiarios } from "@/hooks/useBeneficiarios"

interface ComissaoMensal {
  mes: string
  valor: number
  vendas: number
  meta: number
}

export default function Carteira() {
  const { comissoes, isLoading: comissoesLoading } = useComissoes()
  const { beneficiarios, isLoading: beneficiariosLoading } = useBeneficiarios()
  
  const isLoading = comissoesLoading || beneficiariosLoading

  // Calcular métricas baseadas nos dados reais
  const comissaoAtual = comissoes
    .filter(c => {
      const mesAtual = new Date().getMonth()
      const anoAtual = new Date().getFullYear()
      const comissaoData = new Date(c.mes_referencia)
      return comissaoData.getMonth() === mesAtual && comissaoData.getFullYear() === anoAtual
    })
    .reduce((total, c) => total + (c.valor_comissao || 0), 0)

  const comissoesAtivas = comissoes.filter(c => !c.pago)
  const recorrenciaTotal = comissoesAtivas.reduce((total, c) => total + (c.valor_comissao || 0), 0)
  
  const metaMensal = 20000
  const progressoMeta = Math.min((comissaoAtual / metaMensal) * 100, 100)

  const totalComissoes = comissoes.reduce((total, c) => total + (c.valor_comissao || 0), 0)
  const mediaComissoes = comissoes.length > 0 ? totalComissoes / comissoes.length : 0

  // Agrupar comissões por mês para histórico
  const comissoesPorMes = comissoes.reduce((acc, comissao) => {
    const data = new Date(comissao.mes_referencia)
    const mesAno = `${data.toLocaleString('pt-BR', { month: 'long' })} ${data.getFullYear()}`
    const chave = mesAno.charAt(0).toUpperCase() + mesAno.slice(1)
    
    if (!acc[chave]) {
      acc[chave] = { valor: 0, vendas: 0 }
    }
    acc[chave].valor += comissao.valor_comissao || 0
    acc[chave].vendas += 1
    
    return acc
  }, {} as Record<string, { valor: number; vendas: number }>)

  const comissoesMensais: ComissaoMensal[] = Object.entries(comissoesPorMes)
    .map(([mes, dados]) => ({
      mes,
      valor: dados.valor,
      vendas: dados.vendas,
      meta: metaMensal
    }))
    .slice(-6) // Últimos 6 meses

  // Calcular composição da receita
  const novasVendas = comissaoAtual * 0.6 // Estimativa
  const renovacoes = comissaoAtual * 0.3 // Estimativa
  const bonus = comissaoAtual * 0.1 // Estimativa

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground leading-tight">
            Carteira
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Acompanhe suas comissões e receitas recorrentes
          </p>
        </div>
        <Button className="gap-2 h-10 sm:h-9 w-fit self-start sm:self-auto touch-manipulation" size="sm">
          <Download className="h-4 w-4" />
          <span className="hidden sm:inline">Exportar Relatório</span>
          <span className="sm:hidden">Exportar</span>
        </Button>
      </div>

      {/* Métricas Principais */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 sm:p-6 pb-3 sm:pb-2">
            <CardTitle className="text-sm sm:text-base font-medium leading-tight">
              Comissão do Mês
            </CardTitle>
            <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="text-xl sm:text-2xl font-bold text-primary">
              {isLoading ? '...' : `R$ ${comissaoAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Mês atual
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 sm:p-6 pb-3 sm:pb-2">
            <CardTitle className="text-sm sm:text-base font-medium leading-tight">
              Receita Recorrente
            </CardTitle>
            <Repeat className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="text-xl sm:text-2xl font-bold text-green-600">
              {isLoading ? '...' : `R$ ${recorrenciaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Base garantida mensal
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 sm:p-6 pb-3 sm:pb-2">
            <CardTitle className="text-sm sm:text-base font-medium leading-tight">
              Média Mensal
            </CardTitle>
            <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="text-xl sm:text-2xl font-bold">
              {isLoading ? '...' : `R$ ${mediaComissoes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              Histórico de comissões
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 p-4 sm:p-6 pb-3 sm:pb-2">
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
            <p className="text-xs sm:text-sm text-muted-foreground mt-2">
              R$ {metaMensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} meta
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detalhamento da Receita */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Composição da Receita</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Distribuição da receita por tipo
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 space-y-3 sm:space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-medium">Comissões Novas Vendas</span>
                <span className="text-xs sm:text-sm">
                  {isLoading ? '...' : `R$ ${novasVendas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                </span>
              </div>
              <Progress value={60} className="h-2" />
              <span className="text-xs text-muted-foreground">60% do total</span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-medium">Comissões Renovação</span>
                <span className="text-xs sm:text-sm">
                  {isLoading ? '...' : `R$ ${renovacoes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                </span>
              </div>
              <Progress value={30} className="h-2" />
              <span className="text-xs text-muted-foreground">30% do total</span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs sm:text-sm font-medium">Bônus Performance</span>
                <span className="text-xs sm:text-sm">
                  {isLoading ? '...' : `R$ ${bonus.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                </span>
              </div>
              <Progress value={10} className="h-2" />
              <span className="text-xs text-muted-foreground">10% do total</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Próximos Pagamentos</CardTitle>
            <CardDescription className="text-xs sm:text-sm">
              Comissões a receber
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="space-y-3 sm:space-y-4">
              {isLoading ? (
                <div className="text-center py-4 sm:py-6 text-sm text-muted-foreground">
                  Carregando pagamentos...
                </div>
              ) : comissoesAtivas.length > 0 ? (
                comissoesAtivas.slice(0, 3).map((comissao, index) => {
                  const dataVencimento = new Date()
                  dataVencimento.setMonth(dataVencimento.getMonth() + index + 1)
                  dataVencimento.setDate(15)

                  return (
                    <div key={comissao.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium text-sm">{dataVencimento.toLocaleDateString('pt-BR')}</p>
                          <p className="text-xs sm:text-sm text-muted-foreground truncate">
                            Comissão {new Date(comissao.mes_referencia).toLocaleString('pt-BR', { month: 'long' })}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs sm:text-sm">
                        R$ {(comissao.valor_comissao || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </Badge>
                    </div>
                  )
                })
              ) : (
                <div className="text-center py-4 sm:py-6 text-sm text-muted-foreground">
                  Nenhuma comissão pendente
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Histórico de Comissões */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg">Histórico de Comissões</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Evolução das comissões nos últimos meses
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          {isLoading ? (
            <div className="text-center py-8 sm:py-12 text-sm text-muted-foreground">
              Carregando histórico...
            </div>
          ) : (
            <>
              {/* Mobile Cards */}
              <div className="block sm:hidden space-y-3">
                {comissoesMensais.length > 0 ? comissoesMensais.map((mes) => {
                  const performance = (mes.valor / mes.meta) * 100
                  return (
                    <Card key={mes.mes} className="p-4">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div className="min-w-0 flex-1">
                            <h4 className="font-medium text-sm">{mes.mes}</h4>
                            <p className="text-xs text-muted-foreground">{mes.vendas} vendas</p>
                          </div>
                          <Badge
                            variant={performance >= 100 ? "default" : "secondary"}
                            className={`text-xs ${performance >= 100 ? "bg-green-100 text-green-800" : ""}`}
                          >
                            {performance.toFixed(1)}%
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="text-muted-foreground">Comissão:</span>
                            <p className="font-medium">
                              R$ {mes.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Meta:</span>
                            <p className="font-medium">
                              R$ {mes.meta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                        </div>
                      </div>
                    </Card>
                  )
                }) : (
                  <div className="text-center py-8 text-sm text-muted-foreground">
                    Nenhuma comissão encontrada
                  </div>
                )}
              </div>

              {/* Desktop Table */}
              <div className="hidden sm:block border rounded-md overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="whitespace-nowrap">Mês</TableHead>
                        <TableHead className="whitespace-nowrap">Comissão</TableHead>
                        <TableHead className="whitespace-nowrap">Vendas</TableHead>
                        <TableHead className="whitespace-nowrap">Meta</TableHead>
                        <TableHead className="whitespace-nowrap">Performance</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {comissoesMensais.length > 0 ? comissoesMensais.map((mes) => {
                        const performance = (mes.valor / mes.meta) * 100
                        return (
                          <TableRow key={mes.mes}>
                            <TableCell className="font-medium max-w-[150px] truncate">{mes.mes}</TableCell>
                            <TableCell className="whitespace-nowrap">
                              R$ {mes.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">{mes.vendas}</TableCell>
                            <TableCell className="whitespace-nowrap">
                              R$ {mes.meta.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={performance >= 100 ? "default" : "secondary"}
                                className={performance >= 100 ? "bg-green-100 text-green-800" : ""}
                              >
                                {performance.toFixed(1)}%
                              </Badge>
                            </TableCell>
                          </TableRow>
                        )
                      }) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            Nenhuma comissão encontrada
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}