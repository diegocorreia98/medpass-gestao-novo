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
import { NotificationDebug } from "./NotificationDebug";
import type { NotificationType } from "@/services/notificationService";

export function NotificationDemo() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [type, setType] = useState<NotificationType>("info");
  const [actionUrl, setActionUrl] = useState("");
  const [actionLabel, setActionLabel] = useState("");
  const [userType, setUserType] = useState<"all" | "matriz" | "unidade">("all");
  const [isLoading, setIsLoading] = useState(false);

  const { profile } = useAuth();
  const {
    createNotification,
    createSystemNotification,
    notifyPaymentConfirmed,
    notifyPaymentFailed,
    notifyNewBeneficiary,
    notifyCancellation,
  } = useNotificationService();

  const isMatriz = profile?.user_type === "matriz";

  const handleCreateNotification = async () => {
    if (!title || !message) return;

    setIsLoading(true);

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

    setIsLoading(false);

    // Clear form
    setTitle("");
    setMessage("");
    setActionUrl("");
    setActionLabel("");
  };

  const handleQuickNotification = async (notificationType: string) => {
    setIsLoading(true);

    switch (notificationType) {
      case "payment-confirmed":
        await notifyPaymentConfirmed("João Silva", "Plano Básico");
        break;
      case "payment-failed":
        await notifyPaymentFailed("Maria Santos", "Plano Premium");
        break;
      case "new-beneficiary":
        await notifyNewBeneficiary("Carlos Oliveira");
        break;
      case "cancellation":
        await notifyCancellation("Ana Costa", "Mudança de cidade");
        break;
      case "test-all":
        await createSystemNotification({
          title: "Teste - Notificação para Todos",
          message: "Esta é uma notificação de teste enviada para todos os usuários do sistema.",
          type: "info",
          actionUrl: "/dashboard",
          actionLabel: "Ver Dashboard"
        });
        break;
      case "test-matriz":
        await createSystemNotification({
          title: "Teste - Notificação para Matriz",
          message: "Esta é uma notificação de teste enviada apenas para usuários matriz.",
          type: "warning",
          userType: "matriz",
          actionUrl: "/admin",
          actionLabel: "Ver Admin"
        });
        break;
      case "test-unidade":
        await createSystemNotification({
          title: "Teste - Notificação para Unidade",
          message: "Esta é uma notificação de teste enviada apenas para usuários unidade.",
          type: "success",
          userType: "unidade",
          actionUrl: "/unidade/notificacoes",
          actionLabel: "Ver Notificações"
        });
        break;
    }

    setIsLoading(false);
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
      <NotificationDebug />

      <Card>
        <CardHeader>
          <CardTitle>Demo do Sistema de Notificações</CardTitle>
          <CardDescription>
            Use este painel para testar as funcionalidades do sistema de notificações. (Apenas para usuários Matriz)
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
                placeholder="/dashboard ou https://example.com"
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
            {isLoading ? "Criando..." : "Criar Notificação"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notificações Rápidas</CardTitle>
          <CardDescription>
            Teste notificações predefinidas do sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <Button
              variant="outline"
              onClick={() => handleQuickNotification("payment-confirmed")}
              disabled={isLoading}
            >
              Pagamento Confirmado
            </Button>
            <Button
              variant="outline"
              onClick={() => handleQuickNotification("payment-failed")}
              disabled={isLoading}
            >
              Pagamento Falhado
            </Button>
            <Button
              variant="outline"
              onClick={() => handleQuickNotification("new-beneficiary")}
              disabled={isLoading}
            >
              Novo Beneficiário
            </Button>
            <Button
              variant="outline"
              onClick={() => handleQuickNotification("cancellation")}
              disabled={isLoading}
            >
              Cancelamento
            </Button>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium mb-3">Teste de Notificações por Tipo de Usuário</h4>
            <div className="grid grid-cols-3 gap-3">
              <Button
                variant="secondary"
                onClick={() => handleQuickNotification("test-all")}
                disabled={isLoading}
              >
                Teste - Todos Usuários
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleQuickNotification("test-matriz")}
                disabled={isLoading}
              >
                Teste - Apenas Matriz
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleQuickNotification("test-unidade")}
                disabled={isLoading}
              >
                Teste - Apenas Unidade
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}