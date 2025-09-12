import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { UserPlus, X, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export interface DependenteFormData {
  nome: string;
  cpf: string;
  data_nascimento: string;
  telefone: string;
  email: string;
  observacoes: string;
}

interface DependentesFormProps {
  dependentes: DependenteFormData[];
  onDependentesChange: (dependentes: DependenteFormData[]) => void;
  disabled?: boolean;
}

const dependenteVazio: DependenteFormData = {
  nome: "",
  cpf: "",
  data_nascimento: "",
  telefone: "",
  email: "",
  observacoes: ""
};

export function DependentesForm({ dependentes, onDependentesChange, disabled = false }: DependentesFormProps) {
  const { toast } = useToast();

  const adicionarDependente = () => {
    if (dependentes.length >= 3) {
      toast({
        title: "Limite atingido",
        description: "Máximo de 3 dependentes permitidos",
        variant: "destructive"
      });
      return;
    }
    
    onDependentesChange([...dependentes, { ...dependenteVazio }]);
  };

  const removerDependente = (index: number) => {
    const novosDependentes = dependentes.filter((_, i) => i !== index);
    onDependentesChange(novosDependentes);
  };

  const atualizarDependente = (index: number, campo: keyof DependenteFormData, valor: string) => {
    const novosDependentes = [...dependentes];
    novosDependentes[index] = {
      ...novosDependentes[index],
      [campo]: valor
    };
    onDependentesChange(novosDependentes);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Dependentes do Plano Familiar
        </CardTitle>
        <CardDescription>
          Adicione até 3 dependentes ao plano familiar (não obrigatório)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {dependentes.map((dependente, index) => (
          <div key={index} className="relative border rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Dependente {index + 1}</h4>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removerDependente(index)}
                disabled={disabled}
                className="text-destructive hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor={`dependente-nome-${index}`}>Nome Completo *</Label>
                <Input
                  id={`dependente-nome-${index}`}
                  value={dependente.nome}
                  onChange={(e) => atualizarDependente(index, 'nome', e.target.value)}
                  placeholder="Nome completo do dependente"
                  disabled={disabled}
                />
              </div>

              <div>
                <Label htmlFor={`dependente-cpf-${index}`}>CPF *</Label>
                <Input
                  id={`dependente-cpf-${index}`}
                  value={dependente.cpf}
                  onChange={(e) => atualizarDependente(index, 'cpf', e.target.value)}
                  placeholder="000.000.000-00"
                  disabled={disabled}
                />
              </div>

              <div>
                <Label htmlFor={`dependente-nascimento-${index}`}>Data de Nascimento *</Label>
                <Input
                  id={`dependente-nascimento-${index}`}
                  type="date"
                  value={dependente.data_nascimento}
                  onChange={(e) => atualizarDependente(index, 'data_nascimento', e.target.value)}
                  disabled={disabled}
                />
              </div>

              <div>
                <Label htmlFor={`dependente-telefone-${index}`}>Telefone *</Label>
                <Input
                  id={`dependente-telefone-${index}`}
                  value={dependente.telefone}
                  onChange={(e) => atualizarDependente(index, 'telefone', e.target.value)}
                  placeholder="(11) 99999-9999"
                  disabled={disabled}
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor={`dependente-email-${index}`}>E-mail *</Label>
                <Input
                  id={`dependente-email-${index}`}
                  type="email"
                  value={dependente.email}
                  onChange={(e) => atualizarDependente(index, 'email', e.target.value)}
                  placeholder="email@exemplo.com"
                  disabled={disabled}
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor={`dependente-observacoes-${index}`}>Observações</Label>
                <Input
                  id={`dependente-observacoes-${index}`}
                  value={dependente.observacoes}
                  onChange={(e) => atualizarDependente(index, 'observacoes', e.target.value)}
                  placeholder="Observações adicionais"
                  disabled={disabled}
                />
              </div>
            </div>
          </div>
        ))}

        {dependentes.length < 3 && (
          <>
            {dependentes.length > 0 && <Separator />}
            <Button
              type="button"
              variant="outline"
              onClick={adicionarDependente}
              disabled={disabled}
              className="w-full"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Adicionar Dependente ({dependentes.length}/3)
            </Button>
          </>
        )}

        {dependentes.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-sm">Nenhum dependente adicionado</p>
            <p className="text-xs">Clique no botão acima para adicionar dependentes</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}