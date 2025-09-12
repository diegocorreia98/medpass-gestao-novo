import { useState } from 'react';
import { Plus, Edit, Trash2, User, Phone, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useResponsaveisEmpresa } from '@/hooks/useResponsaveisEmpresa';
import { ResponsavelFormModal } from './ResponsavelFormModal';

interface ResponsaveisTabProps {
  empresaId: string;
}

export const ResponsaveisTab = ({ empresaId }: ResponsaveisTabProps) => {
  const { responsaveis, isLoading, deleteResponsavel } = useResponsaveisEmpresa(empresaId);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingResponsavel, setEditingResponsavel] = useState<any>(null);

  const getTipoResponsabilidadeBadge = (tipo: string) => {
    const badges = {
      financeiro: <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Financeiro</Badge>,
      juridico: <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Jurídico</Badge>,
      geral: <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Geral</Badge>,
      outros: <Badge variant="outline">Outros</Badge>,
    };
    return badges[tipo as keyof typeof badges] || <Badge variant="outline">{tipo}</Badge>;
  };

  const handleDelete = async (id: string) => {
    await deleteResponsavel.mutateAsync(id);
  };

  const handleEdit = (responsavel: any) => {
    setEditingResponsavel(responsavel);
    setIsFormModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsFormModalOpen(false);
    setEditingResponsavel(null);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-32">
        <p className="text-muted-foreground">Carregando responsáveis...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-foreground">Responsáveis da Empresa</h3>
        <Button onClick={() => setIsFormModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Responsável
        </Button>
      </div>

      {responsaveis.length === 0 ? (
        <div className="text-center py-8">
          <div className="mb-4">
            <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
              <User className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>
          <h4 className="text-lg font-medium text-foreground mb-2">Nenhum responsável cadastrado</h4>
          <p className="text-muted-foreground mb-4">
            Adicione responsáveis para esta empresa (financeiro, jurídico, geral, etc.)
          </p>
          <Button onClick={() => setIsFormModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Primeiro Responsável
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {responsaveis.map((responsavel) => (
            <Card key={responsavel.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">{responsavel.nome}</h4>
                      {responsavel.cargo && (
                        <p className="text-sm text-muted-foreground">{responsavel.cargo}</p>
                      )}
                    </div>
                  </div>
                  {getTipoResponsabilidadeBadge(responsavel.tipo_responsabilidade)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {responsavel.telefone && (
                  <div className="flex items-center space-x-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{responsavel.telefone}</span>
                  </div>
                )}
                {responsavel.email && (
                  <div className="flex items-center space-x-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{responsavel.email}</span>
                  </div>
                )}
                {responsavel.observacoes && (
                  <p className="text-sm text-muted-foreground">{responsavel.observacoes}</p>
                )}
                <div className="flex gap-2 pt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleEdit(responsavel)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja remover o responsável "{responsavel.nome}"?
                          Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(responsavel.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Remover
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ResponsavelFormModal
        isOpen={isFormModalOpen}
        onClose={handleCloseModal}
        empresaId={empresaId}
        responsavel={editingResponsavel}
      />
    </div>
  );
};