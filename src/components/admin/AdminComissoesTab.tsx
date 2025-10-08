import { useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Copy, Download, Filter, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { useComissoes } from "@/hooks/useComissoes"
import { useUnidades } from "@/hooks/useUnidades"

type FilterStatus = "all" | "pago" | "pendente"

export function AdminComissoesTab() {
  const { toast } = useToast()
  const { comissoes, isLoading } = useComissoes()
  const { unidades } = useUnidades()

  // Estados de filtros
  const [filterUnidade, setFilterUnidade] = useState<string>("all")
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all")
  const [filterPeriodoInicio, setFilterPeriodoInicio] = useState<string>("")
  const [filterPeriodoFim, setFilterPeriodoFim] = useState<string>("")
  const [filterValorMin, setFilterValorMin] = useState<string>("")
  const [filterValorMax, setFilterValorMax] = useState<string>("")

  // Função para copiar texto
  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast({
        title: "Copiado!",
        description: `${label} copiado para a área de transferência.`,
      })
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível copiar o texto.",
        variant: "destructive",
      })
    }
  }

  // Criar mapa de unidades por ID para acesso rápido
  const unidadesMap = useMemo(() => {
    const map = new Map()
    unidades?.forEach(unidade => {
      map.set(unidade.id, unidade)
    })
    console.log('[AdminComissoesTab] Unidades carregadas:', unidades?.length)
    console.log('[AdminComissoesTab] Exemplo de unidade:', unidades?.[0])
    return map
  }, [unidades])

  // Aplicar filtros
  const comissoesFiltradas = useMemo(() => {
    if (!comissoes) return []

    return comissoes.filter(comissao => {
      // Filtro por unidade
      if (filterUnidade !== "all" && comissao.unidade_id !== filterUnidade) {
        return false
      }

      // Filtro por status
      if (filterStatus !== "all") {
        const isPago = comissao.pago
        if (filterStatus === "pago" && !isPago) return false
        if (filterStatus === "pendente" && isPago) return false
      }

      // Filtro por período
      if (filterPeriodoInicio) {
        const mesReferencia = new Date(comissao.mes_referencia)
        const periodoInicio = new Date(filterPeriodoInicio)
        if (mesReferencia < periodoInicio) return false
      }
      if (filterPeriodoFim) {
        const mesReferencia = new Date(comissao.mes_referencia)
        const periodoFim = new Date(filterPeriodoFim)
        if (mesReferencia > periodoFim) return false
      }

      // Filtro por valor
      if (filterValorMin) {
        const valorMin = parseFloat(filterValorMin)
        if (comissao.valor_comissao < valorMin) return false
      }
      if (filterValorMax) {
        const valorMax = parseFloat(filterValorMax)
        if (comissao.valor_comissao > valorMax) return false
      }

      return true
    })
  }, [comissoes, filterUnidade, filterStatus, filterPeriodoInicio, filterPeriodoFim, filterValorMin, filterValorMax])

  // Função para limpar filtros
  const limparFiltros = () => {
    setFilterUnidade("all")
    setFilterStatus("all")
    setFilterPeriodoInicio("")
    setFilterPeriodoFim("")
    setFilterValorMin("")
    setFilterValorMax("")
  }

  // Verificar se há filtros ativos
  const hasFiltrosAtivos = filterUnidade !== "all" ||
                          filterStatus !== "all" ||
                          filterPeriodoInicio !== "" ||
                          filterPeriodoFim !== "" ||
                          filterValorMin !== "" ||
                          filterValorMax !== ""

  // Função para exportar para CSV
  const exportarParaCSV = () => {
    if (!comissoesFiltradas || comissoesFiltradas.length === 0) {
      toast({
        title: "Aviso",
        description: "Não há dados para exportar.",
        variant: "destructive",
      })
      return
    }

    const headers = [
      "Unidade",
      "Responsável",
      "Mês Referência",
      "Tipo",
      "Valor",
      "Status",
      "Data Pagamento",
      "Banco",
      "Agência",
      "Conta",
      "Tipo Conta",
      "Chave PIX",
      "Tipo Chave PIX"
    ]

    const rows = comissoesFiltradas.map(comissao => {
      const unidade = unidadesMap.get(comissao.unidade_id)
      return [
        unidade?.nome || comissao.unidade_id,
        unidade?.responsavel || "N/A",
        new Date(comissao.mes_referencia).toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' }),
        comissao.tipo_comissao || "N/A",
        `R$ ${comissao.valor_comissao.toFixed(2)}`,
        comissao.pago ? "Pago" : "Pendente",
        comissao.data_pagamento ? new Date(comissao.data_pagamento).toLocaleDateString('pt-BR') : "N/A",
        unidade?.banco || "N/A",
        unidade?.agencia || "N/A",
        unidade?.conta || "N/A",
        unidade?.tipo_conta || "N/A",
        unidade?.chave_pix || "N/A",
        unidade?.tipo_chave_pix || "N/A"
      ]
    })

    const csvContent = [
      headers.join(";"),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(";"))
    ].join("\n")

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `comissoes_${new Date().toISOString().split('T')[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    toast({
      title: "Sucesso!",
      description: `${comissoesFiltradas.length} registros exportados com sucesso.`,
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Carregando comissões...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filtros
              </CardTitle>
              <CardDescription>Filtre as comissões por diferentes critérios</CardDescription>
            </div>
            {hasFiltrosAtivos && (
              <Button variant="outline" size="sm" onClick={limparFiltros}>
                <X className="h-4 w-4 mr-2" />
                Limpar Filtros
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Filtro por Unidade */}
            <div className="space-y-2">
              <Label htmlFor="filter-unidade">Unidade</Label>
              <Select value={filterUnidade} onValueChange={setFilterUnidade}>
                <SelectTrigger id="filter-unidade">
                  <SelectValue placeholder="Todas as unidades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as unidades</SelectItem>
                  {unidades?.map(unidade => (
                    <SelectItem key={unidade.id} value={unidade.id}>
                      {unidade.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por Status */}
            <div className="space-y-2">
              <Label htmlFor="filter-status">Status</Label>
              <Select value={filterStatus} onValueChange={(value: FilterStatus) => setFilterStatus(value)}>
                <SelectTrigger id="filter-status">
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os status</SelectItem>
                  <SelectItem value="pago">Pago</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por Período - Início */}
            <div className="space-y-2">
              <Label htmlFor="filter-periodo-inicio">Período - Início</Label>
              <Input
                id="filter-periodo-inicio"
                type="month"
                value={filterPeriodoInicio}
                onChange={(e) => setFilterPeriodoInicio(e.target.value)}
              />
            </div>

            {/* Filtro por Período - Fim */}
            <div className="space-y-2">
              <Label htmlFor="filter-periodo-fim">Período - Fim</Label>
              <Input
                id="filter-periodo-fim"
                type="month"
                value={filterPeriodoFim}
                onChange={(e) => setFilterPeriodoFim(e.target.value)}
              />
            </div>

            {/* Filtro por Valor Mínimo */}
            <div className="space-y-2">
              <Label htmlFor="filter-valor-min">Valor Mínimo (R$)</Label>
              <Input
                id="filter-valor-min"
                type="number"
                step="0.01"
                placeholder="0,00"
                value={filterValorMin}
                onChange={(e) => setFilterValorMin(e.target.value)}
              />
            </div>

            {/* Filtro por Valor Máximo */}
            <div className="space-y-2">
              <Label htmlFor="filter-valor-max">Valor Máximo (R$)</Label>
              <Input
                id="filter-valor-max"
                type="number"
                step="0.01"
                placeholder="0,00"
                value={filterValorMax}
                onChange={(e) => setFilterValorMax(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Comissões */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Comissões</CardTitle>
              <CardDescription>
                Visualize todas as comissões do sistema
                {hasFiltrosAtivos && ` (${comissoesFiltradas.length} de ${comissoes?.length || 0} registros)`}
              </CardDescription>
            </div>
            <Button onClick={exportarParaCSV} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Unidade</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Mês</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Banco</TableHead>
                  <TableHead>Agência</TableHead>
                  <TableHead>Conta</TableHead>
                  <TableHead>PIX</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comissoesFiltradas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground">
                      Nenhuma comissão encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  comissoesFiltradas.map((comissao) => {
                    const unidade = unidadesMap.get(comissao.unidade_id)
                    return (
                      <TableRow key={comissao.id}>
                        <TableCell className="font-medium">
                          {unidade?.nome || comissao.unidade_id}
                        </TableCell>
                        <TableCell>{unidade?.responsavel || "N/A"}</TableCell>
                        <TableCell>
                          {new Date(comissao.mes_referencia).toLocaleDateString('pt-BR', {
                            month: '2-digit',
                            year: 'numeric'
                          })}
                        </TableCell>
                        <TableCell>
                          <Badge variant={comissao.tipo_comissao === 'adesao' ? 'default' : 'secondary'}>
                            {comissao.tipo_comissao === 'adesao' ? 'Adesão' : 'Recorrente'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          R$ {comissao.valor_comissao.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={comissao.pago ? "default" : "secondary"}>
                            {comissao.pago ? "Pago" : "Pendente"}
                          </Badge>
                        </TableCell>
                        <TableCell>{unidade?.banco || "N/A"}</TableCell>
                        <TableCell>{unidade?.agencia || "N/A"}</TableCell>
                        <TableCell>
                          {unidade?.conta ? (
                            <div className="flex items-center gap-2">
                              <span>{unidade.conta}</span>
                              <span className="text-xs text-muted-foreground">
                                ({unidade.tipo_conta || "N/A"})
                              </span>
                            </div>
                          ) : (
                            "N/A"
                          )}
                        </TableCell>
                        <TableCell>
                          {unidade?.chave_pix ? (
                            <div className="flex items-center gap-2">
                              <span className="text-sm truncate max-w-[150px]" title={unidade.chave_pix}>
                                {unidade.chave_pix}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(unidade.chave_pix!, "Chave PIX")}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            "N/A"
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
