import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, FileSpreadsheet } from "lucide-react";
import { UploadArquivoTab } from "./UploadArquivoTab";
import { GoogleSheetsTab } from "./GoogleSheetsTab";

interface ImportacaoLoteModalProps {
  open: boolean;
  onClose: () => void;
}

export function ImportacaoLoteModal({ open, onClose }: ImportacaoLoteModalProps) {
  const [activeTab, setActiveTab] = useState("upload");

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importação em Lote de Adesões
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload de Arquivo
            </TabsTrigger>
            <TabsTrigger value="google-sheets" className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Google Sheets
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="mt-6">
            <UploadArquivoTab onClose={onClose} />
          </TabsContent>

          <TabsContent value="google-sheets" className="mt-6">
            <GoogleSheetsTab onClose={onClose} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}