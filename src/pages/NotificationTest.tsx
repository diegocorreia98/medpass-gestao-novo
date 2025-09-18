import React from "react";
import { NotificationDemoProduction } from "@/components/notifications/NotificationDemoProduction";

export default function NotificationTest() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Sistema de Notificações</h1>
        <p className="text-muted-foreground">
          Gerencie e envie notificações para usuários do sistema.
        </p>
      </div>

      <NotificationDemoProduction />
    </div>
  );
}