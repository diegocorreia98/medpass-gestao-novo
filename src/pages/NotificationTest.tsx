import React from "react";
import { NotificationDemo } from "@/components/notifications/NotificationDemo";
import { debugNotificationSystem } from "@/utils/testNotifications";

export default function NotificationTest() {
  // Make debug function available in console
  React.useEffect(() => {
    (window as any).debugNotifications = debugNotificationSystem;
    console.log("🐛 Debug disponível! Digite 'debugNotifications()' no console para debugar o sistema");
  }, []);

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Teste do Sistema de Notificações</h1>
        <p className="text-muted-foreground">
          Esta página permite testar todas as funcionalidades do sistema de notificações.
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          💡 <strong>Debug:</strong> Abra o console (F12) e digite <code>debugNotifications()</code> para análise detalhada
        </p>
      </div>

      <NotificationDemo />
    </div>
  );
}