import { MoreVertical, Edit, Trash2, Send, User, Building2, MapPin, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { useConvites } from "@/hooks/useConvites"
import type { Unidade } from "@/types/database"

interface UnidadeCardProps {
  unidade: Unidade & { franquia?: { nome: string } }
  onEdit: (unidade: Unidade) => void
  onDelete: (id: string) => void
  canManage: boolean
}

export function UnidadeCard({ unidade, onEdit, onDelete, canManage }: UnidadeCardProps) {
  const { getConviteByUnidade, getConviteStatus, resendInvite, isResending } = useConvites()

  const convite = getConviteByUnidade(unidade.id)
  const conviteStatus = getConviteStatus(convite)

  const handleResendInvite = () => {
    if (!unidade.email) {
      return
    }
    resendInvite({
      unidadeId: unidade.id,
      email: unidade.email,
      nome: unidade.responsavel || unidade.nome
    })
  }

  const getStatusBadge = () => {
    switch (conviteStatus) {
      case 'accepted':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Ativo</Badge>
      case 'sent':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Convite Enviado</Badge>
      case 'expired':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Convite Expirado</Badge>
      default:
        return <Badge variant="outline">Sem Responsável</Badge>
    }
  }

  const getStatusColor = () => {
    switch (conviteStatus) {
      case 'accepted':
        return 'border-l-green-500'
      case 'sent':
        return 'border-l-blue-500'
      case 'expired':
        return 'border-l-red-500'
      default:
        return 'border-l-gray-300'
    }
  }

  return (
    <Card className={`transition-all duration-200 hover:shadow-md border-l-4 ${getStatusColor()}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{unidade.nome}</h3>
              <div className="flex items-center gap-2 mt-1">
                {unidade.franquia && (
                  <Badge variant="secondary">
                    {unidade.franquia.nome}
                  </Badge>
                )}
                {getStatusBadge()}
              </div>
            </div>
          </div>
          
          {canManage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(unidade)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar Unidade
                </DropdownMenuItem>
                
                {unidade.email && conviteStatus !== 'accepted' && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={handleResendInvite}
                      disabled={isResending}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {conviteStatus === 'not_sent' ? 'Enviar Convite' : 'Reenviar Convite'}
                    </DropdownMenuItem>
                  </>
                )}
                
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => onDelete(unidade.id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {unidade.responsavel && (
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{unidade.responsavel}</span>
          </div>
        )}
        
        {unidade.telefone && (
          <div className="flex items-center gap-2 text-sm">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{unidade.telefone}</span>
          </div>
        )}
        
        {(unidade.cidade || unidade.estado) && (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">
              {unidade.cidade}{unidade.cidade && unidade.estado ? ', ' : ''}{unidade.estado}
            </span>
          </div>
        )}
        
        <div className="pt-3 border-t border-border">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Criada em</span>
            <span>{new Date(unidade.created_at).toLocaleDateString('pt-BR')}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}