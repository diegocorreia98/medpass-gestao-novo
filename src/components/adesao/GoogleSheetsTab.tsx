import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { ExternalLink, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PreviewDados } from "./PreviewDados";
import { RelatorioImportacao } from "./RelatorioImportacao";
import { supabase } from "@/integrations/supabase/client";

interface GoogleSheetsTabProps {
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
  observacoes?: string;
}

export function GoogleSheetsTab({ onClose }: GoogleSheetsTabProps) {
  const [linkGoogleSheets, setLinkGoogleSheets] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [dados, setDados] = useState<DadosImportacao[]>([]);
  const [mostrarPreview, setMostrarPreview] = useState(false);
  const [processando, setProcessando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [relatorio, setRelatorio] = useState<any>(null);
  const { toast } = useToast();

  const criarTemplateGoogleSheets = () => {
    const templateUrl = "https://docs.google.com/spreadsheets/d/1EAXDporFp1ir87SI5gdvOCPG8htcsF1o3SpE2a6HEVc/edit?usp=sharing";
    window.open(templateUrl, '_blank');
  };

  const extrairDadosGoogleSheets = async () => {
    if (!linkGoogleSheets) {
      toast({
        title: "Link obrigatório",
        description: "Cole o link da planilha do Google Sheets",
        variant: "destructive",
      });
      return;
    }

    setCarregando(true);

    try {
      // Extrair o ID da planilha do link
      const sheetId = extrairIdDaPlanilha(linkGoogleSheets);
      if (!sheetId) {
        throw new Error("Link inválido do Google Sheets");
      }

      // Construir URL da API do Google Sheets
      const apiUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
      
      const response = await fetch(apiUrl);
      if (!response.ok) {
        throw new Error("Erro ao acessar a planilha. Verifique se ela está pública.");
      }

      const csvText = await response.text();
      
      // Processar CSV
      const linhas = csvText.split('\n');
      const cabecalho = linhas[0].split(',');
      const dadosProcessados: DadosImportacao[] = [];

      for (let i = 1; i < linhas.length; i++) {
        if (linhas[i].trim()) {
          const valores = linhas[i].split(',');
          const item: any = {};
          
          cabecalho.forEach((coluna, index) => {
            item[coluna.trim()] = valores[index]?.trim() || '';
          });

          dadosProcessados.push(item as DadosImportacao);
        }
      }

      setDados(dadosProcessados);
      setMostrarPreview(true);

      toast({
        title: "Dados carregados",
        description: `${dadosProcessados.length} registros encontrados`,
      });

    } catch (error) {
      console.error('Erro ao carregar Google Sheets:', error);
      toast({
        title: "Erro ao carregar planilha",
        description: "Verifique se o link está correto e a planilha é pública",
        variant: "destructive",
      });
    } finally {
      setCarregando(false);
    }
  };

  const extrairIdDaPlanilha = (url: string): string | null => {
    const regex = /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/;
    const match = url.match(regex);
    return match ? match[1] : null;
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
        <ExternalLink className="h-4 w-4" />
        <AlertDescription>
          Cole o link de uma planilha do Google Sheets pública. A planilha deve ter as mesmas colunas do nosso template.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Template Google Sheets
          </CardTitle>
          <CardDescription>
            Use nosso template do Google Sheets para organizar os dados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={criarTemplateGoogleSheets} variant="outline" className="w-full">
            <ExternalLink className="h-4 w-4 mr-2" />
            Abrir Template no Google Sheets
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Link da Planilha</CardTitle>
          <CardDescription>
            Cole aqui o link da sua planilha do Google Sheets
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="google-sheets-link">Link do Google Sheets</Label>
            <Input
              id="google-sheets-link"
              placeholder="https://docs.google.com/spreadsheets/d/..."
              value={linkGoogleSheets}
              onChange={(e) => setLinkGoogleSheets(e.target.value)}
            />
          </div>

          <Alert>
            <AlertDescription>
              <strong>Importante:</strong> A planilha deve estar configurada como pública ou "qualquer pessoa com o link pode visualizar".
            </AlertDescription>
          </Alert>

          <Button 
            onClick={extrairDadosGoogleSheets}
            disabled={carregando || !linkGoogleSheets}
            className="w-full"
          >
            {carregando ? "Carregando..." : "Carregar Dados da Planilha"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}