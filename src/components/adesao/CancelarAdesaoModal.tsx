import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useCancelamentos } from "@/hooks/useCancelamentos";
import type { BeneficiarioCompleto } from "@/types/database";

interface CancelarAdesaoModalProps {
  open: boolean;
  onClose: () => void;
  beneficiario?: BeneficiarioCompleto;
}

const motivosCancelamento = [
  "Inadimplência",
  "Solicitação do beneficiário",
  "Mudança de plano",
  "Não utilização do serviço",
  "Insatisfação com o atendimento",
  "Problemas financeiros",
  "Outros"
];

export function CancelarAdesaoModal({ open, onClose, beneficiario }: CancelarAdesaoModalProps) {
  const { cancelarBeneficiario, isCanceling } = useCancelamentos();
  const [motivo, setMotivo] = useState("");
  const [observacoes, setObservacoes] = useState("");

  const handleCancelar = async () => {
    if (!beneficiario || !motivo) {
      return;
    }

    try {
      await cancelarBeneficiario.mutateAsync({
        beneficiarioId: beneficiario.id,
        motivo,
        observacoes: observacoes || undefined,
      });

      // Limpar form e fechar modal
      setMotivo("");
      setObservacoes("");
      onClose();
    } catch (error) {
      // Erro já tratado no hook
    }
  };

  const handleClose = () => {
    setMotivo("");
    setObservacoes("");
    onClose();
  };

  if (!beneficiario) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Cancelar Adesão
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Esta ação é irreversível. O beneficiário <strong>{beneficiario.nome}</strong> será 
              marcado como inativo no sistema.
            </AlertDescription>
          </Alert>

          <div>
            <Label htmlFor="motivo">Motivo do Cancelamento *</Label>
            <Select value={motivo} onValueChange={setMotivo}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o motivo..." />
              </SelectTrigger>
              <SelectContent>
                {motivosCancelamento.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Observações adicionais sobre o cancelamento..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={handleClose}>
              Voltar
            </Button>
            <Button 
              variant="destructive"
              onClick={handleCancelar}
              disabled={!motivo || isCanceling}
            >
              {isCanceling ? (
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Confirmar Cancelamento
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}