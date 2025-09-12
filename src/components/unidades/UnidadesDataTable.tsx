import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Edit, Trash2, Mail, MapPin, Building, Users, ChevronUp, ChevronDown, RefreshCw, Loader2, CheckCircle } from "lucide-react"
import type { Unidade } from "@/types/database"

interface UnidadesDataTableProps {
  unidades: Unidade[]
  convites?: any[]
  franquias?: any[]
  onEdit: (unidade: Unidade) => void
  onDelete: (id: string) => void
  onResendInvite?: (unidadeId: string, email: string, nome: string) => void
  onMarkInviteAccepted?: (unidadeId: string) => void
  isResending?: boolean
  isMarkingAccepted?: boolean
  canManage: boolean
}

type SortField = 'nome' | 'responsavel' | 'cidade' | 'status'
type SortDirection = 'asc' | 'desc'

export function UnidadesDataTable({ 
  unidades, 
  convites = [], 
  franquias = [], 
  onEdit, 
  onDelete, 
  onResendInvite,
  onMarkInviteAccepted,
  isResending = false,
  isMarkingAccepted = false,
  canManage 
}: UnidadesDataTableProps) {
  const [sortField, setSortField] = useState<SortField>('nome')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const sortedUnidades = [...unidades].sort((a, b) => {
    let aValue: string = ''
    let bValue: string = ''

    switch (sortField) {
      case 'nome':
        aValue = a.nome || ''
        bValue = b.nome || ''
        break
      case 'responsavel':
        aValue = a.responsavel || ''
        bValue = b.responsavel || ''
        break
      case 'cidade':
        aValue = a.cidade || ''
        bValue = b.cidade || ''
        break
      case 'status':
        aValue = a.status || ''
        bValue = b.status || ''
        break
    }

    const comparison = aValue.localeCompare(bValue)
    return sortDirection === 'asc' ? comparison : -comparison
  })

  const getConviteStatus = (unidade: Unidade) => {
    const convite = convites.find(c => c.unidade_id === unidade.id)
    if (!convite) return { status: 'Não enviado', variant: 'secondary' as const }
    if (convite.aceito) return { status: 'Aceito', variant: 'default' as const }
    if (new Date(convite.expires_at) <= new Date()) return { status: 'Expirado', variant: 'destructive' as const }
    return { status: 'Pendente', variant: 'outline' as const }
  }

  const canResendInvite = (unidade: Unidade, conviteStatus: { status: string }) => {
    const hasEmail = unidade.email && unidade.email.trim() !== ''
    const needsInvite = ['Não enviado', 'Pendente', 'Expirado'].includes(conviteStatus.status)
    return hasEmail && needsInvite && onResendInvite && canManage
  }

  const canMarkAccepted = (unidade: Unidade, conviteStatus: { status: string }) => {
    const hasConvite = convites.find(c => c.unidade_id === unidade.id)
    const notAccepted = conviteStatus.status !== 'Aceito'
    return hasConvite && notAccepted && onMarkInviteAccepted && canManage
  }

  const getFranquiaNome = (franquiaId: string | null) => {
    if (!franquiaId) return '-'
    return franquias?.find(f => f.id === franquiaId)?.nome || '-'
  }

  const SortButton = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      onClick={() => handleSort(field)}
      className="h-auto p-0 font-medium hover:bg-transparent"
    >
      <span className="flex items-center gap-1">
        {children}
        {sortField === field && (
          sortDirection === 'asc' ? 
            <ChevronUp className="h-3 w-3" /> : 
            <ChevronDown className="h-3 w-3" />
        )}
      </span>
    </Button>
  )

  if (unidades.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <Building className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground mb-2">
            Nenhuma unidade encontrada
          </h3>
          <p className="text-muted-foreground">
            Comece criando sua primeira unidade
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building className="h-5 w-5" />
          Unidades Cadastradas ({unidades.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <SortButton field="nome">Nome da Unidade</SortButton>
              </TableHead>
              <TableHead>CNPJ</TableHead>
              <TableHead>
                <SortButton field="responsavel">Responsável</SortButton>
              </TableHead>
              <TableHead>
                <SortButton field="cidade">Localização</SortButton>
              </TableHead>
              <TableHead>Franquia</TableHead>
              <TableHead>Status do Convite</TableHead>
              <TableHead>
                <SortButton field="status">Status</SortButton>
              </TableHead>
              {canManage && <TableHead className="text-right">Ações</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedUnidades.map((unidade) => {
              const conviteStatus = getConviteStatus(unidade)
              return (
                <TableRow key={unidade.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">
                    <div className="flex flex-col">
                      <span className="font-semibold">{unidade.nome}</span>
                      {unidade.telefone && (
                        <span className="text-sm text-muted-foreground">
                          {unidade.telefone}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-1 py-0.5 rounded">
                      {unidade.cnpj || '-'}
                    </code>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{unidade.responsavel || '-'}</span>
                      {unidade.email && (
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          {unidade.email}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {unidade.cidade || unidade.estado ? (
                      <div className="flex items-center gap-1 text-sm">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <span>
                          {[unidade.cidade, unidade.estado].filter(Boolean).join(', ') || '-'}
                        </span>
                      </div>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 text-sm">
                      <Users className="h-3 w-3 text-muted-foreground" />
                      {getFranquiaNome(unidade.franquia_id)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={conviteStatus.variant}>
                      {conviteStatus.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={unidade.status === 'ativo' ? 'default' : 'secondary'}>
                      {unidade.status === 'ativo' ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {canResendInvite(unidade, conviteStatus) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onResendInvite!(unidade.id, unidade.email!, unidade.responsavel || unidade.nome)}
                            disabled={isResending}
                            className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700"
                            title="Reenviar convite"
                          >
                            {isResending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                        {canMarkAccepted(unidade, conviteStatus) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onMarkInviteAccepted!(unidade.id)}
                            disabled={isMarkingAccepted}
                            className="h-8 w-8 p-0 text-green-600 hover:text-green-700"
                            title="Marcar convite como aceito"
                          >
                            {isMarkingAccepted ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle className="h-4 w-4" />
                            )}
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEdit(unidade)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDelete(unidade.id)}
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}