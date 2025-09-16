import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
  Search, 
  Filter, 
  MoreHorizontal, 
  CheckCircle, 
  AlertCircle, 
  XCircle,
  Calendar,
  Phone,
  Mail
} from "lucide-react"
import { useBeneficiarios } from "@/hooks/useBeneficiarios"
import { usePlanos } from "@/hooks/usePlanos"
import { useUnidades } from "@/hooks/useUnidades"

export default function GestaoCliente() {
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("todos")

  // Buscar a unidade do usuário logado
  const { unidades, isLoading: unidadesLoading } = useUnidades()
  const unidadeDoUsuario = unidades?.[0] // Para usuário de unidade, sempre há apenas uma unidade

  // Filtrar beneficiários apenas da unidade do usuário
  const { beneficiarios, isLoading: beneficiariosLoading } = useBeneficiarios({
    unidadeId: unidadeDoUsuario?.id
  })
  const { planos, isLoading: planosLoading } = usePlanos()

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
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 touch-manipulation">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
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
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
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
    </div>
  )
}