import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useBeneficiarios } from "@/hooks/useBeneficiarios";
import { usePlanos } from "@/hooks/usePlanos";
import type { BeneficiarioCompleto, BeneficiarioUpdate } from "@/types/database";

interface EditarAdesaoModalProps {
  open: boolean;
  onClose: () => void;
  beneficiario?: BeneficiarioCompleto;
}

export function EditarAdesaoModal({ open, onClose, beneficiario }: EditarAdesaoModalProps) {
  const { toast } = useToast();
  const { planos, isLoading: isLoadingPlanos } = usePlanos();
  const { updateBeneficiario, isUpdating } = useBeneficiarios();

  const [formData, setFormData] = useState({
    nome: "",
    cpf: "",
    email: "",
    telefone: "",
    data_nascimento: "",
    endereco: "",
    numero_endereco: "",
    cidade: "",
    estado: "",
    cep: "",
    plano_id: "",
    observacoes: "",
    id_beneficiario_tipo: 1,
  });

  const estadosBrasil = [
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
    "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
    "RS", "RO", "RR", "SC", "SP", "SE", "TO"
  ];

  useEffect(() => {
    if (beneficiario && open) {
      setFormData({
        nome: beneficiario.nome || "",
        cpf: beneficiario.cpf || "",
        email: beneficiario.email || "",
        telefone: beneficiario.telefone || "",
        data_nascimento: beneficiario.data_nascimento || "",
        endereco: beneficiario.endereco || "",
        numero_endereco: "", // Will be added from database later
        cidade: beneficiario.cidade || "",
        estado: beneficiario.estado || "",
        cep: beneficiario.cep || "",
        plano_id: beneficiario.plano_id || "",
        observacoes: beneficiario.observacoes || "",
        id_beneficiario_tipo: 1, // Will be added from database later
      });
    }
  }, [beneficiario, open]);

  const handleSubmit = async () => {
    if (!beneficiario) return;

    if (!formData.nome || !formData.cpf || !formData.email || !formData.plano_id) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios (*)",
        variant: "destructive"
      });
      return;
    }

    const planoSelecionado = planos.find(p => p.id === formData.plano_id);
    if (!planoSelecionado) {
      toast({
        title: "Erro",
        description: "Plano selecionado não encontrado",
        variant: "destructive"
      });
      return;
    }

    const updates: BeneficiarioUpdate = {
      nome: formData.nome,
      cpf: formData.cpf.replace(/\D/g, ''),
      email: formData.email,
      telefone: formData.telefone || null,
      data_nascimento: formData.data_nascimento || null,
      endereco: formData.endereco || null,
      cidade: formData.cidade || null,
      estado: formData.estado || null,
      cep: formData.cep || null,
      plano_id: formData.plano_id,
      valor_plano: Number(planoSelecionado.valor),
      observacoes: formData.observacoes || null,
    };

    try {
      await updateBeneficiario.mutateAsync({ id: beneficiario.id, updates });
      onClose();
    } catch (error) {
      // Erro já tratado no hook
    }
  };

  const buscarCEP = async (cep: string) => {
    if (cep.length === 8) {
      try {
        const { buscarCEPSeguro } = await import('@/utils/apiSecurity');
        const result = await buscarCEPSeguro(cep);
        
        if (result.success && result.data) {
          setFormData({
            ...formData,
            cep: result.data.cep,
            endereco: result.data.logradouro ? `${result.data.logradouro}, ${result.data.bairro}` : '',
            cidade: result.data.localidade,
            estado: result.data.uf,
          });
        }
      } catch (error) {
        console.error('Erro ao buscar CEP:', error);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Editar Beneficiário
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Dados Pessoais */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Dados Pessoais</h4>
            
            <div>
              <Label htmlFor="nome">Nome Completo *</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Nome completo"
              />
            </div>

            <div>
              <Label htmlFor="cpf">CPF *</Label>
              <Input
                id="cpf"
                value={formData.cpf}
                onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                placeholder="000.000.000-00"
              />
            </div>

            <div>
              <Label htmlFor="email">E-mail *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="email@exemplo.com"
              />
            </div>

            <div>
              <Label htmlFor="telefone">Telefone</Label>
              <Input
                id="telefone"
                value={formData.telefone}
                onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                placeholder="(11) 99999-9999"
              />
            </div>

            <div>
              <Label htmlFor="data_nascimento">Data de Nascimento</Label>
              <Input
                id="data_nascimento"
                type="date"
                value={formData.data_nascimento}
                onChange={(e) => setFormData({ ...formData, data_nascimento: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="observacoes">Observações</Label>
              <Input
                id="observacoes"
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                placeholder="Observações gerais"
              />
            </div>
          </div>

          {/* Endereço e Plano */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Endereço</h4>
            
            <div>
              <Label htmlFor="cep">CEP</Label>
              <Input
                id="cep"
                value={formData.cep}
                onChange={(e) => {
                  const cep = e.target.value.replace(/\D/g, '');
                  setFormData({ ...formData, cep });
                  if (cep.length === 8) {
                    buscarCEP(cep);
                  }
                }}
                placeholder="00000-000"
              />
            </div>

            <div>
              <Label htmlFor="endereco">Endereço Completo</Label>
              <Input
                id="endereco"
                value={formData.endereco}
                onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                placeholder="Rua, bairro"
              />
            </div>

            <div>
              <Label htmlFor="numero_endereco">Número *</Label>
              <Input
                id="numero_endereco"
                value={formData.numero_endereco}
                onChange={(e) => setFormData({ ...formData, numero_endereco: e.target.value })}
                placeholder="Número"
              />
            </div>

            <div>
              <Label htmlFor="cidade">Cidade</Label>
              <Input
                id="cidade"
                value={formData.cidade}
                onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                placeholder="Nome da cidade"
              />
            </div>

            <div>
              <Label htmlFor="estado">Estado</Label>
              <Select
                value={formData.estado}
                onValueChange={(value) => setFormData({ ...formData, estado: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Estado..." />
                </SelectTrigger>
                <SelectContent>
                  {estadosBrasil.map((estado) => (
                    <SelectItem key={estado} value={estado}>{estado}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <h4 className="font-semibold text-foreground pt-4">Beneficiário e Plano</h4>

            <div>
              <Label htmlFor="id_beneficiario_tipo">Tipo de Beneficiário *</Label>
              <Select
                value={formData.id_beneficiario_tipo.toString()}
                onValueChange={(value) => setFormData({ ...formData, id_beneficiario_tipo: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">TITULAR</SelectItem>
                  <SelectItem value="3">DEPENDENTE</SelectItem>
                  <SelectItem value="5">RESPONSÁVEL FINANCEIRO</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="plano_id">Tipo de Plano *</Label>
              <Select
                value={formData.plano_id}
                onValueChange={(value) => setFormData({ ...formData, plano_id: value })}
                disabled={isLoadingPlanos}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o plano..." />
                </SelectTrigger>
                <SelectContent>
                  {planos.map((plano) => (
                    <SelectItem key={plano.id} value={plano.id}>
                      {plano.nome} - R$ {Number(plano.valor).toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={isUpdating}
          >
            {isUpdating ? (
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salvar Alterações
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}