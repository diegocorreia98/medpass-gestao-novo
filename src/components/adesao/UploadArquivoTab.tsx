import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Download, Upload, FileText, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { PreviewDados } from "./PreviewDados";
import { RelatorioImportacao } from "./RelatorioImportacao";
import { supabase } from "@/integrations/supabase/client";

interface UploadArquivoTabProps {
  onClose: () => void;
}

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
  empresaId?: string;
  observacoes?: string;
}

export function UploadArquivoTab({ onClose }: UploadArquivoTabProps) {
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [dados, setDados] = useState<DadosImportacao[]>([]);
  const [mostrarPreview, setMostrarPreview] = useState(false);
  const [processando, setProcessando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [relatorio, setRelatorio] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const downloadTemplate = () => {
    const template = [
      {
        nome: "João Silva",
        cpf: "11144477735",
        email: "joao@exemplo.com",
        telefone: "11999999999",
        dataNascimento: "1990-01-15",
        cep: "01234567",
        numero: "123",
        cidade: "São Paulo",
        estado: "SP",
        planoId: "uuid-do-plano",
        empresaId: "uuid-da-empresa-opcional",
        observacoes: "Observações opcionais"
      }
    ];

    const csv = Papa.unparse(template);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "template_adesoes.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Template baixado",
      description: "Use este arquivo como modelo para sua importação",
    });
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setArquivo(file);
    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    if (fileExtension === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          setDados(results.data as DadosImportacao[]);
          setMostrarPreview(true);
        },
        error: (error) => {
          toast({
            title: "Erro ao processar CSV",
            description: error.message,
            variant: "destructive",
          });
        }
      });
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const workbook = XLSX.read(e.target?.result, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet) as DadosImportacao[];
          setDados(jsonData);
          setMostrarPreview(true);
        } catch (error) {
          toast({
            title: "Erro ao processar Excel",
            description: "Verifique se o arquivo está no formato correto",
            variant: "destructive",
          });
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      toast({
        title: "Formato não suportado",
        description: "Apenas arquivos CSV e Excel são aceitos",
        variant: "destructive",
      });
    }
  };

  const processarImportacao = async () => {
    setProcessando(true);
    setProgresso(0);

    try {
      const { data, error } = await supabase.functions.invoke('processar-importacao-lote', {
        body: { dados }
      });

      if (error) throw error;

      setRelatorio(data);
      setProgresso(100);
      
      toast({
        title: "Importação concluída",
        description: `${data.sucessos} adesões processadas com sucesso`,
      });
    } catch (error) {
      console.error('Erro na importação:', error);
      toast({
        title: "Erro na importação",
        description: "Ocorreu um erro durante o processamento",
        variant: "destructive",
      });
    } finally {
      setProcessando(false);
    }
  };

  if (relatorio) {
    return <RelatorioImportacao relatorio={relatorio} onClose={onClose} />;
  }

  if (mostrarPreview) {
    return (
      <PreviewDados 
        dados={dados} 
        onConfirmar={processarImportacao}
        onVoltar={() => setMostrarPreview(false)}
        processando={processando}
        progresso={progresso}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Alert>
        <FileText className="h-4 w-4" />
        <AlertDescription>
          Faça upload de um arquivo CSV ou Excel com os dados das adesões. 
          Use nosso template para garantir o formato correto.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Template de Importação
          </CardTitle>
          <CardDescription>
            Baixe o arquivo de exemplo para preencher com os dados das adesões.
            O campo empresaId é opcional - se preenchido, o beneficiário será vinculado à empresa.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={downloadTemplate} variant="outline" className="w-full">
            <Download className="h-4 w-4 mr-2" />
            Baixar Template (CSV)
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload do Arquivo
          </CardTitle>
          <CardDescription>
            Selecione um arquivo CSV ou Excel (.xlsx) com os dados das adesões
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
            />
            
            <Button 
              onClick={() => fileInputRef.current?.click()}
              variant="outline" 
              className="w-full h-20 border-dashed"
            >
              <div className="text-center">
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p>Clique para selecionar um arquivo</p>
                <p className="text-sm text-muted-foreground">CSV ou Excel (.xlsx)</p>
              </div>
            </Button>

            {arquivo && (
              <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                <FileText className="h-4 w-4" />
                <span className="text-sm">{arquivo.name}</span>
                <span className="text-xs text-muted-foreground">
                  ({(arquivo.size / 1024).toFixed(1)} KB)
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}