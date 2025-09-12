import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Plus, Search, Building2, Users, CheckCircle, XCircle } from "lucide-react"
import { MultiStepForm } from "@/components/unidades/MultiStepForm"
import { UnidadeStep, type UnidadeFormData } from "@/components/unidades/UnidadeStep"
import { ResponsavelStep, type ResponsavelFormData } from "@/components/unidades/ResponsavelStep"
import { ConfirmacaoStep } from "@/components/unidades/ConfirmacaoStep"
import { UnidadesDataTable } from "@/components/unidades/UnidadesDataTable"
import { useUnidades } from "@/hooks/useUnidades"
import { useFranquias } from "@/hooks/useFranquias"
import { useConvites } from "@/hooks/useConvites"
import { toast } from "sonner"
import type { Unidade } from "@/types/database"

export default function GestaoUnidades() {
  const { unidades, isLoading, createUnidade, updateUnidade, deleteUnidade, canManageAll } = useUnidades()
  const { franquias } = useFranquias()
  const { convites, resendInvite, isResending, markInviteAccepted, isMarkingAccepted } = useConvites()
  
  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingUnidade, setEditingUnidade] = useState<Unidade | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Multi-step form state
  const [unidadeData, setUnidadeData] = useState<UnidadeFormData>({
    nome: "",
    cnpj: "",
    endereco: "",
    cidade: "",
    estado: "",
    telefone: "",
    franquia_id: "",
    observacoes: ""
  })

  const [responsavelData, setResponsavelData] = useState<ResponsavelFormData>({
    nome: "",
    email: "",
    telefone: "",
    cuf: "",
    banco: "",
    agencia: "",
    conta: "",
    tipoConta: "",
    chavePix: ""
  })

  const [stepValidations, setStepValidations] = useState<boolean[]>([false, false])

  const filteredUnidades = unidades?.filter(unidade =>
    unidade.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    unidade.responsavel?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    unidade.cidade?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  // Get existing CUFs for validation
  const existingCufs = unidades?.map(u => u.user_id).filter(Boolean) || []

  // Statistics
  const totalUnidades = unidades?.length || 0
  const unidadesAtivas = convites?.filter(c => c.aceito).length || 0
  const convitesPendentes = convites?.filter(c => !c.aceito && new Date(c.expires_at) > new Date()).length || 0
  const convitesExpirados = convites?.filter(c => !c.aceito && new Date(c.expires_at) <= new Date()).length || 0

  const handleStepValidation = (stepIndex: number, isValid: boolean) => {
    setStepValidations(prev => {
      const newValidations = [...prev]
      newValidations[stepIndex] = isValid
      return newValidations
    })
  }

  const handleCreateUnidade = async () => {
    setIsSubmitting(true)
    try {
      createUnidade({
        nome: unidadeData.nome,
        cnpj: unidadeData.cnpj || null,
        endereco: unidadeData.endereco || null,
        cidade: unidadeData.cidade || null,
        estado: unidadeData.estado || null,
        telefone: unidadeData.telefone || null,
        franquia_id: unidadeData.franquia_id || null,
        responsavel: responsavelData.nome,
        email: responsavelData.email,
        status: 'ativo'
      }, {
        onSuccess: () => {
          toast.success("Unidade criada e convite enviado com sucesso!")
          handleCloseDialog()
          setIsSubmitting(false)
        },
        onError: (error) => {
          console.error('Error creating unidade:', error)
          toast.error("Erro ao criar unidade")
          setIsSubmitting(false)
        }
      })
    } catch (error) {
      console.error('Error creating unidade:', error)
      toast.error("Erro ao criar unidade")
      setIsSubmitting(false)
    }
  }

  const handleUpdateUnidade = async () => {
    if (!editingUnidade) return
    
    setIsSubmitting(true)
    try {
      updateUnidade({
        id: editingUnidade.id,
        nome: unidadeData.nome,
        cnpj: unidadeData.cnpj || null,
        endereco: unidadeData.endereco || null,
        cidade: unidadeData.cidade || null,
        estado: unidadeData.estado || null,
        telefone: unidadeData.telefone || null,
        franquia_id: unidadeData.franquia_id || null,
        responsavel: responsavelData.nome,
        email: responsavelData.email
      }, {
        onSuccess: () => {
          toast.success("Unidade atualizada com sucesso!")
          handleCloseDialog()
          setIsSubmitting(false)
        },
        onError: (error) => {
          console.error('Error updating unidade:', error)
          toast.error("Erro ao atualizar unidade")
          setIsSubmitting(false)
        }
      })
    } catch (error) {
      console.error('Error updating unidade:', error)
      toast.error("Erro ao atualizar unidade")
      setIsSubmitting(false)
    }
  }

  const handleDeleteUnidade = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja excluir esta unidade?")) return
    
    try {
      deleteUnidade(id, {
        onSuccess: () => {
          toast.success("Unidade excluída com sucesso!")
        },
        onError: (error) => {
          console.error('Error deleting unidade:', error)
          toast.error("Erro ao excluir unidade")
        }
      })
    } catch (error) {
      console.error('Error deleting unidade:', error)
      toast.error("Erro ao excluir unidade")
    }
  }

  const handleEditUnidade = (unidade: Unidade) => {
    setEditingUnidade(unidade)
    setUnidadeData({
      nome: unidade.nome,
      cnpj: unidade.cnpj || "",
      endereco: unidade.endereco || "",
      cidade: unidade.cidade || "",
      estado: unidade.estado || "",
      telefone: unidade.telefone || "",
      franquia_id: unidade.franquia_id || "",
      observacoes: ""
    })
    setResponsavelData({
      nome: unidade.responsavel || "",
      email: unidade.email || "",
      telefone: unidade.telefone || "",
      cuf: "",
      banco: "",
      agencia: "",
      conta: "",
      tipoConta: "",
      chavePix: ""
    })
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setEditingUnidade(null)
    setUnidadeData({
      nome: "",
      cnpj: "",
      endereco: "",
      cidade: "",
      estado: "",
      telefone: "",
      franquia_id: "",
      observacoes: ""
    })
    setResponsavelData({
      nome: "",
      email: "",
      telefone: "",
      cuf: "",
      banco: "",
      agencia: "",
      conta: "",
      tipoConta: "",
      chavePix: ""
    })
    setStepValidations([false, false])
  }

  const openCreateDialog = () => {
    setEditingUnidade(null)
    setIsDialogOpen(true)
  }

  const getFranquiaNome = (franquiaId: string | null) => {
    if (!franquiaId) return undefined
    return franquias?.find(f => f.id === franquiaId)?.nome
  }

  const handleResendInvite = (unidadeId: string, email: string, nome: string) => {
    resendInvite({ unidadeId, email, nome })
  }

  const handleMarkInviteAccepted = (unidadeId: string) => {
    markInviteAccepted({ unidadeId })
  }

  const steps = [
    {
      title: "Informações da Unidade",
      description: "Dados básicos e localização da unidade",
      content: (
        <UnidadeStep
          data={unidadeData}
          onChange={setUnidadeData}
          onValidationChange={(isValid) => handleStepValidation(0, isValid)}
        />
      ),
      isValid: stepValidations[0]
    },
    {
      title: "Dados do Responsável",
      description: "Informações pessoais e bancárias do responsável",
      content: (
        <ResponsavelStep
          data={responsavelData}
          onChange={setResponsavelData}
          onValidationChange={(isValid) => handleStepValidation(1, isValid)}
          existingCufs={existingCufs}
        />
      ),
      isValid: stepValidations[1]
    },
    {
      title: "Confirmação",
      description: "Revisar informações antes de finalizar",
      content: (
        <ConfirmacaoStep
          unidadeData={unidadeData}
          responsavelData={responsavelData}
          franquiaNome={getFranquiaNome(unidadeData.franquia_id)}
        />
      ),
      isValid: true
    }
  ]

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="grid auto-fit-cards gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gestão de Unidades</h1>
          <p className="text-muted-foreground">
            Gerencie unidades e seus responsáveis em um só lugar
          </p>
        </div>
        {canManageAll && (
          <Button onClick={openCreateDialog} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Nova Unidade
          </Button>
        )}
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Unidades</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUnidades}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unidades Ativas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{unidadesAtivas}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Convites Pendentes</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{convitesPendentes}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Convites Expirados</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{convitesExpirados}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Buscar por nome da unidade, responsável ou cidade..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Unidades Data Table */}
      <UnidadesDataTable
        unidades={filteredUnidades}
        convites={convites}
        franquias={franquias}
        onEdit={handleEditUnidade}
        onDelete={handleDeleteUnidade}
        onResendInvite={handleResendInvite}
        onMarkInviteAccepted={handleMarkInviteAccepted}
        isResending={isResending}
        isMarkingAccepted={isMarkingAccepted}
        canManage={canManageAll}
      />

      {/* Multi-step Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingUnidade ? "Editar Unidade" : "Nova Unidade"}
            </DialogTitle>
          </DialogHeader>
          
          <MultiStepForm
            steps={steps}
            onComplete={editingUnidade ? handleUpdateUnidade : handleCreateUnidade}
            onCancel={handleCloseDialog}
            isSubmitting={isSubmitting}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}