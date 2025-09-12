import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, CheckCircle, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface DadosImportacao {
  nome: string;
  cpf: string;
  email: string;
  telefone: string;
  dataNascimento: string;
  cep: string;
  numero: string;
  cidade: string;
  estado: string;
  planoId: string;
  observacoes?: string;
}

interface PreviewDadosProps {
  dados: DadosImportacao[];
  onConfirmar: () => void;
  onVoltar: () => void;
  processando: boolean;
  progresso: number;
}

export function PreviewDados({ dados, onConfirmar, onVoltar, processando, progresso }: PreviewDadosProps) {
  const validarCPF = (cpf: string): boolean => {
    // Remover caracteres não numéricos
    const cpfLimpo = cpf.replace(/\D/g, '');
    
    // Verificar se tem 11 dígitos
    if (cpfLimpo.length !== 11) return false;
    
    // Verificar se não são todos iguais
    if (/^(\d)\1{10}$/.test(cpfLimpo)) return false;
    
    // Validação dos dígitos verificadores
    let soma = 0;
    for (let i = 0; i < 9; i++) {
      soma += parseInt(cpfLimpo.charAt(i)) * (10 - i);
    }
    let resto = 11 - (soma % 11);
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpfLimpo.charAt(9))) return false;
    
    soma = 0;
    for (let i = 0; i < 10; i++) {
      soma += parseInt(cpfLimpo.charAt(i)) * (11 - i);
    }
    resto = 11 - (soma % 11);
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpfLimpo.charAt(10))) return false;
    
    return true;
  };

  const validarEmail = (email: string): boolean => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const validarLinha = (item: DadosImportacao) => {
    const erros = [];
    
    if (!item.nome?.trim()) erros.push("Nome obrigatório");
    if (!validarCPF(item.cpf)) erros.push("CPF inválido");
    if (!validarEmail(item.email)) erros.push("Email inválido");
    if (!item.telefone?.trim()) erros.push("Telefone obrigatório");
    if (!item.dataNascimento?.trim()) erros.push("Data nascimento obrigatória");
    if (!item.cep?.trim()) erros.push("CEP obrigatório");
    if (!item.cidade?.trim()) erros.push("Cidade obrigatória");
    if (!item.estado?.trim()) erros.push("Estado obrigatório");
    if (!item.planoId?.trim()) erros.push("Plano ID obrigatório");
    
    return erros;
  };

  const dadosValidados = dados.map((item, index) => ({
    ...item,
    linha: index + 1,
    erros: validarLinha(item),
    valido: validarLinha(item).length === 0
  }));

  const totalValidos = dadosValidados.filter(item => item.valido).length;
  const totalInvalidos = dadosValidados.filter(item => !item.valido).length;

  if (processando) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Processando Importação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={progresso} className="w-full" />
            <p className="text-center text-muted-foreground">
              {progresso < 100 ? "Processando adesões..." : "Importação concluída!"}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onVoltar}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div className="flex gap-4">
          <Badge variant="secondary" className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            {totalValidos} válidos
          </Badge>
          {totalInvalidos > 0 && (
            <Badge variant="destructive" className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {totalInvalidos} com erro
            </Badge>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Prévia dos Dados - {dados.length} registros</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96 w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Linha</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>CPF</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Cidade/UF</TableHead>
                  <TableHead>Erros</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dadosValidados.map((item) => (
                  <TableRow key={item.linha}>
                    <TableCell>{item.linha}</TableCell>
                    <TableCell>
                      {item.valido ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-600" />
                      )}
                    </TableCell>
                    <TableCell>{item.nome}</TableCell>
                    <TableCell>{item.cpf}</TableCell>
                    <TableCell>{item.email}</TableCell>
                    <TableCell>{item.telefone}</TableCell>
                    <TableCell>{item.cidade}/{item.estado}</TableCell>
                    <TableCell>
                      {item.erros.length > 0 && (
                        <div className="text-xs text-red-600">
                          {item.erros.join(", ")}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={onVoltar}>
          Cancelar
        </Button>
        <Button 
          onClick={onConfirmar} 
          disabled={totalValidos === 0}
        >
          Confirmar Importação ({totalValidos} registros)
        </Button>
      </div>
    </div>
  );
}