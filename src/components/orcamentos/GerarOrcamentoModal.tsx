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

interface GerarOrcamentoModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function GerarOrcamentoModal({ open, onOpenChange }: GerarOrcamentoModalProps) {
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

  const [periodoMeses, setPeriodoMeses] = useState<number>(12)
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

  const calcularComissaoInterna = () => {
    let comissaoAdesao = 0
    let comissaoRecorrenteMensal = 0

    itens.forEach(item => {
      if (item.plano_id) {
        const plano = planos?.find(p => p.id === item.plano_id)
        if (plano) {
          const valorItem = item.valor_total
          // Comissão de adesão: aplicada apenas na 1ª parcela
          comissaoAdesao += valorItem * (Number(plano.comissao_adesao_percentual || 100) / 100)
          // Comissão recorrente: aplicada mensalmente a partir da 2ª parcela
          comissaoRecorrenteMensal += valorItem * (Number(plano.comissao_recorrente_percentual || 30) / 100)
        }
      }
    })

    // Total de comissões considerando o período do contrato
    // Adesão (1ª parcela) + Recorrente (demais parcelas)
    const parcelasRecorrentes = Math.max(0, periodoMeses - 1) // Descontar a primeira parcela
    const comissaoRecorrenteTotal = comissaoRecorrenteMensal * parcelasRecorrentes
    const totalComissoes = comissaoAdesao + comissaoRecorrenteTotal

    return {
      comissaoAdesao,
      comissaoRecorrenteMensal,
      comissaoRecorrenteTotal,
      parcelasRecorrentes,
      total: totalComissoes
    }
  }

  const calcularTotal = (): number => {
    // Cliente paga apenas o subtotal, sem comissão
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

    const comissaoInfo = calcularComissaoInterna()
    
    const orcamentoData = {
      cliente,
      itens: itensValidos,
      subtotal: calcularSubtotal(),
      comissao_percentual: 0, // Não há comissão no valor do cliente
      comissao_valor: comissaoInfo.total, // Comissão interna para controle
      total: calcularTotal(),
      observacoes
    }

    try {
      await createOrcamento.mutateAsync(orcamentoData)
      
      // Limpar formulário após sucesso
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
      setPeriodoMeses(12)
      setObservacoes("")
      
      // Fechar modal
      onOpenChange(false)
    } catch (error) {
      console.error('Erro ao criar orçamento:', error)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerar Orçamento</DialogTitle>
          <DialogDescription>
            Crie um novo orçamento para cliente
          </DialogDescription>
        </DialogHeader>

        {isLoadingPlanos ? (
          <div className="flex items-center justify-center h-32">
            <div className="text-muted-foreground">Carregando planos...</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Formulário Principal */}
            <div className="lg:col-span-2 space-y-6">
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

              {/* Período do Contrato */}
              <Card>
                <CardHeader>
                  <CardTitle>Período do Contrato</CardTitle>
                  <CardDescription>
                    Defina a duração do contrato em meses para cálculo das comissões
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Label htmlFor="periodo">Duração (meses) *</Label>
                    <div className="flex gap-4 items-center">
                      <Input
                        id="periodo"
                        type="number"
                        min="1"
                        max="60"
                        value={periodoMeses}
                        onChange={(e) => setPeriodoMeses(parseInt(e.target.value) || 12)}
                        className="w-32"
                      />
                      <span className="text-sm text-muted-foreground">
                        {periodoMeses} {periodoMeses === 1 ? 'mês' : 'meses'} de contrato
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Este período será usado para calcular as comissões recorrentes (da 2ª parcela em diante)
                    </p>
                  </div>
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
            <div className="space-y-6">
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
                    <span>Total do Cliente:</span>
                    <span>R$ {calcularTotal().toFixed(2)}</span>
                  </div>
                  
                  <hr />

                  <div className="bg-muted p-3 rounded-md space-y-2">
                    <div className="text-sm font-medium text-muted-foreground mb-2">
                      Comissões (Interno) - {periodoMeses} {periodoMeses === 1 ? 'mês' : 'meses'}
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Adesão (1ª parcela):</span>
                      <span className="font-medium">R$ {calcularComissaoInterna().comissaoAdesao.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Recorrente mensal:</span>
                      <span>R$ {calcularComissaoInterna().comissaoRecorrenteMensal.toFixed(2)}/mês</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-xs text-muted-foreground">
                        ({calcularComissaoInterna().parcelasRecorrentes} parcelas × R$ {calcularComissaoInterna().comissaoRecorrenteMensal.toFixed(2)}):
                      </span>
                      <span>R$ {calcularComissaoInterna().comissaoRecorrenteTotal.toFixed(2)}</span>
                    </div>
                    <hr className="my-2" />
                    <div className="flex justify-between text-sm font-bold">
                      <span>Total Comissões:</span>
                      <span className="text-primary">R$ {calcularComissaoInterna().total.toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

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