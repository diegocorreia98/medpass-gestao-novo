import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useNotificationService } from "@/hooks/useNotificationService";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationSoundSettings } from "./NotificationSoundSettings";
import type { NotificationType } from "@/services/notificationService";

export function NotificationDemoProduction() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<NotificationType>("info");
  const [actionUrl, setActionUrl] = useState("");
  const [actionLabel, setActionLabel] = useState("");
  const [userType, setUserType] = useState<"all" | "matriz" | "unidade">("all");
  const [isLoading, setIsLoading] = useState(false);

  const { profile } = useAuth();
  const { createSystemNotification } = useNotificationService();

  const isMatriz = profile?.user_type === "matriz";

  const handleCreateNotification = async () => {
    if (!title || !message) return;

    setIsLoading(true);

    try {
      if (userType === "all") {
        await createSystemNotification({
          title,
          message,
          type,
          actionUrl: actionUrl || undefined,
          actionLabel: actionLabel || undefined,
        });
      } else {
        await createSystemNotification({
          title,
          message,
          type,
          actionUrl: actionUrl || undefined,
          actionLabel: actionLabel || undefined,
          userType: userType as "matriz" | "unidade",
        });
      }

      // Clear form
      setTitle("");
      setMessage("");
      setActionUrl("");
      setActionLabel("");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isMatriz) {
    return (
      <div className="space-y-6">
        <Alert>
          <AlertDescription>
            Apenas usuários do tipo "matriz" podem acessar as funcionalidades de criação e gerenciamento de notificações do sistema.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Sound Settings */}
      <NotificationSoundSettings />

      <Card>
        <CardHeader>
          <CardTitle>Criar Notificação do Sistema</CardTitle>
          <CardDescription>
            Envie notificações para usuários específicos ou todos os usuários do sistema.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Título da notificação"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Tipo</Label>
              <Select value={type} onValueChange={(value: NotificationType) => setType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="success">Sucesso</SelectItem>
                  <SelectItem value="warning">Aviso</SelectItem>
                  <SelectItem value="error">Erro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="userType">Enviar para</Label>
              <Select value={userType} onValueChange={setUserType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os usuários</SelectItem>
                  <SelectItem value="matriz">Apenas Matriz</SelectItem>
                  <SelectItem value="unidade">Apenas Unidades</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Mensagem</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Conteúdo da notificação"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="actionUrl">URL de Ação (opcional)</Label>
              <Input
                id="actionUrl"
                value={actionUrl}
                onChange={(e) => setActionUrl(e.target.value)}
                placeholder="/dashboard"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="actionLabel">Rótulo da Ação (opcional)</Label>
              <Input
                id="actionLabel"
                value={actionLabel}
                onChange={(e) => setActionLabel(e.target.value)}
                placeholder="Ver detalhes"
              />
            </div>
          </div>

          <Button
            onClick={handleCreateNotification}
            disabled={!title || !message || isLoading}
            className="w-full"
          >
            {isLoading ? "Enviando..." : "Enviar Notificação"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}