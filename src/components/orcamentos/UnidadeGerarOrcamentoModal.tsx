import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Plus, Trash2, FileText } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { usePlanos } from "@/hooks/usePlanos"
import { useOrcamentos, type OrcamentoItem, type ClienteData } from "@/hooks/useOrcamentos"

interface UnidadeGerarOrcamentoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function UnidadeGerarOrcamentoModal({ open, onOpenChange }: UnidadeGerarOrcamentoModalProps) {
  const { toast } = useToast()
  const { planos, isLoading: isLoadingPlanos } = usePlanos()
  const { createOrcamento } = useOrcamentos()
  
  const [cliente, setCliente] = useState<ClienteData>({
    nome: "",
    documento: "",
    endereco: "",
    email: "",
    telefone: "",
  })
  
  const [itens, setItens] = useState<OrcamentoItem[]>([
    { 
      plano_id: "",
      plano_nome: "",
      quantidade: 1,
      valor_unitario: 0,
      valor_total: 0
    }
  ])
  
  const [observacoes, setObservacoes] = useState<string>("")

  const adicionarItem = () => {
    const novoItem: OrcamentoItem = {
      plano_id: "",
      plano_nome: "",
      quantidade: 1,
      valor_unitario: 0,
      valor_total: 0
    }
    setItens([...itens, novoItem])
  }

  const removerItem = (index: number) => {
    if (itens.length > 1) {
      setItens(itens.filter((_, i) => i !== index))
    }
  }

  const atualizarItem = (index: number, campo: keyof OrcamentoItem, valor: any) => {
    setItens(itens.map((item, i) => {
      if (i === index) {
        const itemAtualizado = { ...item, [campo]: valor }
        
        // Se mudou o plano, atualizar o valor automaticamente
        if (campo === 'plano_id') {
          const planoSelecionado = planos?.find(p => p.id === valor)
          if (planoSelecionado) {
            itemAtualizado.plano_nome = planoSelecionado.nome
            itemAtualizado.valor_unitario = Number(planoSelecionado.valor)
            itemAtualizado.valor_total = Number(planoSelecionado.valor) * itemAtualizado.quantidade
          }
        }
        
        // Se mudou a quantidade, recalcular valor total
        if (campo === 'quantidade') {
          itemAtualizado.valor_total = itemAtualizado.valor_unitario * Number(valor)
        }
        
        // Se mudou o valor unitário, recalcular valor total
        if (campo === 'valor_unitario') {
          itemAtualizado.valor_total = Number(valor) * itemAtualizado.quantidade
        }
        
        return itemAtualizado
      }
      return item
    }))
  }

  const calcularSubtotal = (): number => {
    return itens.reduce((total, item) => total + item.valor_total, 0)
  }

  // Calcular comissão interna baseada nos percentuais dos planos
  const calcularComissaoInterna = () => {
    let comissaoAdesao = 0 // Primeiro mês
    let comissaoRecorrente = 0 // 11 meses seguintes

    itens.forEach(item => {
      if (item.plano_id && planos) {
        const plano = planos.find(p => p.id === item.plano_id)
        if (plano) {
          // Comissão de adesão: primeiro mês
          comissaoAdesao += item.valor_total * (Number(plano.comissao_adesao_percentual || 100) / 100)

          // Comissão recorrente: 11 meses seguintes
          comissaoRecorrente += (item.valor_total * (Number(plano.comissao_recorrente_percentual || 30) / 100)) * 11
        }
      }
    })

    return { comissaoAdesao, comissaoRecorrente }
  }

  // Total para o cliente = apenas subtotal (sem comissão)
  const calcularTotal = (): number => {
    return calcularSubtotal()
  }

