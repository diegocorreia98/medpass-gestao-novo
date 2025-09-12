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

export default function GestaoCliente() {
  const [searchTerm, setSearchTerm] = useState("")
  const [activeTab, setActiveTab] = useState("todos")
  
  const { beneficiarios, isLoading: beneficiariosLoading } = useBeneficiarios()
  const { planos, isLoading: planosLoading } = usePlanos()
  
  const isLoading = beneficiariosLoading || planosLoading

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
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Cliente</TableHead>
          <TableHead>Plano</TableHead>
          <TableHead>Valor</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Data Adesão</TableHead>
          <TableHead>Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {clientes.length > 0 ? clientes.map((beneficiario) => (
          <TableRow key={beneficiario.id}>
            <TableCell>
              <div>
                <div className="font-medium">{beneficiario.nome}</div>
                <div className="text-sm text-muted-foreground flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {beneficiario.email || 'Não informado'}
                </div>
                <div className="text-sm text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {beneficiario.telefone || 'Não informado'}
                </div>
                <div className="text-sm text-muted-foreground">
                  CPF: {beneficiario.cpf}
                </div>
              </div>
            </TableCell>
            <TableCell>{getPlanoNome(beneficiario.plano_id)}</TableCell>
            <TableCell>R$ {beneficiario.valor_plano.toFixed(2)}</TableCell>
            <TableCell>{getStatusBadge(beneficiario.status)}</TableCell>
            <TableCell>
              <div className="flex items-center gap-1 text-sm">
                <Calendar className="h-3 w-3" />
                {new Date(beneficiario.data_adesao).toLocaleDateString('pt-BR')}
              </div>
            </TableCell>
            <TableCell>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        )) : (
          <TableRow>
            <TableCell colSpan={6} className="text-center py-4 text-muted-foreground">
              {isLoading ? 'Carregando clientes...' : 'Nenhum cliente encontrado'}
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  )

  const clientesAtivos = beneficiarios.filter(b => b.status === 'ativo').length
  const clientesPendentes = beneficiarios.filter(b => b.status === 'pendente').length
  const clientesCancelados = beneficiarios.filter(b => b.status === 'inativo').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gestão de Cliente</h1>
          <p className="text-muted-foreground">
            Gerencie todos os seus clientes e planos
          </p>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Planos Ativos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {isLoading ? '...' : clientesAtivos}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {isLoading ? '...' : clientesPendentes}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Cancelados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {isLoading ? '...' : clientesCancelados}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Clientes</CardTitle>
          <CardDescription>
            Visualize e gerencie todos os seus clientes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Filtros
            </Button>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="todos">Todos</TabsTrigger>
              <TabsTrigger value="ativo">Ativos</TabsTrigger>
              <TabsTrigger value="pendente">Pendentes</TabsTrigger>
              <TabsTrigger value="cancelado">Cancelados</TabsTrigger>
            </TabsList>

            <TabsContent value="todos" className="mt-6">
              <ClienteTable clientes={filteredBeneficiarios} />
            </TabsContent>

            <TabsContent value="ativo" className="mt-6">
              <ClienteTable clientes={filteredBeneficiarios} />
            </TabsContent>

            <TabsContent value="pendente" className="mt-6">
              <ClienteTable clientes={filteredBeneficiarios} />
            </TabsContent>

            <TabsContent value="cancelado" className="mt-6">
              <ClienteTable clientes={filteredBeneficiarios} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}