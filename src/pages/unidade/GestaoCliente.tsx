import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Search,
  Filter,
  MoreHorizontal,
  CheckCircle,
  AlertCircle,
  XCircle,
  Calendar,
  Phone,
  Mail,
  Eye,
  Edit,
  Trash2,
  RotateCcw,
  UserPlus
} from "lucide-react"
import { useBeneficiarios } from "@/hooks/useBeneficiarios"
import { usePlanos } from "@/hooks/usePlanos"
import { useUnidades } from "@/hooks/useUnidades"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import type { BeneficiarioCompleto } from "@/types/database"
import { DependentesForm, type DependenteFormData } from "@/components/adesao/DependentesForm"

export default function GestaoCliente() {
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("todos")
  const [selectedCliente, setSelectedCliente] = useState<BeneficiarioCompleto | null>(null)
  const [detalhesModalOpen, setDetalhesModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [dependentesModalOpen, setDependentesModalOpen] = useState(false)
  const [refreshingPaymentId, setRefreshingPaymentId] = useState<string | null>(null)
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null)
  const [dependentes, setDependentes] = useState<DependenteFormData[]>([])
  const [savingDependentes, setSavingDependentes] = useState(false)
  const [rmsSyncProgress, setRmsSyncProgress] = useState<{ current: number; total: number; currentName: string }>({ current: 0, total: 0, currentName: '' })
  const [cancellingDependente, setCancellingDependente] = useState<string | null>(null)

  // Buscar a unidade do usuário logado
  const { unidades, isLoading: unidadesLoading } = useUnidades()
  const unidadeDoUsuario = unidades?.[0] // Para usuário de unidade, sempre há apenas uma unidade

  // Filtrar beneficiários apenas da unidade do usuário
  const { beneficiarios, isLoading: beneficiariosLoading, updateBeneficiario, deleteBeneficiario } = useBeneficiarios({
    unidadeId: unidadeDoUsuario?.id
  })
  const { planos, isLoading: planosLoading } = usePlanos()
  const { toast } = useToast()

  const isLoading = beneficiariosLoading || planosLoading || unidadesLoading

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ativo':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100"><CheckCircle className="h-3 w-3 mr-1" />Ativo</Badge>
      case 'pendente':
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100"><AlertCircle className="h-3 w-3 mr-1" />Pendente</Badge>
      case 'cancelado':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100"><XCircle className="h-3 w-3 mr-1" />Cancelado</Badge>
      case 'inativo':
        return <Badge className="bg-gray-100 text-gray-800 hover:bg-gray-100"><XCircle className="h-3 w-3 mr-1" />Inativo</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getPlanoNome = (planoId: string) => {
    const plano = planos.find(p => p.id === planoId)
    return plano?.nome || 'Plano não encontrado'
  }

  const getPlanoValor = (planoId: string) => {
    const plano = planos.find(p => p.id === planoId)
    return plano?.valor || 0
  }

  const isFamiliarPlan = (beneficiario: BeneficiarioCompleto) => {
    const planoNome = getPlanoNome(beneficiario.plano_id)
    return planoNome.toLowerCase().includes('familiar')
  }

  // Action handlers
  const handleVerDetalhes = (cliente: BeneficiarioCompleto) => {
    setSelectedCliente(cliente)
    setDetalhesModalOpen(true)
  }

  const handleEditar = (cliente: BeneficiarioCompleto) => {
    setSelectedCliente(cliente)
    setEditModalOpen(true)
  }

  const handleExcluir = (cliente: BeneficiarioCompleto) => {
    setSelectedCliente(cliente)
    setDeleteModalOpen(true)
  }

  const handleAdicionarDependente = (cliente: BeneficiarioCompleto) => {
    setSelectedCliente(cliente)

    // Load existing dependents from observacoes field (temporary solution)
    let existingDependentes: DependenteFormData[] = []
    if (cliente.observacoes) {
      // Use a more flexible regex to find the JSON data
      const dependentesMatch = cliente.observacoes.match(/\[DEPENDENTES:\s*(\[.*?\])\s*\]/)
      if (dependentesMatch && dependentesMatch[1]) {
        try {
          const jsonString = dependentesMatch[1]
          console.log('Attempting to parse JSON:', jsonString)
          existingDependentes = JSON.parse(jsonString)

          // Validate that it's an array
          if (!Array.isArray(existingDependentes)) {
            existingDependentes = []
          }
        } catch (error) {
          console.error('Error parsing existing dependentes:', error)
          console.error('JSON string was:', dependentesMatch[1])
          existingDependentes = []
        }
      }
    }

    setDependentes(existingDependentes)
    setDependentesModalOpen(true)
  }

  const cancelarDependente = async (dependente: DependenteFormData, titular: BeneficiarioCompleto, index: number) => {
    if (!titular) return

    const dependenteId = `${dependente.cpf}_${dependente.nome.replace(/\s/g, '_')}`
    setCancellingDependente(dependenteId)

    try {
      // Generate external code for the dependent
      const generateDependenteCode = (titular: BeneficiarioCompleto, index: number) => {
        const unidadeName = titular.unidade?.nome || 'MATRIZ'
        const titularNumbers = titular.id.replace(/[^0-9]/g, '').slice(0, 4)
        const cleanUnitName = unidadeName
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-zA-Z0-9]/g, '')
          .toUpperCase()
          .slice(0, 6)

        return `${cleanUnitName}${titularNumbers}DEP${(index + 1).toString().padStart(2, '0')}`
      }

      const codigoExterno = generateDependenteCode(titular, index)

      // Call RMS API for cancellation
      console.log(`Cancelando dependente ${dependente.nome} na RMS...`)
      const { error: apiError } = await supabase.functions.invoke('notify-external-api', {
        body: {
          operation: 'cancelamento',
          data: {
            beneficiario_id: `${titular.id}_DEP_${index + 1}`,
            motivo: 'Cancelamento de dependente',
            data_cancelamento: new Date().toISOString().split('T')[0],
            beneficiario: {
              codigo_externo: codigoExterno,
              cpf: dependente.cpf
            }
          }
        }
      })

      if (apiError) {
        console.error('Erro na API de cancelamento:', apiError)
        throw new Error(`Erro na API: ${apiError.message}`)
      }

      // Remove dependent from local list
      const novosDependentes = dependentes.filter((_, i) => i !== index)
      setDependentes(novosDependentes)

      // Update database
      let observacoesText = titular.observacoes || ''
      observacoesText = observacoesText.replace(/\[DEPENDENTES:\s*\[.*?\]\s*\]/g, '').trim()

      if (novosDependentes.length > 0) {
        const dependentesNote = `[DEPENDENTES: ${JSON.stringify(novosDependentes)}]`
        observacoesText = observacoesText ? `${observacoesText}\n${dependentesNote}` : dependentesNote
      }

      await updateBeneficiario.mutateAsync({
        id: titular.id,
        updates: {
          observacoes: observacoesText,
          updated_at: new Date().toISOString()
        }
      })

      toast({
        title: "Dependente cancelado",
        description: `${dependente.nome} foi cancelado com sucesso na RMS`,
      })

      console.log(`✅ Dependente ${dependente.nome} cancelado com sucesso`)
    } catch (error: any) {
      console.error(`Erro ao cancelar dependente ${dependente.nome}:`, error)
      toast({
        title: "Erro ao cancelar dependente",
        description: error.message || `Falha ao cancelar ${dependente.nome}`,
        variant: "destructive",
      })
    } finally {
      setCancellingDependente(null)
    }
  }

  const handleRefreshPaymentStatus = async (cliente: BeneficiarioCompleto) => {
    if (!(cliente as any).vindi_subscription_id) {
      toast({
        title: "Erro",
        description: "Cliente não possui ID de assinatura Vindi",
        variant: "destructive",
      })
      return
    }

    setRefreshingPaymentId(cliente.id)

    try {
      const { data, error } = await supabase.functions.invoke('refresh-payment-statuses')

      if (error) {
        throw error
      }

      window.location.reload()

      toast({
        title: "Status atualizado",
        description: `Status de pagamento foi verificado e atualizado`,
      })
    } catch (error) {
      console.error('Error refreshing payment status:', error)
      toast({
        title: "Erro",
        description: "Erro ao atualizar status do pagamento",
        variant: "destructive",
      })
    } finally {
      setRefreshingPaymentId(null)
    }
  }

  const handleMarkAsPaid = async (cliente: BeneficiarioCompleto) => {
    if ((cliente as any).payment_status === 'paid') {
      toast({
        title: "Pagamento já confirmado",
        description: "Este cliente já está marcado como pago",
        variant: "destructive",
      })
      return
    }

    setMarkingPaidId(cliente.id)

    try {
      await updateBeneficiario.mutateAsync({
        id: cliente.id,
        updates: {
          payment_status: 'paid',
          updated_at: new Date().toISOString()
        }
      })

      toast({
        title: "Status atualizado",
        description: "Cliente marcado como pago manualmente",
      })
    } catch (error) {
      console.error('Error marking as paid:', error)
      toast({
        title: "Erro",
        description: "Erro ao marcar como pago",
        variant: "destructive",
      })
    } finally {
      setMarkingPaidId(null)
    }
  }

  const confirmDelete = async () => {
    if (!selectedCliente) return

    try {
      await deleteBeneficiario.mutateAsync(selectedCliente.id)
      setDeleteModalOpen(false)
      setSelectedCliente(null)
    } catch (error) {
      console.error('Error deleting cliente:', error)
    }
  }

  const sendDependenteToRMS = async (dependente: DependenteFormData, titular: BeneficiarioCompleto, index: number) => {
    // Format date for RMS (ddMMyyyy)
    const formatDateForRMS = (dateStr: string) => {
      if (!dateStr) return '01011990'
      const date = new Date(dateStr)
      const day = date.getDate().toString().padStart(2, '0')
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      const year = date.getFullYear().toString()
      return `${day}${month}${year}`
    }

    // Generate unique external code for dependent
    const generateDependenteCode = (titular: BeneficiarioCompleto, index: number) => {
      const unidadeName = titular.unidade?.nome || 'MATRIZ'
      const titularNumbers = titular.id.replace(/[^0-9]/g, '').slice(0, 4)
      const cleanUnitName = unidadeName
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 6)
      return `${cleanUnitName}${titularNumbers}DEP${index + 1}`.slice(0, 15)
    }

    const dependenteData = {
      id: `${titular.id}_DEP_${index + 1}`, // Generate a unique ID for the dependent
      nome: dependente.nome,
      cpf: dependente.cpf,
      data_nascimento: formatDateForRMS(dependente.data_nascimento),
      telefone: dependente.telefone?.replace(/\D/g, '') || '11999999999',
      email: dependente.email,
      cep: titular.cep || '01234567',
      numero_endereco: titular.numero_endereco || '123',
      estado: titular.estado || 'SP',
      plano_id: titular.plano_id,
      id_beneficiario_tipo: 3, // 3 = Dependente para RMS
      codigo_externo: generateDependenteCode(titular, index),
      cpf_titular: titular.cpf // CPF do titular (obrigatório para dependentes)
    }

    const { data, error } = await supabase.functions.invoke('notify-external-api', {
      body: {
        operation: 'adesao',
        data: dependenteData
      }
    })

    if (error) {
      throw error
    }

    if (!data?.success) {
      throw new Error(data?.error || 'Erro desconhecido ao enviar dependente para RMS')
    }

    return data
  }

  const saveDependentes = async () => {
    if (!selectedCliente) return

    setSavingDependentes(true)

    try {
      // Step 1: Save dependents locally first (using observacoes field temporarily until dependentes column is added)
      let observacoesText = selectedCliente.observacoes || ''

      // Remove existing dependentes data if present
      observacoesText = observacoesText.replace(/\[DEPENDENTES:\s*\[.*?\]\s*\]/g, '').trim()

      // Add new dependentes data if any
      if (dependentes.length > 0) {
        const dependentesNote = `[DEPENDENTES: ${JSON.stringify(dependentes)}]`
        observacoesText = observacoesText ? `${observacoesText}\n${dependentesNote}` : dependentesNote
      }

      await updateBeneficiario.mutateAsync({
        id: selectedCliente.id,
        updates: {
          observacoes: observacoesText,
          updated_at: new Date().toISOString()
        }
      })

      // Step 2: Send only NEW dependents to RMS API (only for familiar plans)
      if (isFamiliarPlan(selectedCliente) && dependentes.length > 0) {
        // Get existing dependents from database to identify which ones are new
        let existingDependentes: DependenteFormData[] = []
        if (selectedCliente.observacoes) {
          const dependentesMatch = selectedCliente.observacoes.match(/\[DEPENDENTES:\s*(\[.*?\])\s*\]/)
          if (dependentesMatch && dependentesMatch[1]) {
            try {
              existingDependentes = JSON.parse(dependentesMatch[1])
              if (!Array.isArray(existingDependentes)) {
                existingDependentes = []
              }
            } catch (error) {
              console.warn('Error parsing existing dependents:', error)
              existingDependentes = []
            }
          }
        }

        // Filter to get only new dependents (those not already in the database)
        const newDependentes = dependentes.filter(dep => {
          // Check if this dependent already exists by comparing CPF and nome
          return !existingDependentes.some(existing =>
            existing.cpf === dep.cpf && existing.nome === dep.nome
          )
        })

        console.log(`Total dependents: ${dependentes.length}, Existing: ${existingDependentes.length}, New: ${newDependentes.length}`)

        if (newDependentes.length === 0) {
          toast({
            title: "Nenhum dependente novo",
            description: "Todos os dependentes já foram enviados para o RMS anteriormente",
          })
        } else {
          let successCount = 0
          let errorCount = 0
          const errors: string[] = []

          // Initialize progress tracking for new dependents only
          setRmsSyncProgress({ current: 0, total: newDependentes.length, currentName: '' })

          for (let i = 0; i < newDependentes.length; i++) {
            const dependente = newDependentes[i]

            // Update progress
            setRmsSyncProgress({ current: i + 1, total: newDependentes.length, currentName: dependente.nome })

            try {
              // Use the total index from all dependents (existing + new) for unique external codes
              const totalIndex = existingDependentes.length + i
              await sendDependenteToRMS(dependente, selectedCliente, totalIndex)
              successCount++
              console.log(`Dependente ${dependente.nome} enviado para RMS com sucesso`)
            } catch (error) {
              errorCount++
              const errorMessage = error.message || `Erro ao enviar ${dependente.nome}`
              errors.push(`${dependente.nome}: ${errorMessage}`)
              console.error(`Erro ao enviar dependente ${dependente.nome} para RMS:`, error)
            }
          }
        }

        // Reset progress
        setRmsSyncProgress({ current: 0, total: 0, currentName: '' })

        // Show appropriate success/error message for new dependents
        if (newDependentes.length > 0) {
          if (successCount === newDependentes.length) {
            toast({
              title: "Dependentes salvos e enviados para RMS",
              description: `${newDependentes.length} novo(s) dependente(s) adicionado(s) e sincronizado(s) com sucesso`,
            })
          } else if (successCount > 0) {
            toast({
              title: "Salvamento parcial",
              description: `${successCount} de ${newDependentes.length} novo(s) dependente(s) enviado(s) para RMS. ${errorCount} falharam: ${errors.join(', ')}`,
              variant: "destructive",
            })
          } else {
            toast({
              title: "Dependentes salvos localmente",
              description: `Dependentes salvos, mas falharam ao enviar para RMS: ${errors.join(', ')}`,
              variant: "destructive",
            })
          }
        }
      } else {
        toast({
          title: "Dependentes salvos",
          description: `${dependentes.length} dependente(s) adicionado(s) com sucesso`,
        })
      }

      setDependentesModalOpen(false)
      setSelectedCliente(null)
      setDependentes([])
    } catch (error) {
      console.error('Error saving dependentes:', error)
      toast({
        title: "Erro",
        description: "Erro ao salvar dependentes",
        variant: "destructive",
      })
    } finally {
      setSavingDependentes(false)
    }
  }

  const filteredBeneficiarios = beneficiarios.filter(beneficiario => {
    const matchesSearch = beneficiario.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (beneficiario.email && beneficiario.email.toLowerCase().includes(searchTerm.toLowerCase()))
    
    if (activeTab === "todos") return matchesSearch
    return matchesSearch && beneficiario.status === activeTab
  })

  const ClienteTable = ({ clientes }: { clientes: typeof beneficiarios }) => (
    <>
      {/* Mobile Cards */}
      <div className="block sm:hidden space-y-3">
        {clientes.length > 0 ? clientes.map((beneficiario) => (
          <Card key={beneficiario.id} className="p-4">
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <div className="min-w-0 flex-1">
                  <h4 className="font-medium text-sm truncate">{beneficiario.nome}</h4>
                  <p className="text-xs text-muted-foreground">CPF: {beneficiario.cpf}</p>
                </div>
                {getStatusBadge(beneficiario.status)}
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-muted-foreground">Plano:</span>
                  <p className="font-medium truncate">{getPlanoNome(beneficiario.plano_id)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Valor:</span>
                  <p className="font-medium">R$ {beneficiario.valor_plano.toFixed(2)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Email:</span>
                  <p className="font-medium truncate">{beneficiario.email || 'Não informado'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Telefone:</span>
                  <p className="font-medium">{beneficiario.telefone || 'Não informado'}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {new Date(beneficiario.data_adesao).toLocaleDateString('pt-BR')}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 touch-manipulation">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem onClick={() => handleVerDetalhes(beneficiario)}>
                      <Eye className="h-4 w-4 mr-2" />
                      Ver Detalhes
                    </DropdownMenuItem>

                    {beneficiario.status === 'ativo' && (
                      <>
                        <DropdownMenuItem onClick={() => handleEditar(beneficiario)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>

                        {isFamiliarPlan(beneficiario) && (
                          <DropdownMenuItem
                            onClick={() => handleAdicionarDependente(beneficiario)}
                            className="text-blue-600"
                          >
                            <UserPlus className="h-4 w-4 mr-2" />
                            Adicionar Dependente
                          </DropdownMenuItem>
                        )}

                        {(beneficiario as any).vindi_subscription_id && (
                          <DropdownMenuItem
                            onClick={() => handleRefreshPaymentStatus(beneficiario)}
                            disabled={refreshingPaymentId === beneficiario.id}
                            className="text-blue-600"
                          >
                            <RotateCcw className={`h-4 w-4 mr-2 ${refreshingPaymentId === beneficiario.id ? 'animate-spin' : ''}`} />
                            Atualizar Status Pagamento
                          </DropdownMenuItem>
                        )}

                        {(beneficiario as any).payment_status !== 'paid' && (
                          <DropdownMenuItem
                            onClick={() => handleMarkAsPaid(beneficiario)}
                            disabled={markingPaidId === beneficiario.id}
                            className="text-green-600"
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Marcar como Pago
                          </DropdownMenuItem>
                        )}

                        <DropdownMenuSeparator />

                        <DropdownMenuItem
                          onClick={() => handleExcluir(beneficiario)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </Card>
        )) : (
          <div className="text-center py-8 text-sm text-muted-foreground">
            {isLoading ? 'Carregando clientes...' : 'Nenhum cliente encontrado'}
          </div>
        )}
      </div>

      {/* Desktop Table */}
      <div className="hidden sm:block border rounded-md overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">Cliente</TableHead>
                <TableHead className="whitespace-nowrap">Plano</TableHead>
                <TableHead className="whitespace-nowrap">Valor</TableHead>
                <TableHead className="whitespace-nowrap">Status</TableHead>
                <TableHead className="whitespace-nowrap">Data Adesão</TableHead>
                <TableHead className="whitespace-nowrap">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clientes.length > 0 ? clientes.map((beneficiario) => (
                <TableRow key={beneficiario.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium max-w-[200px] truncate">{beneficiario.nome}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{beneficiario.email || 'Não informado'}</span>
                      </div>
                      <div className="text-sm text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{beneficiario.telefone || 'Não informado'}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        CPF: {beneficiario.cpf}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[150px] truncate">{getPlanoNome(beneficiario.plano_id)}</TableCell>
                  <TableCell className="whitespace-nowrap">R$ {beneficiario.valor_plano.toFixed(2)}</TableCell>
                  <TableCell>{getStatusBadge(beneficiario.status)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm whitespace-nowrap">
                      <Calendar className="h-3 w-3" />
                      {new Date(beneficiario.data_adesao).toLocaleDateString('pt-BR')}
                    </div>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuItem onClick={() => handleVerDetalhes(beneficiario)}>
                          <Eye className="h-4 w-4 mr-2" />
                          Ver Detalhes
                        </DropdownMenuItem>

                        {beneficiario.status === 'ativo' && (
                          <>
                            <DropdownMenuItem onClick={() => handleEditar(beneficiario)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>

                            {isFamiliarPlan(beneficiario) && (
                              <DropdownMenuItem
                                onClick={() => handleAdicionarDependente(beneficiario)}
                                className="text-blue-600"
                              >
                                <UserPlus className="h-4 w-4 mr-2" />
                                Adicionar Dependente
                              </DropdownMenuItem>
                            )}

                            {(beneficiario as any).vindi_subscription_id && (
                              <DropdownMenuItem
                                onClick={() => handleRefreshPaymentStatus(beneficiario)}
                                disabled={refreshingPaymentId === beneficiario.id}
                                className="text-blue-600"
                              >
                                <RotateCcw className={`h-4 w-4 mr-2 ${refreshingPaymentId === beneficiario.id ? 'animate-spin' : ''}`} />
                                Atualizar Status Pagamento
                              </DropdownMenuItem>
                            )}

                            {(beneficiario as any).payment_status !== 'paid' && (
                              <DropdownMenuItem
                                onClick={() => handleMarkAsPaid(beneficiario)}
                                disabled={markingPaidId === beneficiario.id}
                                className="text-green-600"
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Marcar como Pago
                              </DropdownMenuItem>
                            )}

                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                              onClick={() => handleExcluir(beneficiario)}
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {isLoading ? 'Carregando clientes...' : 'Nenhum cliente encontrado'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  )

  const clientesAtivos = beneficiarios.filter(b => b.status === 'ativo').length
  const clientesPendentes = beneficiarios.filter(b => b.status === 'pendente').length
  const clientesCancelados = beneficiarios.filter(b => b.status === 'inativo').length

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground leading-tight">
            Gestão de Clientes
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Gerencie os clientes da sua unidade: {unidadeDoUsuario?.nome || 'Carregando...'}
          </p>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
        <Card>
          <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-2">
            <CardTitle className="text-base sm:text-lg">Planos Ativos</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="text-xl sm:text-2xl font-bold text-green-600">
              {isLoading ? '...' : clientesAtivos}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-2">
            <CardTitle className="text-base sm:text-lg">Pendentes</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="text-xl sm:text-2xl font-bold text-yellow-600">
              {isLoading ? '...' : clientesPendentes}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-4 sm:p-6 pb-3 sm:pb-2">
            <CardTitle className="text-base sm:text-lg">Cancelados</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0">
            <div className="text-xl sm:text-2xl font-bold text-red-600">
              {isLoading ? '...' : clientesCancelados}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg">Clientes</CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Visualize e gerencie todos os seus clientes
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-12 sm:h-10 text-base"
              />
            </div>
            <Button variant="outline" className="gap-2 h-12 sm:h-10 touch-manipulation">
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">Filtros</span>
              <span className="sm:hidden">Filtros</span>
            </Button>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-2 sm:grid-cols-4 h-auto">
              <TabsTrigger value="todos" className="h-10 text-xs sm:text-sm">Todos</TabsTrigger>
              <TabsTrigger value="ativo" className="h-10 text-xs sm:text-sm">Ativos</TabsTrigger>
              <TabsTrigger value="pendente" className="h-10 text-xs sm:text-sm">Pendentes</TabsTrigger>
              <TabsTrigger value="cancelado" className="h-10 text-xs sm:text-sm">Cancelados</TabsTrigger>
            </TabsList>

            <TabsContent value="todos" className="mt-4 sm:mt-6">
              <ClienteTable clientes={filteredBeneficiarios} />
            </TabsContent>

            <TabsContent value="ativo" className="mt-4 sm:mt-6">
              <ClienteTable clientes={filteredBeneficiarios} />
            </TabsContent>

            <TabsContent value="pendente" className="mt-4 sm:mt-6">
              <ClienteTable clientes={filteredBeneficiarios} />
            </TabsContent>

            <TabsContent value="cancelado" className="mt-4 sm:mt-6">
              <ClienteTable clientes={filteredBeneficiarios} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Modais */}

      {/* Modal de Detalhes */}
      <Dialog open={detalhesModalOpen} onOpenChange={setDetalhesModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Cliente</DialogTitle>
            <DialogDescription>
              Informações completas do cliente selecionado
            </DialogDescription>
          </DialogHeader>
          {selectedCliente && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Nome</label>
                  <p className="text-sm text-muted-foreground">{selectedCliente.nome}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">CPF</label>
                  <p className="text-sm text-muted-foreground">{selectedCliente.cpf}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <p className="text-sm text-muted-foreground">{selectedCliente.email || 'Não informado'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Telefone</label>
                  <p className="text-sm text-muted-foreground">{selectedCliente.telefone || 'Não informado'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Plano</label>
                  <p className="text-sm text-muted-foreground">{getPlanoNome(selectedCliente.plano_id)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Valor</label>
                  <p className="text-sm text-muted-foreground">R$ {selectedCliente.valor_plano.toFixed(2)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <div className="mt-1">{getStatusBadge(selectedCliente.status)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium">Data de Adesão</label>
                  <p className="text-sm text-muted-foreground">
                    {new Date(selectedCliente.data_adesao).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Edição */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
            <DialogDescription>
              Esta funcionalidade será implementada em breve
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação de Exclusão */}
      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o cliente <strong>{selectedCliente?.nome}</strong>?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteBeneficiario.isPending}
            >
              {deleteBeneficiario.isPending ? 'Excluindo...' : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Dependentes */}
      <Dialog open={dependentesModalOpen} onOpenChange={setDependentesModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Adicionar Dependentes</DialogTitle>
            <DialogDescription>
              Gerencie os dependentes do plano familiar para <strong>{selectedCliente?.nome}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <DependentesForm
              dependentes={dependentes}
              onDependentesChange={setDependentes}
              disabled={savingDependentes}
              onCancelarDependente={(dependente, index) => {
                if (selectedCliente) {
                  cancelarDependente(dependente, selectedCliente, index)
                }
              }}
              cancellingDependente={cancellingDependente}
              showCancelButtons={true}
            />

            {/* RMS Sync Progress */}
            {rmsSyncProgress.total > 0 && (
              <div className="mt-4 p-4 bg-blue-50 rounded-lg border">
                <div className="flex items-center gap-2 mb-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-sm font-medium text-blue-900">
                    Enviando para RMS ({rmsSyncProgress.current}/{rmsSyncProgress.total})
                  </span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(rmsSyncProgress.current / rmsSyncProgress.total) * 100}%` }}
                  ></div>
                </div>
                {rmsSyncProgress.currentName && (
                  <p className="text-xs text-blue-700">
                    Processando: {rmsSyncProgress.currentName}
                  </p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDependentesModalOpen(false)
                setDependentes([])
              }}
              disabled={savingDependentes}
            >
              Cancelar
            </Button>
            <Button
              onClick={saveDependentes}
              disabled={savingDependentes}
            >
              {rmsSyncProgress.total > 0
                ? `Enviando para RMS (${rmsSyncProgress.current}/${rmsSyncProgress.total})`
                : savingDependentes
                  ? 'Salvando...'
                  : 'Salvar Dependentes'
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}