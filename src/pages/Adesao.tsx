import { useState } from "react";
import { Button } from "@/components/ui/button";
import { UserPlus, FileSpreadsheet, Link } from "lucide-react";
import { useBeneficiarios } from "@/hooks/useBeneficiarios";
import { AdesoesDataTable } from "@/components/adesao/AdesoesDataTable";
import { AdesaoModal } from "@/components/adesao/AdesaoModal";
import { ImportacaoLoteModal } from "@/components/adesao/ImportacaoLoteModal";
import { GerarLinkModal } from "@/components/adesao/GerarLinkModal";

export default function Adesao() {
  const { beneficiarios, isLoading } = useBeneficiarios();
  const [modalOpen, setModalOpen] = useState(false);
  const [importacaoModalOpen, setImportacaoModalOpen] = useState(false);
  const [gerarLinkModalOpen, setGerarLinkModalOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Adesões de Beneficiários</h2>
          <p className="text-muted-foreground">Gerencie todas as adesões do sistema</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setModalOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Nova Adesão
          </Button>
          <Button onClick={() => setImportacaoModalOpen(true)} variant="outline">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Importar em Lote
          </Button>
          <Button onClick={() => setGerarLinkModalOpen(true)} variant="outline">
            <Link className="h-4 w-4 mr-2" />
            Gerar Link
          </Button>
        </div>
      </div>

      <AdesoesDataTable 
        beneficiarios={beneficiarios} 
        isLoading={isLoading} 
      />

      <AdesaoModal 
        open={modalOpen} 
        onClose={() => setModalOpen(false)} 
      />

      <ImportacaoLoteModal 
        open={importacaoModalOpen} 
        onClose={() => setImportacaoModalOpen(false)} 
      />

      <GerarLinkModal 
        open={gerarLinkModalOpen} 
        onClose={() => setGerarLinkModalOpen(false)}
        beneficiarios={beneficiarios}
      />
    </div>
  );
}