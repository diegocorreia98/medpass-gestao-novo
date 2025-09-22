import React from "react";
import { NotificationDemoProduction } from "@/components/notifications/NotificationDemoProduction";
import { PopupNotificationAdmin } from "@/components/notifications/PopupNotificationAdmin";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, Megaphone } from "lucide-react";

export default function NotificationTest() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Sistema de Notificações</h1>
        <p className="text-muted-foreground">
          Gerencie e envie notificações para usuários do sistema.
        </p>
      </div>

      <Tabs defaultValue="system" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="system" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notificações do Sistema
          </TabsTrigger>
          <TabsTrigger value="popups" className="flex items-center gap-2">
            <Megaphone className="h-4 w-4" />
            Gerenciar Popups
          </TabsTrigger>
        </TabsList>

        <TabsContent value="system" className="space-y-4">
          <div className="rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4">Notificações em Tempo Real</h2>
            <p className="text-muted-foreground mb-4">
              Sistema de notificações push para alertas e atualizações em tempo real.
            </p>
            <NotificationDemoProduction />
          </div>
        </TabsContent>

        <TabsContent value="popups" className="space-y-4">
          <div className="rounded-lg border p-6">
            <PopupNotificationAdmin />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}