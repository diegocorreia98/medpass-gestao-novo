import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle, XCircle, AlertCircle, Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface RelatorioImportacaoProps {
  relatorio: {
    sucessos: number;
    erros: number;
    warnings: number;
    total: number;
    detalhes: Array<{
      linha: number;
      nome: string;
      cpf: string;
      status: 'sucesso' | 'erro' | 'warning';
      mensagem: string;
    }>;
  };
  onClose: () => void;
}

export function RelatorioImportacao({ relatorio, onClose }: RelatorioImportacaoProps) {
  const { sucessos, erros, warnings, total, detalhes } = relatorio;

  const downloadRelatorio = () => {
    const csvContent = [
      "Linha,Nome,CPF,Status,Mensagem",
      ...detalhes.map(item => 
        `${item.linha},"${item.nome}","${item.cpf}","${item.status}","${item.mensagem}"`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_importacao_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sucesso':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'erro':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sucesso':
        return <Badge className="bg-green-100 text-green-800">Sucesso</Badge>;
      case 'erro':
        return <Badge variant="destructive">Erro</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-100 text-yellow-800">Aviso</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Relatório de Importação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{sucessos}</div>
              <div className="text-sm text-muted-foreground">Sucessos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{erros}</div>
              <div className="text-sm text-muted-foreground">Erros</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{warnings}</div>
              <div className="text-sm text-muted-foreground">Avisos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{total}</div>
              <div className="text-sm text-muted-foreground">Total</div>
            </div>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {sucessos > 0 && `${sucessos} adesões foram processadas com sucesso. `}
              {erros > 0 && `${erros} registros apresentaram erros. `}
              {warnings > 0 && `${warnings} registros foram processados com avisos.`}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Detalhes por Registro</CardTitle>
            <Button variant="outline" onClick={downloadRelatorio}>
              <Download className="h-4 w-4 mr-2" />
              Baixar Relatório
            </Button>
          </div>
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
                  <TableHead>Mensagem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detalhes.map((item, index) => (
                  <TableRow key={index}>
                    <TableCell>{item.linha}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(item.status)}
                        {getStatusBadge(item.status)}
                      </div>
                    </TableCell>
                    <TableCell>{item.nome}</TableCell>
                    <TableCell>{item.cpf}</TableCell>
                    <TableCell className="max-w-xs">
                      <div className="text-sm">{item.mensagem}</div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Button onClick={onClose}>
          Fechar
        </Button>
      </div>
    </div>
  );
}