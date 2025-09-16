import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Plus, FileText, Eye, Edit, Trash2, Search } from "lucide-react"
import { useOrcamentos } from "@/hooks/useOrcamentos"
import UnidadeGerarOrcamentoModal from "@/components/orcamentos/UnidadeGerarOrcamentoModal"
import { DetalhesOrcamentoModal } from "@/components/orcamentos/DetalhesOrcamentoModal"
import { EditarOrcamentoModal } from "@/components/orcamentos/EditarOrcamentoModal"

export default function UnidadeOrcamento() {
  const { orcamentos, isLoading, deleteOrcamento } = useOrcamentos()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("todos")
  const [isGerarModalOpen, setIsGerarModalOpen] = useState(false)
  const [detalhesModalOpen, setDetalhesModalOpen] = useState(false)
  const [editarModalOpen, setEditarModalOpen] = useState(false)
  const [selectedOrcamentoId, setSelectedOrcamentoId] = useState<string | null>(null)

  // Filtrar orçamentos baseado na busca e status
  const filteredOrcamentos = orcamentos?.filter(orcamento => {
    const matchesSearch = orcamento.cliente_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         orcamento.cliente_documento.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === "todos" || orcamento.status === statusFilter
    return matchesSearch && matchesStatus
  }) || []

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'aprovado':
        return <Badge variant="default" className="bg-success text-success-foreground">Aprovado</Badge>
      case 'rejeitado':
        return <Badge variant="destructive">Rejeitado</Badge>
      case 'pendente':
        return <Badge variant="outline" className="border-warning text-warning">Pendente</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteOrcamento.mutateAsync(id)
    } catch (error) {
      console.error('Erro ao excluir orçamento:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="flex items-center justify-center h-32 sm:h-48">
          <div className="text-sm sm:text-base text-muted-foreground">Carregando orçamentos...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground leading-tight">
            Orçamentos
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Gerencie os orçamentos da sua unidade
          </p>
        </div>
        <Button
          onClick={() => setIsGerarModalOpen(true)}
          className="h-10 sm:h-9 w-fit self-start sm:self-auto touch-manipulation"
          size="sm"
        >
          <Plus className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Novo Orçamento</span>
          <span className="sm:hidden">Novo</span>
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg">Filtros</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Filtre os orçamentos por cliente, documento ou status
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <div className="flex flex-col gap-3 sm:gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar por cliente ou documento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-12 sm:h-10 text-base"
                />
              </div>
            </div>
            <div className="w-full sm:w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-12 sm:h-10 text-base">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="aprovado">Aprovado</SelectItem>
                  <SelectItem value="rejeitado">Rejeitado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Orçamentos */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg">Lista de Orçamentos</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            {filteredOrcamentos.length} orçamento(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          {filteredOrcamentos.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <FileText className="h-12 w-12 sm:h-16 sm:w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg sm:text-xl font-medium mb-2">Nenhum orçamento encontrado</h3>
              <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6 max-w-md mx-auto">
                {searchTerm || statusFilter !== "todos" ?
                  "Tente ajustar os filtros para encontrar orçamentos." :
                  "Comece criando seu primeiro orçamento."
                }
              </p>
              {!searchTerm && statusFilter === "todos" && (
                <Button
                  onClick={() => setIsGerarModalOpen(true)}
                  className="h-10 sm:h-9 touch-manipulation"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeiro Orçamento
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Mobile Cards */}
              <div className="block sm:hidden space-y-3">
                {filteredOrcamentos.map((orcamento) => (
                  <Card key={orcamento.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="min-w-0 flex-1">
                          <h4 className="font-medium text-sm truncate">
                            {orcamento.cliente_nome}
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            {orcamento.cliente_documento}
                          </p>
                        </div>
                        {getStatusBadge(orcamento.status)}
                      </div>

                      <div className="flex justify-between items-center text-sm">
                        <span className="font-medium">
                          R$ {Number(orcamento.total).toFixed(2)}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {new Date(orcamento.created_at).toLocaleDateString('pt-BR')}
                        </span>
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 h-10 touch-manipulation"
                          onClick={() => {
                            setSelectedOrcamentoId(orcamento.id)
                            setDetalhesModalOpen(true)
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Ver
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 h-10 touch-manipulation"
                          onClick={() => {
                            setSelectedOrcamentoId(orcamento.id)
                            setEditarModalOpen(true)
                          }}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-10 w-10 p-0 touch-manipulation"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="mx-4 max-w-md">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="text-base">Confirmar exclusão</AlertDialogTitle>
                              <AlertDialogDescription className="text-sm">
                                Tem certeza que deseja excluir este orçamento? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                              <AlertDialogCancel className="h-10 touch-manipulation">Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(orcamento.id)}
                                className="h-10 bg-destructive text-destructive-foreground hover:bg-destructive/90 touch-manipulation"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>

              {/* Desktop Table */}
              <div className="hidden sm:block rounded-md border overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="whitespace-nowrap">Cliente</TableHead>
                        <TableHead className="whitespace-nowrap">Documento</TableHead>
                        <TableHead className="whitespace-nowrap">Total</TableHead>
                        <TableHead className="whitespace-nowrap">Status</TableHead>
                        <TableHead className="whitespace-nowrap">Data</TableHead>
                        <TableHead className="text-right whitespace-nowrap">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOrcamentos.map((orcamento) => (
                        <TableRow key={orcamento.id}>
                          <TableCell className="font-medium max-w-[200px] truncate">
                            {orcamento.cliente_nome}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">{orcamento.cliente_documento}</TableCell>
                          <TableCell className="whitespace-nowrap">
                            R$ {Number(orcamento.total).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(orcamento.status)}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
                            {new Date(orcamento.created_at).toLocaleDateString('pt-BR')}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => {
                                  setSelectedOrcamentoId(orcamento.id)
                                  setDetalhesModalOpen(true)
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => {
                                  setSelectedOrcamentoId(orcamento.id)
                                  setEditarModalOpen(true)
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Tem certeza que deseja excluir este orçamento? Esta ação não pode ser desfeita.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDelete(orcamento.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Excluir
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Modais */}
      <UnidadeGerarOrcamentoModal
        open={isGerarModalOpen}
        onOpenChange={setIsGerarModalOpen}
      />

      <DetalhesOrcamentoModal
        open={detalhesModalOpen}
        onOpenChange={setDetalhesModalOpen}
        orcamentoId={selectedOrcamentoId}
      />

      <EditarOrcamentoModal
        open={editarModalOpen}
        onOpenChange={setEditarModalOpen}
        orcamentoId={selectedOrcamentoId}
      />
    </div>
  )
}