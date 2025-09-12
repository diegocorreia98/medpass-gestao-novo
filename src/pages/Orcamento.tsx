import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { FileText, Plus, Search, Eye, Edit, Trash2, Filter } from "lucide-react"
import { useOrcamentos } from "@/hooks/useOrcamentos"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { DetalhesOrcamentoModal } from "@/components/orcamentos/DetalhesOrcamentoModal"
import { EditarOrcamentoModal } from "@/components/orcamentos/EditarOrcamentoModal"
import { GerarOrcamentoModal } from "@/components/orcamentos/GerarOrcamentoModal"

export default function Orcamento() {
  const { orcamentos, isLoading, deleteOrcamento } = useOrcamentos()
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("todos")
  const [detalhesModalOpen, setDetalhesModalOpen] = useState(false)
  const [editarModalOpen, setEditarModalOpen] = useState(false)
  const [gerarModalOpen, setGerarModalOpen] = useState(false)
  const [selectedOrcamentoId, setSelectedOrcamentoId] = useState<string | null>(null)

  const filteredOrcamentos = orcamentos?.filter(orcamento => {
    const matchesSearch = orcamento.cliente_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         orcamento.cliente_documento.includes(searchTerm)
    const matchesStatus = statusFilter === "todos" || orcamento.status === statusFilter
    return matchesSearch && matchesStatus
  }) || []

  const getStatusBadge = (status: string) => {
    const variants = {
      pendente: "secondary",
      aprovado: "default",
      rejeitado: "destructive",
      expirado: "outline"
    } as const

    return (
      <Badge variant={variants[status as keyof typeof variants] || "secondary"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
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
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold text-foreground">Orçamentos</h2>
            <p className="text-muted-foreground">Gerencie todos os orçamentos criados</p>
          </div>
        </div>
        <div className="flex items-center justify-center h-32">
          <div className="text-muted-foreground">Carregando orçamentos...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Orçamentos</h2>
          <p className="text-muted-foreground">Gerencie todos os orçamentos criados</p>
        </div>
        <Button onClick={() => setGerarModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Orçamento
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
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
            <div className="w-full md:w-48">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Status</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="aprovado">Aprovado</SelectItem>
                  <SelectItem value="rejeitado">Rejeitado</SelectItem>
                  <SelectItem value="expirado">Expirado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Orçamentos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Lista de Orçamentos
          </CardTitle>
          <CardDescription>
            {filteredOrcamentos.length} orçamento(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredOrcamentos.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum orçamento encontrado</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || statusFilter !== "todos" 
                  ? "Tente ajustar os filtros para encontrar orçamentos."
                  : "Comece criando seu primeiro orçamento."
                }
              </p>
              <Button onClick={() => setGerarModalOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Orçamento
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
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
                        <span className="font-semibold text-primary">
                          R$ {Number(orcamento.total).toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(orcamento.status)}
                      </TableCell>
                      <TableCell>
                        {format(new Date(orcamento.created_at), "dd/MM/yyyy", {
                          locale: ptBR
                        })}
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
                              <Button variant="outline" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir o orçamento de <strong>{orcamento.cliente_nome}</strong>?
                                  Esta ação não pode ser desfeita.
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

      {/* Modals */}
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

      <GerarOrcamentoModal
        open={gerarModalOpen}
        onOpenChange={setGerarModalOpen}
      />
    </div>
  )
}