import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Building2, MapPin, Phone, Mail, Globe, Edit } from 'lucide-react';
import { useEmpresas } from '@/hooks/useEmpresas';
import { EmpresaFormModal } from './EmpresaFormModal';
import { ResponsaveisTab } from './ResponsaveisTab';
import { ColaboradoresTab } from './ColaboradoresTab';

interface DetalhesEmpresaModalProps {
  empresaId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export const DetalhesEmpresaModal = ({ empresaId, isOpen, onClose }: DetalhesEmpresaModalProps) => {
  const { getEmpresaById } = useEmpresas();
  const [empresa, setEmpresa] = useState<any>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load empresa data when modal opens
  useEffect(() => {
    if (empresaId && isOpen) {
      setLoading(true);
      getEmpresaById(empresaId)
        .then((data) => {
          setEmpresa(data);
          setLoading(false);
        })
        .catch((error) => {
          console.error('Erro ao carregar empresa:', error);
          setEmpresa(null);
          setLoading(false);
        });
    } else if (!isOpen) {
      // Limpar estado quando modal fechar
      setEmpresa(null);
      setLoading(false);
    }
  }, [empresaId, isOpen]);

  if (!isOpen || !empresaId) return null;

  if (loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <div className="flex justify-center items-center h-64">
            <p className="text-muted-foreground">Carregando dados da empresa...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!empresa) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <div className="flex justify-center items-center h-64">
            <p className="text-muted-foreground">Empresa não encontrada.</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ativo':
        return <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100">Ativo</Badge>;
      case 'inativo':
        return <Badge variant="secondary" className="bg-red-100 text-red-800 hover:bg-red-100">Inativo</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <DialogTitle className="text-xl">
                    {empresa.nome_fantasia || empresa.razao_social}
                  </DialogTitle>
                  {empresa.nome_fantasia && (
                    <p className="text-sm text-muted-foreground">
                      {empresa.razao_social}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {getStatusBadge(empresa.status)}
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setIsEditModalOpen(true)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              </div>
            </div>
          </DialogHeader>

          <Tabs defaultValue="detalhes" className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="grid w-full grid-cols-4 flex-shrink-0">
              <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
              <TabsTrigger value="responsaveis">Responsáveis</TabsTrigger>
              <TabsTrigger value="colaboradores">Colaboradores</TabsTrigger>
              <TabsTrigger value="orcamentos">Orçamentos</TabsTrigger>
            </TabsList>

            <TabsContent value="detalhes" className="flex-1 overflow-y-auto space-y-6 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-foreground mb-3">Informações Básicas</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">CNPJ</label>
                        <p className="text-foreground">{empresa.cnpj}</p>
                      </div>
                      {empresa.inscricao_estadual && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Inscrição Estadual</label>
                          <p className="text-foreground">{empresa.inscricao_estadual}</p>
                        </div>
                      )}
                      {empresa.inscricao_municipal && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Inscrição Municipal</label>
                          <p className="text-foreground">{empresa.inscricao_municipal}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {empresa.endereco && (
                    <div>
                      <h3 className="font-semibold text-foreground mb-3">Endereço</h3>
                      <div className="space-y-2">
                        <div className="flex items-start space-x-2">
                          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-foreground">{empresa.endereco}</p>
                            {empresa.cidade && empresa.estado && (
                              <p className="text-muted-foreground">
                                {empresa.cidade}, {empresa.estado}
                                {empresa.cep && ` - ${empresa.cep}`}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold text-foreground mb-3">Contato</h3>
                    <div className="space-y-3">
                      {empresa.telefone && (
                        <div className="flex items-center space-x-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span className="text-foreground">{empresa.telefone}</span>
                        </div>
                      )}
                      {empresa.email && (
                        <div className="flex items-center space-x-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="text-foreground">{empresa.email}</span>
                        </div>
                      )}
                      {empresa.website && (
                        <div className="flex items-center space-x-2">
                          <Globe className="h-4 w-4 text-muted-foreground" />
                          <a 
                            href={empresa.website} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            {empresa.website}
                          </a>
                        </div>
                      )}
                    </div>
                  </div>

                  {empresa.observacoes && (
                    <div>
                      <h3 className="font-semibold text-foreground mb-3">Observações</h3>
                      <p className="text-foreground bg-muted p-3 rounded-lg">
                        {empresa.observacoes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="responsaveis" className="flex-1 overflow-y-auto mt-4">
              <ResponsaveisTab empresaId={empresaId} />
            </TabsContent>

            <TabsContent value="colaboradores" className="flex-1 overflow-y-auto mt-4">
              <ColaboradoresTab empresaId={empresaId} />
            </TabsContent>

            <TabsContent value="orcamentos" className="flex-1 overflow-y-auto mt-4">
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  Funcionalidade de orçamentos será implementada em breve.
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <EmpresaFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        empresa={empresa}
      />
    </>
  );
};