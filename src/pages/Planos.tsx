import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Pencil, Trash2, CreditCard, Eye } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { usePlanos } from "@/hooks/usePlanos"
import { useFranquias } from "@/hooks/useFranquias"
import type { Tables } from "@/integrations/supabase/types"

type Plano = Tables<'planos'>

interface PlanoForm {
  nome: string
  valor: string
  custo: string
  franquia_id: string
  comissao_adesao_percentual: string
  comissao_recorrente_percentual: string
  vigencia: string
  descricao: string
  vindi_product_id: string
  vindi_plan_id: string
  rms_plan_code: string
}

export default function Planos() {
  const { toast } = useToast()
  const { 
    todosPlanos: planos = [], 
    isLoadingTodos: isLoading, 
    createPlano, 
    updatePlano, 
    deactivatePlano,
    canManage 
  } = usePlanos()
  const { franquias } = useFranquias()

  const [formData, setFormData] = useState<PlanoForm>({
    nome: "",
    valor: "",
    custo: "",
    franquia_id: "none",
    comissao_adesao_percentual: "",
    comissao_recorrente_percentual: "",
    vigencia: "",
    descricao: "",
    vindi_product_id: "",
    vindi_plan_id: "",
    rms_plan_code: ""
  })
  
  const [editingId, setEditingId] = useState<string | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false)
  const [selectedPlano, setSelectedPlano] = useState<Plano | null>(null)

  const abrirFormulario = (plano?: Plano) => {
    if (plano) {
      setEditingId(plano.id)
      setFormData({
        nome: plano.nome,
        valor: plano.valor.toString(),
        custo: plano.custo?.toString() || "0",
        franquia_id: plano.franquia_id || "none",
        comissao_adesao_percentual: plano.comissao_adesao_percentual?.toString() || "100",
        comissao_recorrente_percentual: plano.comissao_recorrente_percentual?.toString() || "30",
        vigencia: "12", // Campo vigência não existe na tabela atual
        descricao: plano.descricao || "",
        vindi_product_id: (plano as any).vindi_product_id || "",
        vindi_plan_id: (plano as any).vindi_plan_id?.toString() || "",
        rms_plan_code: (plano as any).rms_plan_code || ""
      })
    } else {
      setEditingId(null)
      setFormData({
        nome: "",
        valor: "",
        custo: "",
        franquia_id: "none",
        comissao_adesao_percentual: "100",
        comissao_recorrente_percentual: "30",
        vigencia: "",
        descricao: "",
        vindi_product_id: "",
        vindi_plan_id: "",
        rms_plan_code: ""
      })
    }
    setDialogOpen(true)
  }

  const salvarPlano = () => {
    if (!formData.nome || !formData.valor || !formData.custo || !formData.comissao_adesao_percentual || !formData.comissao_recorrente_percentual) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive"
      })
      return
    }

    const planoData = {
      nome: formData.nome,
      valor: parseFloat(formData.valor),
      custo: parseFloat(formData.custo),
      franquia_id: formData.franquia_id === "none" ? null : formData.franquia_id,
      comissao_adesao_percentual: parseFloat(formData.comissao_adesao_percentual),
      comissao_recorrente_percentual: parseFloat(formData.comissao_recorrente_percentual),
      descricao: formData.descricao || null,
      vindi_product_id: formData.vindi_product_id || null,
      vindi_plan_id: formData.vindi_plan_id ? parseInt(formData.vindi_plan_id) : null,
      rms_plan_code: formData.rms_plan_code || null
    }

    if (editingId) {
      updatePlano.mutate({ id: editingId, updates: planoData })
    } else {
      createPlano.mutate(planoData)
    }

    setDialogOpen(false)
    setFormData({
      nome: "",
      valor: "",
      custo: "",
      franquia_id: "none",
      comissao_adesao_percentual: "100",
      comissao_recorrente_percentual: "30",
      vigencia: "",
      descricao: "",
      vindi_product_id: "",
      vindi_plan_id: "",
      rms_plan_code: ""
    })
  }

  const excluirPlano = (id: string) => {
    deactivatePlano.mutate(id)
  }

  const toggleStatus = (id: string) => {
    const plano = planos.find(p => p.id === id)
    if (plano) {
      updatePlano.mutate({ id, updates: { ativo: !plano.ativo } })
    }
  }

  const abrirDetalhes = (plano: Plano) => {
    setSelectedPlano(plano)
    setDetailsDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Configurar Planos</h2>
          <p className="text-muted-foreground">Gerencie os planos de benefício disponíveis</p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => abrirFormulario()}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Plano
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh]">
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Editar Plano" : "Novo Plano"}
              </DialogTitle>
              <DialogDescription>
                {editingId ? "Atualize as informações do plano" : "Crie um novo plano de benefício"}
              </DialogDescription>
            </DialogHeader>
            
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="nome">Nome do Plano *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Ex: Plano Básico"
                  />
                </div>
                
                <div>
                  <Label htmlFor="franquia">Franquia</Label>
                  <Select
                    value={formData.franquia_id}
                    onValueChange={(value) => setFormData({ ...formData, franquia_id: value })}
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
                  <div className="text-xs text-muted-foreground mt-1">
                    Associe este plano a uma franquia específica
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="valor">Valor do Plano (R$) *</Label>
                    <Input
                      id="valor"
                      type="number"
                      step="0.01"
                      value={formData.valor}
                      onChange={(e) => setFormData({ ...formData, valor: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="custo">Custo do Plano (R$) *</Label>
                    <Input
                      id="custo"
                      type="number"
                      step="0.01"
                      value={formData.custo}
                      onChange={(e) => setFormData({ ...formData, custo: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="vigencia">Vigência (meses)</Label>
                  <Input
                    id="vigencia"
                    type="number"
                    value={formData.vigencia}
                    onChange={(e) => setFormData({ ...formData, vigencia: e.target.value })}
                    placeholder="12"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="vindi_product_id">ID do Produto na Vindi</Label>
                    <Input
                      id="vindi_product_id"
                      value={formData.vindi_product_id}
                      onChange={(e) => setFormData({ ...formData, vindi_product_id: e.target.value })}
                      placeholder="Ex: prod_123abc"
                    />
                    <div className="text-xs text-muted-foreground mt-1">
                      ID do produto cadastrado na plataforma Vindi
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="vindi_plan_id">ID do Plano na Vindi</Label>
                    <Input
                      id="vindi_plan_id"
                      type="number"
                      value={formData.vindi_plan_id}
                      onChange={(e) => setFormData({ ...formData, vindi_plan_id: e.target.value })}
                      placeholder="Ex: 12345"
                    />
                    <div className="text-xs text-muted-foreground mt-1">
                      ID do plano de assinatura cadastrado na plataforma Vindi
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="rms_plan_code">Código do Plano RMS</Label>
                  <Input
                    id="rms_plan_code"
                    value={formData.rms_plan_code}
                    onChange={(e) => setFormData({ ...formData, rms_plan_code: e.target.value })}
                    placeholder="Ex: MEDPASS001"
                  />
                  <div className="text-xs text-muted-foreground mt-1">
                    Código identificador do plano na API RMS (idClienteContrato)
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="comissao_adesao_percentual">Comissão Adesão (%) *</Label>
                    <Input
                      id="comissao_adesao_percentual"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.comissao_adesao_percentual}
                      onChange={(e) => setFormData({ ...formData, comissao_adesao_percentual: e.target.value })}
                      placeholder="100.00"
                    />
                    <div className="text-xs text-muted-foreground mt-1">
                      Comissão sobre a primeira parcela (adesão)
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="comissao_recorrente_percentual">Comissão Recorrente (%) *</Label>
                    <Input
                      id="comissao_recorrente_percentual"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.comissao_recorrente_percentual}
                      onChange={(e) => setFormData({ ...formData, comissao_recorrente_percentual: e.target.value })}
                      placeholder="30.00"
                    />
                    <div className="text-xs text-muted-foreground mt-1">
                      Comissão sobre as mensalidades
                    </div>
                  </div>
                </div>

                {formData.valor && formData.custo && formData.comissao_adesao_percentual && formData.comissao_recorrente_percentual && (
                  <div className="space-y-3 pt-4 border-t">
                    <h4 className="font-semibold text-sm">Cálculos Automáticos:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="p-3 bg-muted rounded-lg">
                        <Label className="text-sm font-medium">Comissão de Adesão:</Label>
                        <div className="text-lg font-bold text-green-600">
                          R$ {(parseFloat(formData.valor || "0") * parseFloat(formData.comissao_adesao_percentual || "0") / 100).toFixed(2)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {formData.comissao_adesao_percentual}% da primeira parcela
                        </div>
                      </div>
                      
                      <div className="p-3 bg-muted rounded-lg">
                        <Label className="text-sm font-medium">Comissão Recorrente:</Label>
                        <div className="text-lg font-bold text-blue-600">
                          R$ {(parseFloat(formData.valor || "0") * parseFloat(formData.comissao_recorrente_percentual || "0") / 100).toFixed(2)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {formData.comissao_recorrente_percentual}% das mensalidades
                        </div>
                      </div>

                      <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
                        <Label className="text-sm font-medium">Valor Líquido Recorrente:</Label>
                        <div className="text-lg font-bold text-primary">
                          R$ {(
                            parseFloat(formData.valor || "0") - 
                            parseFloat(formData.custo || "0") - 
                            (parseFloat(formData.valor || "0") * parseFloat(formData.comissao_recorrente_percentual || "0") / 100)
                          ).toFixed(2)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Valor - Custo - Comissão Recorrente
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div>
                  <Label htmlFor="descricao">Descrição</Label>
                  <Textarea
                    id="descricao"
                    value={formData.descricao}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                    placeholder="Descrição do plano (opcional)"
                    className="min-h-20"
                  />
                </div>
              </div>
            </ScrollArea>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={salvarPlano}>
                {editingId ? "Atualizar" : "Criar"} Plano
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Lista de Planos */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-20 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {planos.map((plano) => (
            <Card key={plano.id} className={`relative flex flex-col h-full ${!plano.ativo ? 'opacity-60' : ''}`}>
              <CardHeader>
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <Badge variant={plano.ativo ? "default" : "secondary"}>
                      {plano.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                    {((plano as any).vindi_plan_id || (plano as any).vindi_product_id) && (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        Vindi
                      </Badge>
                    )}
                    {(plano as any).rms_plan_code && (
                      <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                        RMS
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-lg">
                    {plano.nome}
                  </CardTitle>
                </div>
                {plano.descricao && (
                  <CardDescription>{plano.descricao}</CardDescription>
                )}
              </CardHeader>
              
              <CardContent className="flex flex-col flex-1 space-y-4">
                <div className="text-center space-y-2">
                  <div className="text-2xl font-bold text-primary">
                    R$ {plano.valor.toFixed(2)}
                  </div>
                  
                  {plano.descricao && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {plano.descricao}
                    </p>
                  )}
                </div>
                
                {/* Mostrar informação do RMS se configurado */}
                {(plano as any).rms_plan_code && (
                  <div className="text-center py-2 px-3 bg-orange-50 rounded-lg border border-orange-200 space-y-1">
                    <div className="text-xs font-medium text-orange-700">
                      Código RMS: {(plano as any).rms_plan_code}
                    </div>
                  </div>
                )}

                {/* Mostrar informação do Vindi se configurado */}
                {((plano as any).vindi_plan_id || (plano as any).vindi_product_id) && (
                  <div className="text-center py-2 px-3 bg-blue-50 rounded-lg border border-blue-200 space-y-1">
                    {(plano as any).vindi_product_id && (
                      <div className="text-xs font-medium text-blue-700">
                        ID Produto: {(plano as any).vindi_product_id}
                      </div>
                    )}
                    {(plano as any).vindi_plan_id && (
                      <div className="text-xs font-medium text-blue-700">
                        ID Plano: {(plano as any).vindi_plan_id}
                      </div>
                    )}
                  </div>
                )}
                
                <div className="space-y-2 pt-4 border-t mt-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => abrirDetalhes(plano)}
                    className="w-full"
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Ver Detalhes
                  </Button>
                  
                  {canManage && (
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => abrirFormulario(plano)}
                      >
                        <Pencil className="h-4 w-4 mr-1" />
                        Editar
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleStatus(plano.id)}
                      >
                        {plano.ativo ? "Desativar" : "Ativar"}
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => excluirPlano(plano.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de Detalhes do Plano */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Detalhes do Plano
            </DialogTitle>
            <DialogDescription>
              Visualize todas as informações do plano selecionado
            </DialogDescription>
          </DialogHeader>
          
          {selectedPlano && (
            <ScrollArea className="max-h-[60vh] pr-4">
              <div className="space-y-6">
                {/* Informações Básicas */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-sm border-b pb-2">Informações Básicas</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Nome do Plano</Label>
                      <div className="text-base font-medium">{selectedPlano.nome}</div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                      <div className="mt-1">
                        <Badge variant={selectedPlano.ativo ? "default" : "secondary"}>
                          {selectedPlano.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  {selectedPlano.descricao && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Descrição</Label>
                      <div className="text-base mt-1 p-3 bg-muted rounded-lg">{selectedPlano.descricao}</div>
                    </div>
                  )}
                  {/* Código RMS */}
                  {(selectedPlano as any).rms_plan_code && (
                    <div>
                      <Label className="text-sm font-medium text-muted-foreground">Código RMS</Label>
                      <div className="text-base font-mono mt-1 p-3 bg-orange-50 rounded-lg border border-orange-200">
                        {(selectedPlano as any).rms_plan_code}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Código identificador usado na integração com a API RMS
                      </div>
                    </div>
                  )}

                  {/* Informações da Vindi */}
                  {((selectedPlano as any).vindi_product_id || (selectedPlano as any).vindi_plan_id) && (
                    <div className="space-y-3">
                      <Label className="text-sm font-medium text-muted-foreground">Integração Vindi</Label>
                      <div className="grid grid-cols-1 gap-3">
                        {(selectedPlano as any).vindi_product_id && (
                          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="text-xs font-medium text-blue-700 mb-1">ID do Produto</div>
                            <div className="text-base font-mono">{(selectedPlano as any).vindi_product_id}</div>
                          </div>
                        )}
                        {(selectedPlano as any).vindi_plan_id && (
                          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <div className="text-xs font-medium text-blue-700 mb-1">ID do Plano</div>
                            <div className="text-base font-mono">{(selectedPlano as any).vindi_plan_id}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Valores Financeiros */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-sm border-b pb-2">Valores Financeiros</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                      <Label className="text-sm font-medium text-muted-foreground">Valor do Plano</Label>
                      <div className="text-2xl font-bold text-primary">R$ {selectedPlano.valor.toFixed(2)}</div>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                      <Label className="text-sm font-medium text-muted-foreground">Custo do Plano</Label>
                      <div className="text-2xl font-bold">R$ {selectedPlano.custo?.toFixed(2) || "0,00"}</div>
                    </div>
                  </div>
                </div>

                {/* Percentuais de Comissão */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-sm border-b pb-2">Percentuais de Comissão</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <Label className="text-sm font-medium text-green-700">Comissão de Adesão</Label>
                      <div className="text-2xl font-bold text-green-700">{selectedPlano.comissao_adesao_percentual || 100}%</div>
                      <div className="text-sm text-green-600 mt-1">Aplicada na primeira parcela</div>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <Label className="text-sm font-medium text-blue-700">Comissão Recorrente</Label>
                      <div className="text-2xl font-bold text-blue-700">{selectedPlano.comissao_recorrente_percentual || 30}%</div>
                      <div className="text-sm text-blue-600 mt-1">Aplicada nas mensalidades</div>
                    </div>
                  </div>
                </div>

                {/* Cálculos Automáticos */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-sm border-b pb-2">Cálculos Automáticos</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <Label className="text-sm font-medium text-green-700">Comissão de Adesão</Label>
                      <div className="text-xl font-bold text-green-700">
                        R$ {(selectedPlano.valor * (selectedPlano.comissao_adesao_percentual || 100) / 100).toFixed(2)}
                      </div>
                      <div className="text-xs text-green-600 mt-1">
                        {selectedPlano.comissao_adesao_percentual || 100}% de R$ {selectedPlano.valor.toFixed(2)}
                      </div>
                    </div>
                    
                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <Label className="text-sm font-medium text-blue-700">Comissão Recorrente</Label>
                      <div className="text-xl font-bold text-blue-700">
                        R$ {(selectedPlano.valor * (selectedPlano.comissao_recorrente_percentual || 30) / 100).toFixed(2)}
                      </div>
                      <div className="text-xs text-blue-600 mt-1">
                        {selectedPlano.comissao_recorrente_percentual || 30}% de R$ {selectedPlano.valor.toFixed(2)}
                      </div>
                    </div>

                    <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                      <Label className="text-sm font-medium text-primary">Valor Líquido Recorrente</Label>
                      <div className="text-xl font-bold text-primary">
                        R$ {(
                          selectedPlano.valor - 
                          (selectedPlano.custo || 0) - 
                          (selectedPlano.valor * (selectedPlano.comissao_recorrente_percentual || 30) / 100)
                        ).toFixed(2)}
                      </div>
                      <div className="text-xs text-primary/70 mt-1">
                        Valor - Custo - Comissão
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {planos.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Nenhum plano cadastrado
            </h3>
            <p className="text-muted-foreground text-center mb-4">
              Comece criando seu primeiro plano de benefício
            </p>
            <Button onClick={() => abrirFormulario()}>
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeiro Plano
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}