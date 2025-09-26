import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  read: boolean;
  createdAt: Date;
  actionUrl?: string;
  actionLabel?: string;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchNotifications = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('notificacoes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      const formattedNotifications: Notification[] = data.map(notif => ({
        id: notif.id,
        title: notif.titulo,
        message: notif.mensagem,
        type: notif.tipo as "info" | "success" | "warning" | "error",
        read: notif.lida,
        createdAt: new Date(notif.created_at),
        actionUrl: notif.action_url || undefined,
        actionLabel: notif.action_label || undefined,
      }));

      setNotifications(formattedNotifications);
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as notificações",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchNotifications();

    // Setup real-time subscription for notifications
    const setupSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const channel = supabase
        .channel('notifications')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notificacoes',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('Notification change received:', payload);

            if (payload.eventType === 'INSERT') {
              const newNotification: Notification = {
                id: payload.new.id,
                title: payload.new.titulo,
                message: payload.new.mensagem,
                type: payload.new.tipo as "info" | "success" | "warning" | "error",
                read: payload.new.lida,
                createdAt: new Date(payload.new.created_at),
                actionUrl: payload.new.action_url || undefined,
                actionLabel: payload.new.action_label || undefined,
              };
              setNotifications(prev => [newNotification, ...prev]);
            } else if (payload.eventType === 'UPDATE') {
              setNotifications(prev =>
                prev.map(notification =>
                  notification.id === payload.new.id
                    ? {
                        ...notification,
                        title: payload.new.titulo,
                        message: payload.new.mensagem,
                        type: payload.new.tipo as "info" | "success" | "warning" | "error",
                        read: payload.new.lida,
                        actionUrl: payload.new.action_url || undefined,
                        actionLabel: payload.new.action_label || undefined,
                      }
                    : notification
                )
              );
            } else if (payload.eventType === 'DELETE') {
              setNotifications(prev =>
                prev.filter(notification => notification.id !== payload.old.id)
              );
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    const cleanupPromise = setupSubscription();

    return () => {
      cleanupPromise.then(cleanup => cleanup?.());
    };
  }, [fetchNotifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('notificacoes')
        .update({ lida: true })
        .eq('id', id);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(notification => 
          notification.id === id 
            ? { ...notification, read: true }
            : notification
        )
      );
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
      toast({
        title: "Erro",
        description: "Não foi possível marcar a notificação como lida",
        variant: "destructive",
      });
    }
  }, [toast]);

  const markAllAsRead = useCallback(async () => {
    try {
      const { error } = await supabase
        .from('notificacoes')
        .update({ lida: true })
        .eq('lida', false);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(notification => ({ ...notification, read: true }))
      );
    } catch (error) {
      console.error('Erro ao marcar todas notificações como lidas:', error);
      toast({
        title: "Erro",
        description: "Não foi possível marcar todas as notificações como lidas",
        variant: "destructive",
      });
    }
  }, [toast]);

  const removeNotification = useCallback(async (id: string) => {
    try {
      const { error } = await supabase
        .from('notificacoes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setNotifications(prev => prev.filter(notification => notification.id !== id));
    } catch (error) {
      console.error('Erro ao remover notificação:', error);
      toast({
        title: "Erro",
        description: "Não foi possível remover a notificação",
        variant: "destructive",
      });
    }
  }, [toast]);

  const addNotification = useCallback(async (notification: Omit<Notification, "id" | "createdAt">) => {
    try {
      const { data, error } = await supabase
        .from('notificacoes')
        .insert({
          titulo: notification.title,
          mensagem: notification.message,
          tipo: notification.type,
          action_url: notification.actionUrl,
          action_label: notification.actionLabel,
          user_id: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (error) throw error;

      const newNotification: Notification = {
        id: data.id,
        title: data.titulo,
        message: data.mensagem,
        type: data.tipo as "info" | "success" | "warning" | "error",
        read: data.lida,
        createdAt: new Date(data.created_at),
        actionUrl: data.action_url || undefined,
        actionLabel: data.action_label || undefined,
      };

      setNotifications(prev => [newNotification, ...prev]);
    } catch (error) {
      console.error('Erro ao adicionar notificação:', error);
      // If table doesn't exist, create a mock notification for testing
      if (error.message?.includes('relation "public.notificacoes" does not exist')) {
        console.warn('Tabela notificacoes não existe, criando notificação mock para teste');
        const mockNotification: Notification = {
          id: Date.now().toString(),
          title: notification.title,
          message: notification.message,
          type: notification.type,
          read: false,
          createdAt: new Date(),
          actionUrl: notification.actionUrl,
          actionLabel: notification.actionLabel,
        };
        setNotifications(prev => [mockNotification, ...prev]);
        return;
      }

      toast({
        title: "Erro",
        description: "Não foi possível adicionar a notificação",
        variant: "destructive",
      });
    }
  }, [toast]);

  return {
    notifications,
    loading,
    unreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification,
    addNotification,
    refetch: fetchNotifications,
  };
}