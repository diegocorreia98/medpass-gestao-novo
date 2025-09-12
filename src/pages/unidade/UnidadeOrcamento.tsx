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
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-32">
          <div className="text-muted-foreground">Carregando orçamentos...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Orçamentos</h1>
          <p className="text-muted-foreground">
            Gerencie os orçamentos da sua unidade
          </p>
        </div>
        <Button onClick={() => setIsGerarModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Orçamento
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>
            Filtre os orçamentos por cliente, documento ou status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Buscar por cliente ou documento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full sm:w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
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
        <CardHeader>
          <CardTitle>Lista de Orçamentos</CardTitle>
          <CardDescription>
            {filteredOrcamentos.length} orçamento(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredOrcamentos.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum orçamento encontrado</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || statusFilter !== "todos" ? 
                  "Tente ajustar os filtros para encontrar orçamentos." : 
                  "Comece criando seu primeiro orçamento."
                }
              </p>
              {!searchTerm && statusFilter === "todos" && (
                <Button onClick={() => setIsGerarModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Primeiro Orçamento
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Documento</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrcamentos.map((orcamento) => (
                    <TableRow key={orcamento.id}>
                      <TableCell className="font-medium">
                        {orcamento.cliente_nome}
                      </TableCell>
                      <TableCell>{orcamento.cliente_documento}</TableCell>
                      <TableCell>
                        R$ {Number(orcamento.total).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(orcamento.status)}
                      </TableCell>
                      <TableCell>
                        {new Date(orcamento.created_at).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
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