import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, MoreVertical, Power } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Franquia } from "@/hooks/useFranquias";

interface FranquiaCardProps {
  franquia: Franquia;
  onEdit: (franquia: Franquia) => void;
  onToggleStatus: (id: string) => void;
  canManage: boolean;
}

export function FranquiaCard({ franquia, onEdit, onToggleStatus, canManage }: FranquiaCardProps) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{franquia.nome}</CardTitle>
            {franquia.descricao && (
              <CardDescription className="mt-1">
                {franquia.descricao}
              </CardDescription>
            )}
          </div>
          {canManage && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit(franquia)}>
                  <Edit className="mr-2 h-4 w-4" />
                  Editar
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onToggleStatus(franquia.id)}>
                  <Power className="mr-2 h-4 w-4" />
                  {franquia.ativo ? 'Desativar' : 'Ativar'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Status:</span>
            <Badge variant={franquia.ativo ? "default" : "secondary"}>
              {franquia.ativo ? "Ativa" : "Inativa"}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Criada em:</span>
            <span className="text-sm">
              {new Date(franquia.created_at).toLocaleDateString('pt-BR')}
            </span>
          </div>
        </div>
      </CardContent>

      {canManage && (
        <CardFooter className="pt-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onEdit(franquia)}
            className="w-full"
          >
            <Edit className="mr-2 h-4 w-4" />
            Editar Franquia
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}