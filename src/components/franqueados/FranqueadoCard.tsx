import { MoreVertical, Edit, Trash2, Eye, User, Mail, Phone, Building2, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu"
import { useNavigate } from "react-router-dom"
import { useConvites } from "@/hooks/useConvites"
import type { Franqueado } from "@/pages/Franqueados"

interface FranqueadoCardProps {
  franqueado: Franqueado
  onEdit: (franqueado: Franqueado) => void
  onDelete: (id: string) => void
}

export function FranqueadoCard({ franqueado, onEdit, onDelete }: FranqueadoCardProps) {
  const navigate = useNavigate()
  const { getConviteByUnidade, getConviteStatus, resendInvite, isResending } = useConvites()

  const convite = getConviteByUnidade(franqueado.id)
  const conviteStatus = getConviteStatus(convite)

  const handleViewDetails = () => {
    navigate(`/franqueados/${franqueado.cuf}`)
  }

  const handleResendInvite = () => {
    if (!franqueado.email) {
      return
    }
    resendInvite({
      unidadeId: franqueado.id,
      email: franqueado.email,
      nome: franqueado.nome
    })
  }

  const getStatusBadge = () => {
    switch (conviteStatus) {
      case 'accepted':
        return <Badge variant="secondary" className="bg-green-100 text-green-800">Aceito</Badge>
      case 'sent':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800">Enviado</Badge>
      case 'expired':
        return <Badge variant="secondary" className="bg-red-100 text-red-800">Expirado</Badge>
      default:
        return <Badge variant="outline" className="bg-gray-100 text-gray-800">Não enviado</Badge>
    }
  }

  return (
    <Card className="transition-all duration-200 hover:shadow-md border border-border bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{franqueado.nome}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline">
                  {franqueado.cuf}
                </Badge>
                {getStatusBadge()}
              </div>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleViewDetails}>
                <Eye className="h-4 w-4 mr-2" />
                Ver Detalhes
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(franqueado)}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </DropdownMenuItem>
              
              {franqueado.email && conviteStatus !== 'accepted' && (
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
                onClick={() => onDelete(franqueado.id)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground truncate">{franqueado.email}</span>
        </div>
        
        <div className="flex items-center gap-2 text-sm">
          <Phone className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">{franqueado.telefone}</span>
        </div>
        
        {franqueado.dadosBancarios?.banco && (
          <div className="flex items-center gap-2 text-sm">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">{franqueado.dadosBancarios.banco}</span>
          </div>
        )}
        
        <div className="pt-3 border-t border-border">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Cadastrado em</span>
            <span>{new Date(franqueado.createdAt).toLocaleDateString('pt-BR')}</span>
          </div>
        </div>
        
        <Button 
          onClick={handleViewDetails}
          className="w-full mt-4"
          variant="outline"
        >
          Ver Detalhes
        </Button>
      </CardContent>
    </Card>
  )
}