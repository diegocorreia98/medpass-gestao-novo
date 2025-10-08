import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Building2, Users, CreditCard, FileText, Plus, Pencil, Trash2, Search, Eye } from "lucide-react"

import { useToast } from "@/hooks/use-toast"
import { useUnidades } from "@/hooks/useUnidades"
import { useBeneficiarios } from "@/hooks/useBeneficiarios"
import { useComissoes } from "@/hooks/useComissoes"
import { useFranquias } from "@/hooks/useFranquias"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/contexts/AuthContext"
import { AdminComissoesTab } from "@/components/admin/AdminComissoesTab"

export default function Admin() {
  const { toast } = useToast()
  const { user } = useAuth()
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("empresas")
  
  // Estados para modais
  const [isUnidadeDialogOpen, setIsUnidadeDialogOpen] = useState(false)
  const [isBeneficiarioDialogOpen, setIsBeneficiarioDialogOpen] = useState(false)
  const [isOrcamentoDialogOpen, setIsOrcamentoDialogOpen] = useState(false)
  const [isUnidadeDetailsOpen, setIsUnidadeDetailsOpen] = useState(false)
  const [isBeneficiarioDetailsOpen, setIsBeneficiarioDetailsOpen] = useState(false)
  const [selectedUnidade, setSelectedUnidade] = useState<any>(null)
  const [selectedBeneficiario, setSelectedBeneficiario] = useState<any>(null)
  const [selectedOrcamento, setSelectedOrcamento] = useState<any>(null)
  const [unidadeDetails, setUnidadeDetails] = useState<any>(null)
  const [beneficiarioDetails, setBeneficiarioDetails] = useState<any>(null)
  
  // Estados para formulários
  const [unidadeForm, setUnidadeForm] = useState({
    nome: "",
    cnpj: "",
    email: "",
    telefone: "",
    cidade: "",
    endereco: "",
    estado: "",
    responsavel: "",
    franquia_id: "none" as string,
    status: "ativo" as "ativo" | "inativo" | "pendente"
  })

  const [beneficiarioForm, setBeneficiarioForm] = useState({
    nome: "",
    cpf: "",
    email: "",
    telefone: "",
    data_nascimento: "",
    endereco: "",
    cidade: "",
    estado: "",
    cep: "",
    plano_id: "",
    unidade_id: "",
    valor_plano: 0,
    status: "ativo" as "ativo" | "inativo" | "pendente"
  })

  // Hooks para dados
  const { 
    unidades, 
    isLoading: loadingUnidades,
    refetch: refetchUnidades 
  } = useUnidades()

  const { 
    beneficiarios, 
    isLoading: loadingBeneficiarios,
    refetch: refetchBeneficiarios 
  } = useBeneficiarios()

  const { 
    comissoes, 
    isLoading: loadingComissoes 
  } = useComissoes()

  const {
    franquias,
    isLoading: loadingFranquias
  } = useFranquias()

  const resetUnidadeForm = () => {
    setUnidadeForm({
      nome: "",
      cnpj: "",
      email: "",
      telefone: "",
      cidade: "",
      endereco: "",
      estado: "",
      responsavel: "",
      franquia_id: "none",
      status: "ativo"
    })
  }

  const resetBeneficiarioForm = () => {
    setBeneficiarioForm({
      nome: "",
      cpf: "",
      email: "",
      telefone: "",
      data_nascimento: "",
      endereco: "",
      cidade: "",
      estado: "",
      cep: "",
      plano_id: "",
      unidade_id: "",
      valor_plano: 0,
      status: "ativo"
    })
  }

  const handleCreateUnidade = async () => {
    try {
      const { error } = await supabase
        .from('unidades')
        .insert([{
          ...unidadeForm,
          franquia_id: unidadeForm.franquia_id === "none" ? null : unidadeForm.franquia_id,
          user_id: user?.id
        }])

      if (error) throw error

      toast({
        title: "Sucesso!",
        description: "Unidade criada com sucesso."
      })

      setIsUnidadeDialogOpen(false)
      resetUnidadeForm()
      refetchUnidades()
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      })
    }
  }

  const handleCreateBeneficiario = async () => {
    try {
      const { error } = await supabase
        .from('beneficiarios')
        .insert([{
          ...beneficiarioForm,
          data_adesao: new Date().toISOString(),
          user_id: user?.id
        }])

      if (error) throw error

      toast({
        title: "Sucesso!",
        description: "Beneficiário criado com sucesso."
      })

      setIsBeneficiarioDialogOpen(false)
      resetBeneficiarioForm()
      refetchBeneficiarios()
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      })
    }
  }

  const handleEditUnidade = (unidade: any) => {
    setSelectedUnidade(unidade)
    setUnidadeForm({
      ...unidade,
      franquia_id: unidade.franquia_id || "none"
    })
    setIsUnidadeDialogOpen(true)
  }

  const handleEditBeneficiario = (beneficiario: any) => {
    setSelectedBeneficiario(beneficiario)
    setBeneficiarioForm(beneficiario)
    setIsBeneficiarioDialogOpen(true)
  }

  const handleUpdateUnidade = async () => {
    try {
      // Exclude 'franquia' from update payload since it's a joined field, not a real column
      const { franquia, ...updateData } = unidadeForm as any
      const { error } = await supabase
        .from('unidades')
        .update({
          ...updateData,
          franquia_id: unidadeForm.franquia_id === "none" ? null : unidadeForm.franquia_id
        })
        .eq('id', selectedUnidade.id)

      if (error) throw error

      toast({
        title: "Sucesso!",
        description: "Unidade atualizada com sucesso."
      })

      setIsUnidadeDialogOpen(false)
      setSelectedUnidade(null)
      resetUnidadeForm()
      refetchUnidades()
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      })
    }
  }

  const handleUpdateBeneficiario = async () => {
    try {
      const { error } = await supabase
        .from('beneficiarios')
        .update(beneficiarioForm)
        .eq('id', selectedBeneficiario.id)

      if (error) throw error

      toast({
        title: "Sucesso!",
        description: "Beneficiário atualizado com sucesso."
      })

      setIsBeneficiarioDialogOpen(false)
      setSelectedBeneficiario(null)
      resetBeneficiarioForm()
      refetchBeneficiarios()
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      })
    }
  }

  const handleDeleteUnidade = async (id: string) => {
    try {
      const { error } = await supabase
        .from('unidades')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast({
        title: "Sucesso!",
        description: "Unidade excluída com sucesso."
      })

      refetchUnidades()
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      })
    }
  }

  const handleDeleteBeneficiario = async (id: string) => {
    try {
      const { error } = await supabase
        .from('beneficiarios')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast({
        title: "Sucesso!",
        description: "Beneficiário excluído com sucesso."
      })

      refetchBeneficiarios()
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      })
    }
  }

  const openUnidadeDetails = (unidade: any) => {
    setUnidadeDetails(unidade)
    setIsUnidadeDetailsOpen(true)
  }

  const openBeneficiarioDetails = (beneficiario: any) => {
    setBeneficiarioDetails(beneficiario)
    setIsBeneficiarioDetailsOpen(true)
  }

  const openEditBeneficiario = (beneficiario: any) => {
    handleEditBeneficiario(beneficiario)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ativo':
        return <Badge variant="default" className="bg-green-500">Ativo</Badge>
      case 'inativo':
        return <Badge variant="destructive">Inativo</Badge>
      case 'pendente':
        return <Badge variant="secondary">Pendente</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const filteredUnidades = unidades?.filter(unidade =>
    unidade.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    unidade.cnpj.toLowerCase().includes(searchTerm.toLowerCase()) ||
    unidade.cidade.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  const filteredBeneficiarios = beneficiarios?.filter(beneficiario =>
    beneficiario.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    beneficiario.cpf.toLowerCase().includes(searchTerm.toLowerCase()) ||
    beneficiario.email?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || []

  if (loadingUnidades || loadingBeneficiarios) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Carregando...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Administração</h1>
          <p className="text-muted-foreground">Gerencie unidades, beneficiários e dados do sistema</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="empresas" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Unidades
          </TabsTrigger>
          <TabsTrigger value="beneficiarios" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Beneficiários
          </TabsTrigger>
          <TabsTrigger value="comissoes" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Comissões
          </TabsTrigger>
          <TabsTrigger value="orcamentos" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Orçamentos
          </TabsTrigger>
        </TabsList>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <TabsContent value="empresas" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Unidades</h2>
            <Dialog open={isUnidadeDialogOpen} onOpenChange={setIsUnidadeDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setSelectedUnidade(null)
                  resetUnidadeForm()
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Unidade
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>
                    {selectedUnidade ? 'Editar Unidade' : 'Nova Unidade'}
                  </DialogTitle>
                  <DialogDescription>
                    {selectedUnidade ? 'Edite as informações da unidade' : 'Adicione uma nova unidade ao sistema'}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nome">Nome</Label>
                      <Input
                        id="nome"
                        value={unidadeForm.nome}
                        onChange={(e) => setUnidadeForm({...unidadeForm, nome: e.target.value})}
                        placeholder="Nome da unidade"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cnpj">CNPJ</Label>
                      <Input
                        id="cnpj"
                        value={unidadeForm.cnpj}
                        onChange={(e) => setUnidadeForm({...unidadeForm, cnpj: e.target.value})}
                        placeholder="CNPJ"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">E-mail</Label>
                      <Input
                        id="email"
                        type="email"
                        value={unidadeForm.email}
                        onChange={(e) => setUnidadeForm({...unidadeForm, email: e.target.value})}
                        placeholder="E-mail"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="telefone">Telefone</Label>
                      <Input
                        id="telefone"
                        value={unidadeForm.telefone}
                        onChange={(e) => setUnidadeForm({...unidadeForm, telefone: e.target.value})}
                        placeholder="Telefone"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endereco">Endereço</Label>
                    <Input
                      id="endereco"
                      value={unidadeForm.endereco}
                      onChange={(e) => setUnidadeForm({...unidadeForm, endereco: e.target.value})}
                      placeholder="Endereço completo"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cidade">Cidade</Label>
                      <Input
                        id="cidade"
                        value={unidadeForm.cidade}
                        onChange={(e) => setUnidadeForm({...unidadeForm, cidade: e.target.value})}
                        placeholder="Cidade"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="estado">Estado</Label>
                      <Input
                        id="estado"
                        value={unidadeForm.estado}
                        onChange={(e) => setUnidadeForm({...unidadeForm, estado: e.target.value})}
                        placeholder="Estado"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                      <Select value={unidadeForm.status} onValueChange={(value: any) => setUnidadeForm({...unidadeForm, status: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ativo">Ativo</SelectItem>
                          <SelectItem value="inativo">Inativo</SelectItem>
                          <SelectItem value="pendente">Pendente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="responsavel">Responsável</Label>
                      <Input
                        id="responsavel"
                        value={unidadeForm.responsavel}
                        onChange={(e) => setUnidadeForm({...unidadeForm, responsavel: e.target.value})}
                        placeholder="Nome do responsável"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="franquia">Franquia</Label>
                      <Select
                        value={unidadeForm.franquia_id}
                        onValueChange={(value) => setUnidadeForm({...unidadeForm, franquia_id: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma franquia" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhuma franquia</SelectItem>
                          {franquias.map((franquia) => (
                            <SelectItem key={franquia.id} value={franquia.id}>
                              {franquia.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsUnidadeDialogOpen(false)
                      setSelectedUnidade(null)
                      resetUnidadeForm()
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    onClick={selectedUnidade ? handleUpdateUnidade : handleCreateUnidade}
                  >
                    {selectedUnidade ? 'Atualizar' : 'Criar'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Lista de Unidades</CardTitle>
              <CardDescription>Gerencie todas as unidades franqueadas</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>Cidade</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUnidades.map((unidade) => (
                    <TableRow key={unidade.id}>
                      <TableCell className="font-medium">{unidade.nome}</TableCell>
                      <TableCell>{unidade.cnpj}</TableCell>
                      <TableCell>{unidade.cidade}</TableCell>
                      <TableCell>{unidade.responsavel}</TableCell>
                      <TableCell>{getStatusBadge(unidade.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openUnidadeDetails(unidade)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditUnidade(unidade)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir esta unidade? Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteUnidade(unidade.id)}>
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="beneficiarios" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Beneficiários</h2>
            <Dialog open={isBeneficiarioDialogOpen} onOpenChange={setIsBeneficiarioDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setSelectedBeneficiario(null)
                  resetBeneficiarioForm()
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Beneficiário
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>
                    {selectedBeneficiario ? 'Editar Beneficiário' : 'Novo Beneficiário'}
                  </DialogTitle>
                  <DialogDescription>
                    {selectedBeneficiario ? 'Edite as informações do beneficiário' : 'Adicione um novo beneficiário ao sistema'}
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4 max-h-96 overflow-y-auto">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nome-beneficiario">Nome</Label>
                      <Input
                        id="nome-beneficiario"
                        value={beneficiarioForm.nome}
                        onChange={(e) => setBeneficiarioForm({...beneficiarioForm, nome: e.target.value})}
                        placeholder="Nome completo"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cpf">CPF</Label>
                      <Input
                        id="cpf"
                        value={beneficiarioForm.cpf}
                        onChange={(e) => setBeneficiarioForm({...beneficiarioForm, cpf: e.target.value})}
                        placeholder="CPF"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email-beneficiario">E-mail</Label>
                      <Input
                        id="email-beneficiario"
                        type="email"
                        value={beneficiarioForm.email}
                        onChange={(e) => setBeneficiarioForm({...beneficiarioForm, email: e.target.value})}
                        placeholder="E-mail"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="telefone-beneficiario">Telefone</Label>
                      <Input
                        id="telefone-beneficiario"
                        value={beneficiarioForm.telefone}
                        onChange={(e) => setBeneficiarioForm({...beneficiarioForm, telefone: e.target.value})}
                        placeholder="Telefone"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="data-nascimento">Data de Nascimento</Label>
                      <Input
                        id="data-nascimento"
                        type="date"
                        value={beneficiarioForm.data_nascimento}
                        onChange={(e) => setBeneficiarioForm({...beneficiarioForm, data_nascimento: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="valor-plano">Valor do Plano</Label>
                      <Input
                        id="valor-plano"
                        type="number"
                        value={beneficiarioForm.valor_plano}
                        onChange={(e) => setBeneficiarioForm({...beneficiarioForm, valor_plano: parseFloat(e.target.value)})}
                        placeholder="Valor do plano"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endereco-beneficiario">Endereço</Label>
                    <Input
                      id="endereco-beneficiario"
                      value={beneficiarioForm.endereco}
                      onChange={(e) => setBeneficiarioForm({...beneficiarioForm, endereco: e.target.value})}
                      placeholder="Endereço completo"
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="cidade-beneficiario">Cidade</Label>
                      <Input
                        id="cidade-beneficiario"
                        value={beneficiarioForm.cidade}
                        onChange={(e) => setBeneficiarioForm({...beneficiarioForm, cidade: e.target.value})}
                        placeholder="Cidade"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="estado-beneficiario">Estado</Label>
                      <Input
                        id="estado-beneficiario"
                        value={beneficiarioForm.estado}
                        onChange={(e) => setBeneficiarioForm({...beneficiarioForm, estado: e.target.value})}
                        placeholder="Estado"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cep">CEP</Label>
                      <Input
                        id="cep"
                        value={beneficiarioForm.cep}
                        onChange={(e) => setBeneficiarioForm({...beneficiarioForm, cep: e.target.value})}
                        placeholder="CEP"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="unidade">Unidade</Label>
                      <Select value={beneficiarioForm.unidade_id} onValueChange={(value) => setBeneficiarioForm({...beneficiarioForm, unidade_id: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma unidade" />
                        </SelectTrigger>
                        <SelectContent>
                          {unidades?.map((unidade) => (
                            <SelectItem key={unidade.id} value={unidade.id}>
                              {unidade.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="status-beneficiario">Status</Label>
                      <Select value={beneficiarioForm.status} onValueChange={(value: any) => setBeneficiarioForm({...beneficiarioForm, status: value})}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ativo">Ativo</SelectItem>
                          <SelectItem value="inativo">Inativo</SelectItem>
                          <SelectItem value="pendente">Pendente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsBeneficiarioDialogOpen(false)
                      setSelectedBeneficiario(null)
                      resetBeneficiarioForm()
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    onClick={selectedBeneficiario ? handleUpdateBeneficiario : handleCreateBeneficiario}
                  >
                    {selectedBeneficiario ? 'Atualizar' : 'Criar'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Lista de Beneficiários</CardTitle>
              <CardDescription>Gerencie todos os beneficiários do sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>CPF</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Valor Plano</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBeneficiarios.map((beneficiario) => (
                    <TableRow key={beneficiario.id}>
                      <TableCell className="font-medium">{beneficiario.nome}</TableCell>
                      <TableCell>{beneficiario.cpf}</TableCell>
                      <TableCell>{beneficiario.email}</TableCell>
                      <TableCell>R$ {beneficiario.valor_plano.toFixed(2)}</TableCell>
                      <TableCell>{getStatusBadge(beneficiario.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openBeneficiarioDetails(beneficiario)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditBeneficiario(beneficiario)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja excluir este beneficiário? Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteBeneficiario(beneficiario.id)}>
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comissoes" className="space-y-4">
          <AdminComissoesTab />
        </TabsContent>

        <TabsContent value="orcamentos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Orçamentos</CardTitle>
              <CardDescription>Em desenvolvimento...</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Esta funcionalidade estará disponível em breve.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal de Detalhes da Unidade */}
      <Dialog open={isUnidadeDetailsOpen} onOpenChange={setIsUnidadeDetailsOpen}>
        <DialogContent className="sm:max-w-[1200px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Unidade</DialogTitle>
            <DialogDescription>
              Informações completas da unidade e suas adesões
            </DialogDescription>
          </DialogHeader>
          {unidadeDetails && (
            <div className="space-y-6">
              {/* Cards Estatísticos */}
              <div className="grid grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Vendas</CardTitle>
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {beneficiarios?.filter(b => b.unidade_id === unidadeDetails.id).length || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      R$ {beneficiarios
                        ?.filter(b => b.unidade_id === unidadeDetails.id)
                        .reduce((total, b) => total + b.valor_plano, 0)
                        .toFixed(2) || '0.00'}
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Comissões</CardTitle>
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      R$ {comissoes
                        ?.filter(c => c.unidade_id === unidadeDetails.id)
                        .reduce((total, c) => total + c.valor_comissao, 0)
                        .toFixed(2) || '0.00'}
                    </div>
                    <p className="text-xs text-muted-foreground">Total em comissões</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Vendas este mês</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {beneficiarios?.filter(b => 
                        b.unidade_id === unidadeDetails.id && 
                        new Date(b.data_adesao).getMonth() === new Date().getMonth()
                      ).length || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">Novas adesões</p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Taxa Conversão</CardTitle>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {beneficiarios?.filter(b => b.unidade_id === unidadeDetails.id).length > 0
                        ? ((beneficiarios.filter(b => b.unidade_id === unidadeDetails.id && b.status === 'ativo').length / 
                           beneficiarios.filter(b => b.unidade_id === unidadeDetails.id).length) * 100).toFixed(1)
                        : '0.0'}%
                    </div>
                    <p className="text-xs text-muted-foreground">Conversão de vendas</p>
                  </CardContent>
                </Card>
              </div>

              {/* Detalhes da Unidade e Beneficiários lado a lado */}
              <div className="grid grid-cols-2 gap-6">
                {/* Detalhes da Unidade */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Informações da Unidade</h3>
                  <div className="grid gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="font-semibold">Nome</Label>
                        <p className="text-sm text-muted-foreground">{unidadeDetails.nome}</p>
                      </div>
                      <div className="space-y-2">
                        <Label className="font-semibold">CNPJ</Label>
                        <p className="text-sm text-muted-foreground">{unidadeDetails.cnpj}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="font-semibold">E-mail</Label>
                        <p className="text-sm text-muted-foreground">{unidadeDetails.email}</p>
                      </div>
                      <div className="space-y-2">
                        <Label className="font-semibold">Telefone</Label>
                        <p className="text-sm text-muted-foreground">{unidadeDetails.telefone}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="font-semibold">Cidade</Label>
                        <p className="text-sm text-muted-foreground">{unidadeDetails.cidade}</p>
                      </div>
                      <div className="space-y-2">
                        <Label className="font-semibold">Estado</Label>
                        <p className="text-sm text-muted-foreground">{unidadeDetails.estado}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="font-semibold">Endereço</Label>
                      <p className="text-sm text-muted-foreground">{unidadeDetails.endereco}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="font-semibold">Responsável</Label>
                        <p className="text-sm text-muted-foreground">{unidadeDetails.responsavel}</p>
                      </div>
                      <div className="space-y-2">
                        <Label className="font-semibold">Status</Label>
                        <div>{getStatusBadge(unidadeDetails.status)}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Lista de Beneficiários */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Adesões Relacionadas</h3>
                  <div className="max-h-96 overflow-y-auto space-y-2">
                    {beneficiarios?.filter(b => b.unidade_id === unidadeDetails.id).length > 0 ? (
                      beneficiarios
                        .filter(b => b.unidade_id === unidadeDetails.id)
                        .map((beneficiario) => (
                          <div 
                            key={beneficiario.id} 
                            className="p-3 border rounded-lg space-y-2 bg-card"
                          >
                            <div className="flex justify-between items-start">
                              <div className="space-y-1">
                                <div className="font-medium text-sm">{beneficiario.nome}</div>
                                <div className="text-xs text-muted-foreground">CPF: {beneficiario.cpf}</div>
                                <div className="flex items-center gap-2">
                                  {getStatusBadge(beneficiario.status)}
                                </div>
                              </div>
                            </div>
                            <div className="text-xs space-y-0.5">
                              <div>
                                <span className="font-medium">Valor:</span> R$ {beneficiario.valor_plano.toFixed(2)}
                              </div>
                              <div>
                                <span className="font-medium">Adesão:</span> {new Date(beneficiario.data_adesao).toLocaleDateString('pt-BR')}
                              </div>
                            </div>
                            {beneficiario.email && (
                              <div className="text-sm mt-1">
                                <span className="font-medium">E-mail:</span> {beneficiario.email}
                              </div>
                            )}
                            {beneficiario.telefone && (
                              <div className="text-sm">
                                <span className="font-medium">Telefone:</span> {beneficiario.telefone}
                              </div>
                            )}
                            <div className="flex gap-1 mt-2">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => openBeneficiarioDetails(beneficiario)}
                                className="text-xs"
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                Detalhes
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => openEditBeneficiario(beneficiario)}
                                className="text-xs"
                              >
                                <Pencil className="h-3 w-3 mr-1" />
                                Editar
                              </Button>
                            </div>
                          </div>
                        ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhuma adesão encontrada para esta unidade.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUnidadeDetailsOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Detalhes do Beneficiário */}
      <Dialog open={isBeneficiarioDetailsOpen} onOpenChange={setIsBeneficiarioDetailsOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Detalhes do Beneficiário</DialogTitle>
            <DialogDescription>
              Informações completas do beneficiário selecionado
            </DialogDescription>
          </DialogHeader>
          {beneficiarioDetails && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-semibold">Nome</Label>
                  <p className="text-sm text-muted-foreground">{beneficiarioDetails.nome}</p>
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold">CPF</Label>
                  <p className="text-sm text-muted-foreground">{beneficiarioDetails.cpf}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-semibold">E-mail</Label>
                  <p className="text-sm text-muted-foreground">{beneficiarioDetails.email || 'Não informado'}</p>
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold">Telefone</Label>
                  <p className="text-sm text-muted-foreground">{beneficiarioDetails.telefone || 'Não informado'}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="font-semibold">Data de Nascimento</Label>
                  <p className="text-sm text-muted-foreground">
                    {beneficiarioDetails.data_nascimento ? 
                      new Date(beneficiarioDetails.data_nascimento).toLocaleDateString('pt-BR') : 
                      'Não informado'
                    }
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold">Valor do Plano</Label>
                  <p className="text-sm text-muted-foreground">R$ {beneficiarioDetails.valor_plano.toFixed(2)}</p>
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold">Status</Label>
                  <div>{getStatusBadge(beneficiarioDetails.status)}</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label className="font-semibold">CEP</Label>
                  <p className="text-sm text-muted-foreground">{beneficiarioDetails.cep || 'Não informado'}</p>
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold">Cidade</Label>
                  <p className="text-sm text-muted-foreground">{beneficiarioDetails.cidade || 'Não informado'}</p>
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold">Estado</Label>
                  <p className="text-sm text-muted-foreground">{beneficiarioDetails.estado || 'Não informado'}</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="font-semibold">Endereço</Label>
                <p className="text-sm text-muted-foreground">{beneficiarioDetails.endereco || 'Não informado'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-semibold">Data de Adesão</Label>
                  <p className="text-sm text-muted-foreground">
                    {new Date(beneficiarioDetails.data_adesao).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold">Data de Criação</Label>
                  <p className="text-sm text-muted-foreground">
                    {new Date(beneficiarioDetails.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
              {beneficiarioDetails.observacoes && (
                <div className="space-y-2">
                  <Label className="font-semibold">Observações</Label>
                  <p className="text-sm text-muted-foreground">{beneficiarioDetails.observacoes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBeneficiarioDetailsOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
