import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { FileText, User, Phone, Mail, MapPin, Calendar, DollarSign } from "lucide-react"
import { useOrcamentos } from "@/hooks/useOrcamentos"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

interface DetalhesOrcamentoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orcamentoId: string | null
}

export function DetalhesOrcamentoModal({ open, onOpenChange, orcamentoId }: DetalhesOrcamentoModalProps) {
  const { getOrcamentoById } = useOrcamentos()
  const [orcamento, setOrcamento] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (open && orcamentoId) {
      loadOrcamento()
    }
  }, [open, orcamentoId])

  const loadOrcamento = async () => {
    if (!orcamentoId) return
    
    setIsLoading(true)
    try {
      const data = await getOrcamentoById(orcamentoId)
      setOrcamento(data)
    } catch (error) {
      console.error('Erro ao carregar orçamento:', error)
    } finally {
      setIsLoading(false)
    }
  }

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Detalhes do Orçamento
          </DialogTitle>
          <DialogDescription>
            Visualize todas as informações do orçamento
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Carregando dados...</div>
          </div>
        ) : orcamento ? (
          <div className="space-y-6">
            {/* Cabeçalho com Status e Data */}
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold">{orcamento.cliente_nome}</h3>
                <p className="text-muted-foreground">Documento: {orcamento.cliente_documento}</p>
              </div>
              <div className="text-right space-y-2">
                {getStatusBadge(orcamento.status)}
                <div className="text-sm text-muted-foreground">
                  Criado em {format(new Date(orcamento.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Dados do Cliente */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Dados do Cliente
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Nome:</span>
                    <span>{orcamento.cliente_nome}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">Documento:</span>
                    <span>{orcamento.cliente_documento}</span>
                  </div>
                  
                  {orcamento.cliente_email && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">E-mail:</span>
                      <span>{orcamento.cliente_email}</span>
                    </div>
                  )}
                  
                  {orcamento.cliente_telefone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">Telefone:</span>
                      <span>{orcamento.cliente_telefone}</span>
                    </div>
                  )}
                  
                  {orcamento.cliente_endereco && (
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <span className="font-medium">Endereço:</span>
                      <span className="flex-1">{orcamento.cliente_endereco}</span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Resumo Financeiro */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Resumo Financeiro
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span className="font-medium">R$ {Number(orcamento.subtotal).toFixed(2)}</span>
                  </div>
                  
                  <div className="flex justify-between">
                    <span>Comissão ({Number(orcamento.comissao_percentual)}%):</span>
                    <span className="font-medium">R$ {Number(orcamento.comissao_valor).toFixed(2)}</span>
                  </div>
                  
                  <hr />
                  
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span className="text-primary">R$ {Number(orcamento.total).toFixed(2)}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Atualizado em {format(new Date(orcamento.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Itens do Orçamento */}
            <Card>
              <CardHeader>
                <CardTitle>Itens do Orçamento</CardTitle>
                <CardDescription>
                  {orcamento.orcamentos_itens?.length || 0} item(s) no orçamento
                </CardDescription>
              </CardHeader>
              <CardContent>
                {orcamento.orcamentos_itens && orcamento.orcamentos_itens.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Plano</TableHead>
                        <TableHead className="text-center">Quantidade</TableHead>
                        <TableHead className="text-right">Valor Unitário</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orcamento.orcamentos_itens.map((item: any, index: number) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">
                            {item.plano_nome}
                          </TableCell>
                          <TableCell className="text-center">
                            {item.quantidade}
                          </TableCell>
                          <TableCell className="text-right">
                            R$ {Number(item.valor_unitario).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            R$ {Number(item.valor_total).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    Nenhum item encontrado neste orçamento
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Observações */}
            {orcamento.observacoes && (
              <Card>
                <CardHeader>
                  <CardTitle>Observações</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{orcamento.observacoes}</p>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Orçamento não encontrado</p>
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}