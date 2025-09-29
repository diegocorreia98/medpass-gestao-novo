import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { 
  Pagination,
  PaginationContent, 
  PaginationItem, 
  PaginationLink, 
  PaginationNext, 
  PaginationPrevious,
  PaginationEllipsis
} from "@/components/ui/pagination"
import { 
  Server, 
  Activity, 
  CheckCircle, 
  AlertCircle, 
  Search, 
  RefreshCw, 
  Eye, 
  RotateCcw,
  Filter,
  Download,
  Calendar
} from "lucide-react"
import { useApiLogs } from "@/hooks/useApiLogs"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import RealDataTestCard from "@/components/api-logs/RealDataTestCard"
import CredentialTestCard from "@/components/api-logs/CredentialTestCard"
import EndpointTestCard from "@/components/api-logs/EndpointTestCard"
import VindiTestCard from "@/components/api-logs/VindiTestCard"

export default function ApiLogs() {
  const [activeTab, setActiveTab] = useState("overview")
  const [filters, setFilters] = useState({
    operation: 'all',
    status: 'all',
    dateFrom: '',
    dateTo: '',
    page: 1
  })
  const [selectedLog, setSelectedLog] = useState<any>(null)

  // Filtros específicos por aba
  const getTabFilters = () => {
    switch (activeTab) {
      case 'beneficiarios':
        return {
          ...filters,
          operation: filters.operation === 'all' ? 'adesao,cancelamento,test-adesao,test-cancelamento,test-credentials' : filters.operation
        }
      case 'vindi':
        return {
          ...filters,
          operation: filters.operation === 'all' ? 'vindi-connectivity,vindi-create-customer,vindi-create-subscription,vindi-refresh-statuses' : filters.operation
        }
      default:
        return filters
    }
  }

  const tabFilters = getTabFilters()
  const { logs, pagination, stats, isLoading, refetch, testApiConnection, retryApiCall, isTestingConnection, isRetrying } = useApiLogs({
    ...tabFilters,
    operation: tabFilters.operation === 'all' ? undefined : tabFilters.operation,
    status: tabFilters.status === 'all' ? undefined : tabFilters.status,
    limit: 20
  })

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }))
  }

  const handleFiltersChange = (newFilters: any) => {
    setFilters(prev => ({ ...prev, ...newFilters, page: 1 }))
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "destructive" | "secondary" | "outline"> = {
      success: "default",
      error: "destructive", 
      pending: "outline"
    }
    const colors: Record<string, string> = {
      success: "bg-green-100 text-green-700",
      error: "bg-red-100 text-red-700",
      pending: "bg-yellow-100 text-yellow-700"
    }
    return <Badge variant={variants[status] || "secondary"} className={colors[status]}>{status}</Badge>
  }

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })
  }

  const exportLogs = () => {
    const csvContent = [
      ['Data', 'Operação', 'Status', 'Tentativas', 'Erro'].join(','),
      ...logs.map(log => [
        formatDate(log.created_at),
        log.operation,
        log.status,
        log.retry_count,
        log.error_message || ''
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `api_logs_${format(new Date(), 'yyyy-MM-dd')}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Logs da API Externa</h2>
        <p className="text-muted-foreground">Monitore e gerencie as integrações com APIs externas</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="beneficiarios">API Beneficiários</TabsTrigger>
          <TabsTrigger value="vindi">API Vindi</TabsTrigger>
          <TabsTrigger value="history">Histórico Completo</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Dashboard de Estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Chamadas</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Sucessos</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{stats.success}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Erros</CardTitle>
                <AlertCircle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{stats.error}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pendentes</CardTitle>
                <Activity className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Taxa de Sucesso</CardTitle>
                <Server className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.successRate}%</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Resumo das Integrações</CardTitle>
              <CardDescription>
                Status geral das APIs e últimas atividades
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium">API Beneficiários</h4>
                  <p className="text-sm text-muted-foreground">
                    Integração para adesão e cancelamento de beneficiários
                  </p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">API Vindi</h4>
                  <p className="text-sm text-muted-foreground">
                    Integração com gateway de pagamento Vindi
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="beneficiarios" className="space-y-6">
          <div className="space-y-6">
            <CredentialTestCard />
            <RealDataTestCard />
            <EndpointTestCard />
          </div>
        </TabsContent>

        <TabsContent value="vindi" className="space-y-6">
          <VindiTestCard />
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          {/* Controles e Filtros */}
          <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros e Ações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
            <div className="space-y-2">
              <Label>Operação</Label>
              <Select value={filters.operation} onValueChange={(value) => handleFiltersChange({ operation: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="adesao">Adesão</SelectItem>
                  <SelectItem value="cancelamento">Cancelamento</SelectItem>
                  <SelectItem value="dependentes">Dependentes</SelectItem>
                  <SelectItem value="test">Teste</SelectItem>
                  <SelectItem value="test-credentials">Teste Credenciais</SelectItem>
                  <SelectItem value="test-adesao">Teste Adesão</SelectItem>
                  <SelectItem value="test-cancelamento">Teste Cancelamento</SelectItem>
                  <SelectItem value="vindi-connectivity">Vindi Conectividade</SelectItem>
                  <SelectItem value="vindi-create-customer">Vindi Criar Cliente</SelectItem>
                  <SelectItem value="vindi-create-subscription">Vindi Criar Assinatura</SelectItem>
                  <SelectItem value="vindi-refresh-statuses">Vindi Refresh Status</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={filters.status} onValueChange={(value) => handleFiltersChange({ status: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="success">Sucesso</SelectItem>
                  <SelectItem value="error">Erro</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Data Início</Label>
              <Input 
                type="date" 
                value={filters.dateFrom}
                onChange={(e) => handleFiltersChange({ dateFrom: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Data Fim</Label>
              <Input 
                type="date" 
                value={filters.dateTo}
                onChange={(e) => handleFiltersChange({ dateTo: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>&nbsp;</Label>
              <div className="flex gap-2">
               <Button variant="outline" size="sm" onClick={() => setFilters({ operation: 'all', status: 'all', dateFrom: '', dateTo: '', page: 1 })}>
                 Limpar
               </Button>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={() => testApiConnection.mutate()}
              disabled={isTestingConnection}
            >
              <Server className="h-4 w-4 mr-2" />
              {isTestingConnection ? "Testando..." : "Testar Conectividade"}
            </Button>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            <Button variant="outline" onClick={exportLogs}>
              <Download className="h-4 w-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </CardContent>
      </Card>

          {/* Tabela de Logs */}
          <Card>
        <CardHeader>
          <CardTitle>Histórico de Chamadas</CardTitle>
          <CardDescription>
            {isLoading ? "Carregando logs..." : `${pagination.total} chamadas encontradas • Página ${pagination.page} de ${pagination.totalPages}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Operação</TableHead>
                <TableHead>Beneficiário</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Código RMS</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tentativas</TableHead>
                <TableHead>Erro</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{formatDate(log.created_at)}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{log.operation}</Badge>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    {log.beneficiario_nome ? (
                      <span className="font-medium text-sm">{log.beneficiario_nome}</span>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-xs">
                    {log.plano_nome ? (
                      <span className="text-sm">{log.plano_nome}</span>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {log.plano_codigo_rms ? (
                      <Badge variant="secondary" className="text-xs">
                        {log.plano_codigo_rms}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">-</span>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(log.status)}</TableCell>
                  <TableCell>{log.retry_count}</TableCell>
                  <TableCell className="max-w-xs truncate">
                    {log.error_message || '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedLog(log)}
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Detalhes da Chamada API</DialogTitle>
                            <DialogDescription>
                              {log.operation} - {formatDate(log.created_at)}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <h4 className="font-medium mb-2">Informações Gerais</h4>
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>Status: {getStatusBadge(log.status)}</div>
                                <div>Tentativas: {log.retry_count}</div>
                                <div>Operação: <Badge variant="outline">{log.operation}</Badge></div>
                                <div>Data: {formatDate(log.created_at)}</div>
                              </div>
                            </div>
                            
                            {log.request_data && (
                              <div>
                                <h4 className="font-medium mb-2">Dados da Requisição</h4>
                                {log.operation === 'dependentes' && log.request_data.cpfTitular && (
                                  <div className="mb-2 p-2 bg-blue-50 rounded border">
                                    <p className="text-sm font-medium text-blue-700">Dependente</p>
                                    <p className="text-xs text-blue-600">CPF Titular: {log.request_data.cpfTitular}</p>
                                    <p className="text-xs text-blue-600">Tipo: {log.request_data.idBeneficiarioTipo === 3 ? 'Dependente' : 'Não identificado'}</p>
                                  </div>
                                )}
                                <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
                                  {JSON.stringify(log.request_data, null, 2)}
                                </pre>
                              </div>
                            )}
                            
                            {log.response_data && (
                              <div>
                                <h4 className="font-medium mb-2">Resposta da API</h4>
                                <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
                                  {JSON.stringify(log.response_data, null, 2)}
                                </pre>
                              </div>
                            )}
                            
                            {log.error_message && (
                              <div>
                                <h4 className="font-medium mb-2 text-red-600">Mensagem de Erro</h4>
                                <p className="text-sm bg-red-50 p-3 rounded border border-red-200">
                                  {log.error_message}
                                </p>
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                      
                      {log.status === 'error' && log.request_data && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => retryApiCall.mutate(log.id)}
                          disabled={isRetrying}
                        >
                          <RotateCcw className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {logs.length === 0 && !isLoading && (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum log encontrado com os filtros aplicados
            </div>
          )}

          {/* Paginação */}
          {pagination.totalPages > 1 && (
            <div className="mt-6 flex justify-center">
              <Pagination>
                <PaginationContent>
                  {pagination.page > 1 && (
                    <PaginationItem>
                      <PaginationPrevious 
                        href="#" 
                        onClick={(e) => {
                          e.preventDefault()
                          handlePageChange(pagination.page - 1)
                        }}
                      />
                    </PaginationItem>
                  )}

                  {/* Primeira página */}
                  {pagination.page > 2 && (
                    <>
                      <PaginationItem>
                        <PaginationLink 
                          href="#" 
                          onClick={(e) => {
                            e.preventDefault()
                            handlePageChange(1)
                          }}
                        >
                          1
                        </PaginationLink>
                      </PaginationItem>
                      {pagination.page > 3 && <PaginationEllipsis />}
                    </>
                  )}

                  {/* Páginas ao redor da atual */}
                  {Array.from({ length: Math.min(3, pagination.totalPages) }, (_, i) => {
                    const page = Math.max(1, Math.min(pagination.totalPages - 2, pagination.page - 1)) + i
                    if (page <= pagination.totalPages) {
                      return (
                        <PaginationItem key={page}>
                          <PaginationLink 
                            href="#"
                            isActive={page === pagination.page}
                            onClick={(e) => {
                              e.preventDefault()
                              handlePageChange(page)
                            }}
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      )
                    }
                    return null
                  })}

                  {/* Última página */}
                  {pagination.page < pagination.totalPages - 1 && (
                    <>
                      {pagination.page < pagination.totalPages - 2 && <PaginationEllipsis />}
                      <PaginationItem>
                        <PaginationLink 
                          href="#"
                          onClick={(e) => {
                            e.preventDefault()
                            handlePageChange(pagination.totalPages)
                          }}
                        >
                          {pagination.totalPages}
                        </PaginationLink>
                      </PaginationItem>
                    </>
                  )}

                  {pagination.page < pagination.totalPages && (
                    <PaginationItem>
                      <PaginationNext 
                        href="#" 
                        onClick={(e) => {
                          e.preventDefault()
                          handlePageChange(pagination.page + 1)
                        }}
                      />
                    </PaginationItem>
                  )}
                </PaginationContent>
              </Pagination>
            </div>
          )}
          </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
