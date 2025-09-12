import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FranquiaCard } from "@/components/franquias/FranquiaCard";
import { FranquiaForm } from "@/components/franquias/FranquiaForm";
import { useFranquias, type Franquia, type FranquiaInsert } from "@/hooks/useFranquias";

export default function Franquias() {
  const { 
    todasFranquias, 
    isLoading, 
    createFranquia, 
    updateFranquia, 
    deactivateFranquia,
    canManage,
    isCreating,
    isUpdating 
  } = useFranquias();

  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFranquia, setEditingFranquia] = useState<Franquia | null>(null);

  // Filtrar franquias com base na busca
  const filteredFranquias = todasFranquias.filter(franquia =>
    franquia.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    franquia.descricao?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (data: FranquiaInsert) => {
    if (editingFranquia) {
      await updateFranquia.mutateAsync({
        id: editingFranquia.id,
        updates: data
      });
    } else {
      await createFranquia.mutateAsync(data);
    }
    setIsDialogOpen(false);
    setEditingFranquia(null);
  };

  const handleEdit = (franquia: Franquia) => {
    setEditingFranquia(franquia);
    setIsDialogOpen(true);
  };

  const handleToggleStatus = async (id: string) => {
    const franquia = todasFranquias.find(f => f.id === id);
    if (franquia) {
      if (franquia.ativo) {
        await deactivateFranquia.mutateAsync(id);
      } else {
        await updateFranquia.mutateAsync({
          id,
          updates: { ativo: true }
        });
      }
    }
  };

  const openAddDialog = () => {
    setEditingFranquia(null);
    setIsDialogOpen(true);
  };

  // Estatísticas
  const totalFranquias = todasFranquias.length;
  const franquiasAtivas = todasFranquias.filter(f => f.ativo).length;
  const franquiasInativas = totalFranquias - franquiasAtivas;

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-48"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 bg-muted rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Franquias</h1>
          <p className="text-muted-foreground">
            Gerencie as franquias do sistema
          </p>
        </div>
        {canManage && (
          <Button onClick={openAddDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Franquia
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar franquias..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalFranquias}</div>
            <p className="text-xs text-muted-foreground">franquias cadastradas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Ativas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{franquiasAtivas}</div>
            <p className="text-xs text-muted-foreground">franquias ativas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Inativas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{franquiasInativas}</div>
            <p className="text-xs text-muted-foreground">franquias inativas</p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Franquias */}
      {filteredFranquias.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">
                {searchTerm ? 'Nenhuma franquia encontrada' : 'Nenhuma franquia cadastrada'}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm 
                  ? 'Tente ajustar os termos de busca.'
                  : 'Comece criando sua primeira franquia.'
                }
              </p>
              {canManage && !searchTerm && (
                <Button onClick={openAddDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar primeira franquia
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFranquias.map((franquia) => (
            <FranquiaCard
              key={franquia.id}
              franquia={franquia}
              onEdit={handleEdit}
              onToggleStatus={handleToggleStatus}
              canManage={canManage}
            />
          ))}
        </div>
      )}

      {/* Dialog de Criação/Edição */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingFranquia ? 'Editar Franquia' : 'Nova Franquia'}
            </DialogTitle>
            <DialogDescription>
              {editingFranquia 
                ? 'Edite os dados da franquia abaixo.'
                : 'Preencha os dados da nova franquia.'
              }
            </DialogDescription>
          </DialogHeader>
          <FranquiaForm
            franquia={editingFranquia || undefined}
            onSubmit={handleSubmit}
            isLoading={isCreating || isUpdating}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}