import { Building2, MapPin, Phone, Mail, Globe, Eye, Edit, Trash2 } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Empresa, useEmpresas } from '@/hooks/useEmpresas';
import { useState } from 'react';
import { EmpresaFormModal } from './EmpresaFormModal';

interface EmpresaCardProps {
  empresa: Empresa;
  onViewDetails: () => void;
}

export const EmpresaCard = ({ empresa, onViewDetails }: EmpresaCardProps) => {
  const { deleteEmpresa } = useEmpresas();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const handleDelete = async () => {
    await deleteEmpresa.mutateAsync(empresa.id);
  };

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
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground truncate">
                  {empresa.nome_fantasia || empresa.razao_social}
                </h3>
                {empresa.nome_fantasia && (
                  <p className="text-sm text-muted-foreground truncate">
                    {empresa.razao_social}
                  </p>
                )}
              </div>
            </div>
            {getStatusBadge(empresa.status)}
          </div>
        </CardHeader>

        <CardContent className="pb-3 space-y-3">
          <div className="text-sm text-muted-foreground">
            <strong>CNPJ:</strong> {empresa.cnpj}
          </div>

          {empresa.endereco && (
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">
                {empresa.cidade && empresa.estado 
                  ? `${empresa.cidade}, ${empresa.estado}`
                  : empresa.endereco
                }
              </span>
            </div>
          )}

          {empresa.telefone && (
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Phone className="h-4 w-4 flex-shrink-0" />
              <span>{empresa.telefone}</span>
            </div>
          )}

          {empresa.email && (
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{empresa.email}</span>
            </div>
          )}

          {empresa.website && (
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Globe className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{empresa.website}</span>
            </div>
          )}
        </CardContent>

        <CardFooter className="pt-3 border-t">
          <div className="flex gap-2 w-full">
            <Button variant="outline" size="sm" onClick={onViewDetails} className="flex-1">
              <Eye className="h-4 w-4 mr-1" />
              Detalhes
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsEditModalOpen(true)}>
              <Edit className="h-4 w-4" />
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja excluir a empresa "{empresa.nome_fantasia || empresa.razao_social}"? 
                    Esta ação não pode ser desfeita e também excluirá todos os responsáveis e colaboradores relacionados.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={handleDelete}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Excluir
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardFooter>
      </Card>

      <EmpresaFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        empresa={empresa}
      />
    </>
  );
};