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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Carteira</h1>
          <p className="text-muted-foreground">
            Acompanhe suas comissões e receitas recorrentes
          </p>
        </div>
        <Button className="gap-2">
          <Download className="h-4 w-4" />
          Exportar Relatório
        </Button>
      </div>

      {/* Métricas Principais */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Comissão do Mês
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {isLoading ? '...' : `R$ ${comissaoAtual.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            </div>
            <p className="text-xs text-muted-foreground">
              Mês atual
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Receita Recorrente
            </CardTitle>
            <Repeat className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {isLoading ? '...' : `R$ ${recorrenciaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            </div>
            <p className="text-xs text-muted-foreground">
              Base garantida mensal
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Média Mensal
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '...' : `R$ ${mediaComissoes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            </div>
            <p className="text-xs text-muted-foreground">
              Histórico de comissões
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
            <p className="text-xs text-muted-foreground mt-2">
              R$ {metaMensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} meta
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detalhamento da Receita */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Composição da Receita</CardTitle>
            <CardDescription>
              Distribuição da receita por tipo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Comissões Novas Vendas</span>
                <span className="text-sm">
                  {isLoading ? '...' : `R$ ${novasVendas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                </span>
              </div>
              <Progress value={60} className="h-2" />
              <span className="text-xs text-muted-foreground">60% do total</span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Comissões Renovação</span>
                <span className="text-sm">
                  {isLoading ? '...' : `R$ ${renovacoes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                </span>
              </div>
              <Progress value={30} className="h-2" />
              <span className="text-xs text-muted-foreground">30% do total</span>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Bônus Performance</span>
                <span className="text-sm">
                  {isLoading ? '...' : `R$ ${bonus.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                </span>
              </div>
              <Progress value={10} className="h-2" />
              <span className="text-xs text-muted-foreground">10% do total</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Próximos Pagamentos</CardTitle>
            <CardDescription>
              Comissões a receber
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isLoading ? (
                <div className="text-center py-4 text-muted-foreground">
                  Carregando pagamentos...
                </div>
              ) : comissoesAtivas.length > 0 ? (
                comissoesAtivas.slice(0, 3).map((comissao, index) => {
                  const dataVencimento = new Date()
                  dataVencimento.setMonth(dataVencimento.getMonth() + index + 1)
                  dataVencimento.setDate(15)
                  
                  return (
                    <div key={comissao.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{dataVencimento.toLocaleDateString('pt-BR')}</p>
                          <p className="text-sm text-muted-foreground">
                            Comissão {new Date(comissao.mes_referencia).toLocaleString('pt-BR', { month: 'long' })}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline">
                        R$ {(comissao.valor_comissao || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </Badge>
                    </div>
                  )
                })
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  Nenhuma comissão pendente
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Histórico de Comissões */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Comissões</CardTitle>
          <CardDescription>
            Evolução das comissões nos últimos meses
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando histórico...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mês</TableHead>
                  <TableHead>Comissão</TableHead>
                  <TableHead>Vendas</TableHead>
                  <TableHead>Meta</TableHead>
                  <TableHead>Performance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comissoesMensais.length > 0 ? comissoesMensais.map((mes) => {
                  const performance = (mes.valor / mes.meta) * 100
                  return (
                    <TableRow key={mes.mes}>
                      <TableCell className="font-medium">{mes.mes}</TableCell>
                      <TableCell>
                        R$ {mes.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>{mes.vendas}</TableCell>
                      <TableCell>
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
                    <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                      Nenhuma comissão encontrada
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}