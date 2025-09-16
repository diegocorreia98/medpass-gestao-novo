import { useState } from 'react';
import { Plus, Search, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEmpresas } from '@/hooks/useEmpresas';
import { useUnidades } from '@/hooks/useUnidades';
import { useAuth } from '@/contexts/AuthContext';
import { EmpresaCard } from '@/components/empresas/EmpresaCard';
import { EmpresaFormModal } from '@/components/empresas/EmpresaFormModal';
import { DetalhesEmpresaModal } from '@/components/empresas/DetalhesEmpresaModal';

export const GestaoEmpresas = () => {
  const { profile } = useAuth();
  const { unidades } = useUnidades();
  const unidadeDoUsuario = unidades?.[0]; // Para usuário de unidade, sempre há apenas uma unidade

  // Filtrar empresas por unidade se for usuário de unidade
  const { empresas, isLoading } = useEmpresas({
    unidadeId: profile?.user_type === 'unidade' ? unidadeDoUsuario?.id : undefined
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [selectedEmpresa, setSelectedEmpresa] = useState<string | null>(null);

  const filteredEmpresas = empresas.filter((empresa) => {
    const matchesSearch = 
      empresa.razao_social.toLowerCase().includes(searchTerm.toLowerCase()) ||
      empresa.nome_fantasia?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      empresa.cnpj.includes(searchTerm);

    const matchesStatus = statusFilter === 'todos' || empresa.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <p className="text-muted-foreground">Carregando empresas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gestão de Empresas</h1>
          <p className="text-muted-foreground mt-1">
            {profile?.user_type === 'unidade'
              ? `Gerencie empresas da sua unidade: ${unidadeDoUsuario?.nome || 'Carregando...'}`
              : 'Gerencie empresas e seus responsáveis para orçamentos PJ'
            }
          </p>
        </div>
        <Button onClick={() => setIsFormModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Empresa
        </Button>
      </div>

      <div className="flex gap-4 items-center">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar por razão social, nome fantasia ou CNPJ..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os Status</SelectItem>
            <SelectItem value="ativo">Ativo</SelectItem>
            <SelectItem value="inativo">Inativo</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredEmpresas.length === 0 ? (
        <div className="text-center py-12">
          <div className="mb-4">
            <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center">
              <Plus className="h-12 w-12 text-muted-foreground" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-foreground mb-2">
            {searchTerm || statusFilter !== 'todos' 
              ? 'Nenhuma empresa encontrada' 
              : 'Nenhuma empresa cadastrada'
            }
          </h3>
          <p className="text-muted-foreground mb-6">
            {searchTerm || statusFilter !== 'todos'
              ? 'Tente ajustar os filtros de busca.'
              : 'Comece cadastrando sua primeira empresa para gerar orçamentos PJ.'
            }
          </p>
          {!searchTerm && statusFilter === 'todos' && (
            <Button onClick={() => setIsFormModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Cadastrar Primeira Empresa
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEmpresas.map((empresa) => (
            <EmpresaCard
              key={empresa.id}
              empresa={empresa}
              onViewDetails={() => setSelectedEmpresa(empresa.id)}
            />
          ))}
        </div>
      )}

      <EmpresaFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        unidadeId={profile?.user_type === 'unidade' ? unidadeDoUsuario?.id : undefined}
      />

      <DetalhesEmpresaModal
        empresaId={selectedEmpresa}
        isOpen={!!selectedEmpresa}
        onClose={() => setSelectedEmpresa(null)}
      />
    </div>
  );
};