  const gerarOrcamento = async () => {
    // Validações
    if (!cliente.nome || !cliente.documento || !cliente.email) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios do cliente",
        variant: "destructive",
      })
      return
    }

    const itensValidos = itens.filter(item => item.plano_id && item.quantidade > 0)
    if (itensValidos.length === 0) {
      toast({
        title: "Erro",
        description: "Adicione pelo menos um item ao orçamento",
        variant: "destructive",
      })
      return
    }

    const { comissaoAdesao, comissaoRecorrente } = calcularComissaoInterna()
    const totalComissao = comissaoAdesao + comissaoRecorrente

    const orcamentoData = {
      cliente,
      itens: itensValidos,
      subtotal: calcularSubtotal(),
      comissao_percentual: totalComissao > 0 ? (totalComissao / calcularSubtotal()) * 100 : 0,
      comissao_valor: totalComissao,
      total: calcularTotal(), // Total para cliente = apenas subtotal
      observacoes
    }

    try {
      await createOrcamento.mutateAsync(orcamentoData)
      
      // Limpar formulário e fechar modal após sucesso
      setCliente({
        nome: "",
        documento: "",
        endereco: "",
        email: "",
        telefone: "",
      })
      setItens([{ 
        plano_id: "",
        plano_nome: "",
        quantidade: 1,
        valor_unitario: 0,
        valor_total: 0
      }])
      setObservacoes("")
      onOpenChange(false)
    } catch (error) {
      console.error('Erro ao criar orçamento:', error)
    }
  }

  const { comissaoAdesao, comissaoRecorrente } = calcularComissaoInterna()

  if (isLoadingPlanos) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center h-32">
            <div className="text-muted-foreground">Carregando planos...</div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Gerar Novo Orçamento
          </DialogTitle>
          <DialogDescription>
            Preencha os dados do cliente e adicione os itens do orçamento
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Formulário Principal */}
          <div className="lg:col-span-2 space-y-4">
            {/* Dados do Cliente */}
            <Card>
              <CardHeader>
                <CardTitle>Dados do Cliente</CardTitle>
                <CardDescription>
                  Informações básicas do cliente para o orçamento
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome Completo *</Label>
                    <Input
                      id="nome"
                      value={cliente.nome}
                      onChange={(e) => setCliente({ ...cliente, nome: e.target.value })}
                      placeholder="Digite o nome completo"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="documento">CPF/CNPJ *</Label>
                    <Input
                      id="documento"
                      value={cliente.documento}
                      onChange={(e) => setCliente({ ...cliente, documento: e.target.value })}
                      placeholder="Digite o CPF ou CNPJ"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endereco">Endereço</Label>
                  <Input
                    id="endereco"
                    value={cliente.endereco || ""}
                    onChange={(e) => setCliente({ ...cliente, endereco: e.target.value })}
                    placeholder="Digite o endereço completo"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={cliente.email || ""}
                      onChange={(e) => setCliente({ ...cliente, email: e.target.value })}
                      placeholder="Digite o e-mail"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telefone">Telefone</Label>
                    <Input
                      id="telefone"
                      value={cliente.telefone || ""}
                      onChange={(e) => setCliente({ ...cliente, telefone: e.target.value })}
                      placeholder="Digite o telefone"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Itens do Orçamento */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Itens do Orçamento</CardTitle>
                    <CardDescription>
                      Adicione os planos e serviços do orçamento
                    </CardDescription>
                  </div>
                  <Button onClick={adicionarItem} size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Item
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {itens.map((item, index) => (
                  <div key={index} className="flex gap-4 items-end">
                    <div className="flex-1">
                      <Label>Plano</Label>
                      <Select
                        value={item.plano_id}
                        onValueChange={(value) => atualizarItem(index, 'plano_id', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um plano" />
                        </SelectTrigger>
                        <SelectContent>
                          {planos?.map((plano) => (
                            <SelectItem key={plano.id} value={plano.id}>
                              {plano.nome} - R$ {Number(plano.valor).toFixed(2)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="w-24">
                      <Label>Qtd</Label>
                      <Input
                        type="number"
                        min="1"
                        value={item.quantidade}
                        onChange={(e) => atualizarItem(index, 'quantidade', parseInt(e.target.value) || 1)}
                      />
                    </div>
                    
                    <div className="w-32">
                      <Label>Valor Unit.</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.valor_unitario}
                        onChange={(e) => atualizarItem(index, 'valor_unitario', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    
                    <div className="w-32">
                      <Label>Total</Label>
                      <Input
                        value={`R$ ${item.valor_total.toFixed(2)}`}
                        disabled
                      />
                    </div>
                    
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => removerItem(index)}
                      disabled={itens.length === 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Observações */}
            <Card>
              <CardHeader>
                <CardTitle>Observações</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Digite observações adicionais (opcional)"
                  className="min-h-[100px]"
                />
              </CardContent>
            </Card>
          </div>

          {/* Resumo do Orçamento */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Resumo do Orçamento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>R$ {calcularSubtotal().toFixed(2)}</span>
                </div>
                
                <hr />
                
                <div className="flex justify-between font-bold text-lg">
                  <span>Total ao Cliente:</span>
                  <span>R$ {calcularTotal().toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Informações Internas de Comissão */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Informações Internas</CardTitle>
                <CardDescription className="text-xs">
                  Comissões calculadas automaticamente
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Comissão Adesão (1º mês):</span>
                  <span>R$ {comissaoAdesao.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Comissão Recorrente (11 meses):</span>
                  <span>R$ {comissaoRecorrente.toFixed(2)}</span>
                </div>
                <hr />
                <div className="flex justify-between font-semibold">
                  <span>Total Comissões:</span>
                  <span>R$ {(comissaoAdesao + comissaoRecorrente).toFixed(2)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={gerarOrcamento}
            disabled={createOrcamento.isPending}
          >
            <FileText className="h-4 w-4 mr-2" />
            {createOrcamento.isPending ? "Gerando..." : "Gerar Orçamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}