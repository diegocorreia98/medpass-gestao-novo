import { useState } from 'react';
import { Plus, Edit, Trash2, Users, Phone, Mail, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useColaboradoresEmpresa } from '@/hooks/useColaboradoresEmpresa';
import { ColaboradorFormModal } from './ColaboradorFormModal';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ColaboradoresTabProps {
  empresaId: string;
}

export const ColaboradoresTab = ({ empresaId }: ColaboradoresTabProps) => {
  const { colaboradores, isLoading, deleteColaborador } = useColaboradoresEmpresa(empresaId);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingColaborador, setEditingColaborador] = useState<any>(null);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ativo':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Ativo</Badge>;
      case 'inativo':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Inativo</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const handleDelete = async (id: string) => {
    await deleteColaborador.mutateAsync(id);
  };

  const handleEdit = (colaborador: any) => {
    setEditingColaborador(colaborador);
    setIsFormModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsFormModalOpen(false);
    setEditingColaborador(null);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-32">
        <p className="text-muted-foreground">Carregando colaboradores...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-foreground">Colaboradores da Empresa</h3>
        <Button onClick={() => setIsFormModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Colaborador
        </Button>
      </div>

      {colaboradores.length === 0 ? (
        <div className="text-center py-8">
          <div className="mb-4">
            <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>
          <h4 className="text-lg font-medium text-foreground mb-2">Nenhum colaborador cadastrado</h4>
          <p className="text-muted-foreground mb-4">
            Adicione colaboradores para controle e gestão da empresa
          </p>
          <Button onClick={() => setIsFormModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Primeiro Colaborador
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {colaboradores.map((colaborador) => (
            <Card key={colaborador.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">{colaborador.nome}</h4>
                      {colaborador.cargo && (
                        <p className="text-sm text-muted-foreground">{colaborador.cargo}</p>
                      )}
                    </div>
                  </div>
                  {getStatusBadge(colaborador.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {colaborador.cpf && (
                  <div className="text-sm">
                    <span className="font-medium text-muted-foreground">CPF:</span> {colaborador.cpf}
                  </div>
                )}
                {colaborador.telefone && (
                  <div className="flex items-center space-x-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{colaborador.telefone}</span>
                  </div>
                )}
                {colaborador.email && (
                  <div className="flex items-center space-x-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{colaborador.email}</span>
                  </div>
                )}
                {colaborador.data_admissao && (
                  <div className="flex items-center space-x-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>
                      Admitido em {format(new Date(colaborador.data_admissao), 'dd/MM/yyyy', { locale: ptBR })}
                    </span>
                  </div>
                )}
                {colaborador.observacoes && (
                  <p className="text-sm text-muted-foreground">{colaborador.observacoes}</p>
                )}
                <div className="flex gap-2 pt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleEdit(colaborador)}
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
                          Tem certeza que deseja remover o colaborador "{colaborador.nome}"?
                          Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(colaborador.id)}
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

      <ColaboradorFormModal
        isOpen={isFormModalOpen}
        onClose={handleCloseModal}
        empresaId={empresaId}
        colaborador={editingColaborador}
      />
    </div>
  );
};