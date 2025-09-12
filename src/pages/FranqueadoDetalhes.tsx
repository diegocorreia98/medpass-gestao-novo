import { useState, useMemo } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { ArrowLeft, User, Mail, Phone, CreditCard, Building2, DollarSign, TrendingUp, TrendingDown, UserPlus, Calendar as CalendarIcon, Filter, Loader2 } from "lucide-react"
import { format, isWithinInterval, startOfMonth, endOfMonth } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { useUnidades } from "@/hooks/useUnidades"
import { useBeneficiarios } from "@/hooks/useBeneficiarios"
import { useComissoes } from "@/hooks/useComissoes"
import { useCancelamentos } from "@/hooks/useCancelamentos"
import type { BeneficiarioCompleto, ComissaoCompleta } from "@/types/database"

interface TransacaoView {
  id: string
  tipo: 'adesao' | 'cancelamento'
  cliente: string
  plano: string
  valor: number
  comissao: number
  data: string
  status: 'ativo' | 'inativo' | 'pendente' | 'pending_payment' | 'payment_confirmed' | 'rms_sent' | 'rms_failed'
}

export default function FranqueadoDetalhes() {
  const { cuf } = useParams()
  const navigate = useNavigate()
  const [startDate, setStartDate] = useState<Date>()
  const [endDate, setEndDate] = useState<Date>()

  // Fetch real data from database
  const { unidades, isLoading: loadingUnidades } = useUnidades()
  const { beneficiarios, isLoading: loadingBeneficiarios } = useBeneficiarios()
  const { comissoes, isLoading: loadingComissoes } = useComissoes()
  const { getCancelamentoByBeneficiario } = useCancelamentos()

  // Find the franchisee by CUF
  const franqueado = unidades?.find(unidade => {
    const generatedCuf = `UND-${unidade.id.slice(0, 8)}`
    return generatedCuf === cuf
  })
  
  const isLoading = loadingUnidades || loadingBeneficiarios || loadingComissoes

  // Process real data into view format
  const transacoes = useMemo(() => {
    if (!beneficiarios || !franqueado) return []
    
    const franqueadoBeneficiarios = beneficiarios.filter(b => b.unidade_id === franqueado.id)
    
    return franqueadoBeneficiarios.map(beneficiario => ({
      id: beneficiario.id,
      tipo: 'adesao' as const,
      cliente: beneficiario.nome,
      plano: beneficiario.plano?.nome || 'Plano não identificado',
      valor: beneficiario.valor_plano,
      comissao: 0, // Will be calculated with comissões data
      data: beneficiario.data_adesao,
      status: beneficiario.status
    }))
  }, [beneficiarios, franqueado])

  // Add commission data to transactions
  const transacoesComComissao = useMemo(() => {
    if (!comissoes) return transacoes
    
    return transacoes.map(transacao => {
      const comissao = comissoes.find(c => c.beneficiario_id === transacao.id)
      return {
        ...transacao,
        comissao: comissao?.valor_comissao || 0
      }
    })
  }, [transacoes, comissoes])

  // Filter by date range
  const filteredTransacoes = useMemo(() => {
    return transacoesComComissao.filter(transacao => {
      const transacaoDate = new Date(transacao.data)
      if (startDate && transacaoDate < startDate) return false
      if (endDate && transacaoDate > endDate) return false
      return true
    })
  }, [transacoesComComissao, startDate, endDate])

  // Separate by type and get cancelled ones
  const adesoes = filteredTransacoes.filter(t => t.status === 'ativo' || t.status === 'pendente')
  const cancelamentos = filteredTransacoes.filter(t => t.status === 'inativo')

  // Calculate metrics
  const totalVendas = adesoes.reduce((acc, t) => acc + t.valor, 0)
  const totalComissoes = comissoes?.filter(c => 
    franqueado && c.unidade_id === franqueado.id &&
    (!startDate || !endDate || isWithinInterval(new Date(c.mes_referencia), { start: startDate, end: endDate }))
  ).reduce((acc, c) => acc + c.valor_comissao, 0) || 0
  
  const currentMonth = new Date()
  const vendasMes = adesoes.filter(t => 
    isWithinInterval(new Date(t.data), {
      start: startOfMonth(currentMonth),
      end: endOfMonth(currentMonth)
    })
  ).length
  
  const totalTransacoes = adesoes.length + cancelamentos.length
  const taxaConversao = totalTransacoes > 0 ? ((adesoes.length / totalTransacoes) * 100).toFixed(1) : '0.0'

  const clearFilters = () => {
    setStartDate(undefined)
    setEndDate(undefined)
  }

  const renderTable = (data: TransacaoView[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Cliente</TableHead>
          <TableHead>Plano</TableHead>
          <TableHead>Valor</TableHead>
          <TableHead>Comissão</TableHead>
          <TableHead>Data</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((item) => (
          <TableRow key={item.id}>
            <TableCell className="font-medium">{item.cliente}</TableCell>
            <TableCell>{item.plano}</TableCell>
            <TableCell className="text-green-600">
              R$ {item.valor.toFixed(2)}
            </TableCell>
            <TableCell className="text-green-600">
              R$ {item.comissao.toFixed(2)}
            </TableCell>
            <TableCell>{new Date(item.data).toLocaleDateString('pt-BR')}</TableCell>
            <TableCell>
              <Badge variant={
                item.status === 'ativo' ? 'default' : 
                item.status === 'pendente' ? 'secondary' : 'destructive'
              }>
                {item.status}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )

  const DatePicker = ({ 
    date, 
    onDateChange, 
    placeholder 
  }: { 
    date: Date | undefined
    onDateChange: (date: Date | undefined) => void
    placeholder: string 
  }) => (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-[180px] justify-start text-left font-normal",
            !date && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "dd/MM/yyyy") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={onDateChange}
          initialFocus
          className="p-3 pointer-events-auto"
          locale={ptBR}
        />
      </PopoverContent>
    </Popover>
  )

  // Show loading state
  if (isLoading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-center min-h-96">
          <div className="flex items-center gap-2">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Carregando dados do franqueado...</span>
          </div>
        </div>
      </div>
    )
  }

  // Show error if franchisee not found
  if (!franqueado) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate('/franqueados')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Franqueado Não Encontrado</h1>
            <p className="text-muted-foreground">O franqueado com CUF "{cuf}" não foi encontrado</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => navigate('/franqueados')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Detalhes do Franqueado</h1>
          <p className="text-muted-foreground">Visualize todas as informações e atividades</p>
        </div>
      </div>

      {/* Franqueado Info */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex items-center gap-3">
              <User className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Nome</p>
                <p className="font-medium text-foreground">{franqueado.nome}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-lg px-3 py-1">
                {franqueado.id}
              </Badge>
            </div>
            
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium text-foreground">{franqueado.email || 'Não informado'}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Telefone</p>
                <p className="font-medium text-foreground">{franqueado.telefone || 'Não informado'}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-border">
            <h3 className="font-medium text-foreground mb-4 flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Informações da Unidade
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">CNPJ</p>
                <p className="font-medium text-foreground">{franqueado.cnpj || 'Não informado'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cidade</p>
                <p className="font-medium text-foreground">{franqueado.cidade || 'Não informado'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Estado</p>
                <p className="font-medium text-foreground">{franqueado.estado || 'Não informado'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Responsável</p>
                <p className="font-medium text-foreground">{franqueado.responsavel || 'Não informado'}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <p className="text-sm text-muted-foreground">Total Vendas</p>
            </div>
            <p className="text-2xl font-bold text-foreground">R$ {totalVendas.toFixed(2)}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <p className="text-sm text-muted-foreground">Comissões</p>
            </div>
            <p className="text-2xl font-bold text-foreground">R$ {totalComissoes.toFixed(2)}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-blue-600" />
              <p className="text-sm text-muted-foreground">Vendas este mês</p>
            </div>
            <p className="text-2xl font-bold text-foreground">{vendasMes}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-orange-600" />
              <p className="text-sm text-muted-foreground">Taxa Conversão</p>
            </div>
            <p className="text-2xl font-bold text-foreground">{taxaConversao}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros por Período
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Data inicial:</span>
              <DatePicker
                date={startDate}
                onDateChange={setStartDate}
                placeholder="Selecione a data"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Data final:</span>
              <DatePicker
                date={endDate}
                onDateChange={setEndDate}
                placeholder="Selecione a data"
              />
            </div>
            {(startDate || endDate) && (
              <Button 
                variant="outline" 
                onClick={clearFilters}
                className="ml-auto"
              >
                Limpar Filtros
              </Button>
            )}
          </div>
          {(startDate || endDate) && (
            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Mostrando dados de{" "}
                {startDate ? format(startDate, "dd/MM/yyyy") : "início"} até{" "}
                {endDate ? format(endDate, "dd/MM/yyyy") : "hoje"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="adesoes" className="space-y-4">
        <TabsList>
          <TabsTrigger value="adesoes">Adesões ({adesoes.length})</TabsTrigger>
          <TabsTrigger value="cancelamentos">Cancelamentos ({cancelamentos.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="adesoes">
          <Card>
            <CardHeader>
              <CardTitle>Adesões Processadas</CardTitle>
            </CardHeader>
            <CardContent>
              {adesoes.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhuma adesão encontrada</p>
              ) : (
                renderTable(adesoes)
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="cancelamentos">
          <Card>
            <CardHeader>
              <CardTitle>Cancelamentos Realizados</CardTitle>
            </CardHeader>
            <CardContent>
              {cancelamentos.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">Nenhum cancelamento encontrado</p>
              ) : (
                renderTable(cancelamentos)
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}