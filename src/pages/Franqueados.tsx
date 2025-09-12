import { useState } from "react"
import { Plus, Search, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { FranqueadoCard } from "@/components/franqueados/FranqueadoCard"
import { FranqueadoForm } from "@/components/franqueados/FranqueadoForm"
import { useToast } from "@/hooks/use-toast"
import { useUnidades } from "@/hooks/useUnidades"
import type { Tables } from "@/integrations/supabase/types"

type Unidade = Tables<'unidades'>

export interface Franqueado {
  id: string
  nome: string
  email: string | null
  telefone: string | null
  cuf: string
  dadosBancarios?: {
    banco: string
    agencia: string
    conta: string
    tipoConta: string
  }
  chavePix?: string
  createdAt: string
  cnpj?: string | null
  endereco?: string | null
  cidade?: string | null
  estado?: string | null
  responsavel?: string | null
  status: string
}

export default function Franqueados() {
  const { unidades, isLoading, createUnidade, updateUnidade, deleteUnidade, canManageAll } = useUnidades()
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingFranqueado, setEditingFranqueado] = useState<Franqueado | null>(null)
  const { toast } = useToast()

  // Converter unidades para formato de franqueados para compatibilidade
  const franqueados: Franqueado[] = unidades.map(unidade => ({
    id: unidade.id,
    nome: unidade.nome,
    email: unidade.email,
    telefone: unidade.telefone,
    cuf: `UND-${unidade.id.slice(0, 8)}`,
    createdAt: unidade.created_at.split('T')[0],
    cnpj: unidade.cnpj,
    endereco: unidade.endereco,
    cidade: unidade.cidade,
    estado: unidade.estado,
    responsavel: unidade.responsavel,
    status: unidade.status
  }))

  const filteredFranqueados = franqueados.filter(franqueado =>
    franqueado.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    franqueado.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    franqueado.cuf.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleAddFranqueado = (novoFranqueado: Omit<Franqueado, 'id' | 'createdAt' | 'status'>) => {
    const unidadeData = {
      nome: novoFranqueado.nome,
      email: novoFranqueado.email,
      telefone: novoFranqueado.telefone,
      cnpj: novoFranqueado.cnpj,
      endereco: novoFranqueado.endereco,
      cidade: novoFranqueado.cidade,
      estado: novoFranqueado.estado,
      responsavel: novoFranqueado.responsavel,
      status: 'ativo' as const
    }
    createUnidade(unidadeData)
    setIsDialogOpen(false)
  }

  const handleEditFranqueado = (franqueadoAtualizado: Omit<Franqueado, 'id' | 'createdAt' | 'status'>) => {
    if (!editingFranqueado) return
    
    const unidadeData = {
      nome: franqueadoAtualizado.nome,
      email: franqueadoAtualizado.email,
      telefone: franqueadoAtualizado.telefone,
      cnpj: franqueadoAtualizado.cnpj,
      endereco: franqueadoAtualizado.endereco,
      cidade: franqueadoAtualizado.cidade,
      estado: franqueadoAtualizado.estado,
      responsavel: franqueadoAtualizado.responsavel
    }
    updateUnidade({ id: editingFranqueado.id, ...unidadeData })
    setEditingFranqueado(null)
    setIsDialogOpen(false)
  }

  const handleDeleteFranqueado = (id: string) => {
    deleteUnidade(id)
  }

  const openEditDialog = (franqueado: Franqueado) => {
    setEditingFranqueado(franqueado)
    setIsDialogOpen(true)
  }

  const openAddDialog = () => {
    setEditingFranqueado(null)
    setIsDialogOpen(true)
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold text-foreground">Franqueados</h1>
            <p className="text-muted-foreground">Gerencie todos os franqueados da rede</p>
          </div>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openAddDialog} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Adicionar Franqueado
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingFranqueado ? "Editar Franqueado" : "Adicionar Novo Franqueado"}
              </DialogTitle>
            </DialogHeader>
            <FranqueadoForm
              franqueado={editingFranqueado}
              onSubmit={editingFranqueado ? handleEditFranqueado : handleAddFranqueado}
              existingCufs={franqueados.filter(f => f.id !== editingFranqueado?.id).map(f => f.cuf)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, email ou CUF..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-medium text-muted-foreground">Total de Unidades</h3>
          <p className="text-2xl font-bold text-foreground">{franqueados.length}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-medium text-muted-foreground">Unidades Ativas</h3>
          <p className="text-2xl font-bold text-green-600">{franqueados.filter(f => f.status === 'ativo').length}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <h3 className="text-sm font-medium text-muted-foreground">Unidades Inativas</h3>
          <p className="text-2xl font-bold text-orange-600">{franqueados.filter(f => f.status === 'inativo').length}</p>
        </div>
      </div>

      {/* Unidades Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card border border-border rounded-lg p-4 animate-pulse">
              <div className="h-6 bg-muted rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-muted rounded w-1/2 mb-4"></div>
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded"></div>
                <div className="h-4 bg-muted rounded w-2/3"></div>
              </div>
            </div>
          ))}
        </div>
      ) : filteredFranqueados.length === 0 ? (
        <div className="text-center py-12">
          <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">Nenhuma unidade encontrada</h3>
          <p className="text-muted-foreground">
            {searchTerm ? "Tente ajustar os filtros de busca." : "Adicione a primeira unidade para começar."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFranqueados.map((franqueado) => (
            <FranqueadoCard
              key={franqueado.id}
              franqueado={franqueado}
              onEdit={canManageAll ? openEditDialog : undefined}
              onDelete={canManageAll ? handleDeleteFranqueado : undefined}
            />
          ))}
        </div>
      )}
    </div>
  )
}