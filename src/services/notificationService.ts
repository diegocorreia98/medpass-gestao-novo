import { supabase } from "@/integrations/supabase/client";

export type NotificationType = "info" | "success" | "warning" | "error";

export interface CreateNotificationParams {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  actionUrl?: string;
  actionLabel?: string;
}

export interface SystemNotificationParams {
  title: string;
  message: string;
  type: NotificationType;
  actionUrl?: string;
  actionLabel?: string;
  userIds?: string[];
  userType?: "matriz" | "unidade";
}

class NotificationService {
  async createNotification(params: CreateNotificationParams): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notificacoes')
        .insert({
          user_id: params.userId,
          titulo: params.title,
          mensagem: params.message,
          tipo: params.type,
          action_url: params.actionUrl,
          action_label: params.actionLabel,
        });

      if (error) {
        console.error('Erro ao criar notificação:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Erro ao criar notificação:', error);
      return false;
    }
  }

  async createSystemNotification(params: SystemNotificationParams): Promise<boolean> {
    try {
      const { userIds, userType, ...notificationData } = params;

      let targetUserIds: string[] = [];

      console.log('🔔 Criando notificação do sistema:', {
        userIds,
        userType,
        title: notificationData.title
      });

      if (userIds) {
        targetUserIds = userIds;
        console.log('📧 Usando lista de usuários específicos:', userIds);
      } else if (userType) {
        // Get all users of specified type
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('user_id, user_type, full_name')
          .eq('user_type', userType);

        if (error) {
          console.error('❌ Erro ao buscar usuários:', error);
          return false;
        }

        targetUserIds = profiles.map(profile => profile.user_id);
        console.log(`👥 Encontrados ${profiles.length} usuários do tipo "${userType}":`, profiles);
      } else {
        // Get all users if no filter specified
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('user_id, user_type, full_name');

        if (error) {
          console.error('❌ Erro ao buscar usuários:', error);
          return false;
        }

        targetUserIds = profiles.map(profile => profile.user_id);
        console.log(`👥 Encontrados ${profiles.length} usuários total:`, profiles);
      }

      if (targetUserIds.length === 0) {
        console.warn('⚠️ Nenhum usuário encontrado para enviar notificações');
        return false;
      }

      // Create notifications for all target users
      const notifications = targetUserIds.map(userId => ({
        user_id: userId,
        titulo: notificationData.title,
        mensagem: notificationData.message,
        tipo: notificationData.type,
        action_url: notificationData.actionUrl,
        action_label: notificationData.actionLabel,
      }));

      console.log(`📬 Inserindo ${notifications.length} notificações no banco:`, notifications[0]);

      const { error, data } = await supabase
        .from('notificacoes')
        .insert(notifications)
        .select();

      if (error) {
        console.error('❌ Erro ao criar notificações do sistema:', error);
        return false;
      }

      console.log(`✅ ${data.length} notificações criadas com sucesso`);
      return true;
    } catch (error) {
      console.error('❌ Erro ao criar notificações do sistema:', error);
      return false;
    }
  }

  // Predefined notification types for common system events
  async notifyPaymentConfirmed(userId: string, beneficiaryName: string, planName: string): Promise<boolean> {
    return this.createNotification({
      userId,
      title: "Pagamento Confirmado",
      message: `O pagamento do plano ${planName} para ${beneficiaryName} foi confirmado com sucesso.`,
      type: "success",
      actionUrl: "/beneficiarios",
      actionLabel: "Ver Beneficiários"
    });
  }

  async notifyPaymentFailed(userId: string, beneficiaryName: string, planName: string): Promise<boolean> {
    return this.createNotification({
      userId,
      title: "Falha no Pagamento",
      message: `O pagamento do plano ${planName} para ${beneficiaryName} não foi processado. Verifique os dados de pagamento.`,
      type: "error",
      actionUrl: "/beneficiarios",
      actionLabel: "Ver Beneficiários"
    });
  }

  async notifyNewBeneficiary(userId: string, beneficiaryName: string): Promise<boolean> {
    return this.createNotification({
      userId,
      title: "Novo Beneficiário",
      message: `${beneficiaryName} foi adicionado como novo beneficiário.`,
      type: "info",
      actionUrl: "/beneficiarios",
      actionLabel: "Ver Beneficiários"
    });
  }

  async notifyCancellation(userId: string, beneficiaryName: string, reason: string): Promise<boolean> {
    return this.createNotification({
      userId,
      title: "Cancelamento Processado",
      message: `O cancelamento de ${beneficiaryName} foi processado. Motivo: ${reason}`,
      type: "warning",
      actionUrl: "/cancelamentos",
      actionLabel: "Ver Cancelamentos"
    });
  }

  async notifySystemMaintenance(): Promise<boolean> {
    return this.createSystemNotification({
      title: "Manutenção do Sistema",
      message: "O sistema passará por manutenção programada hoje das 02:00 às 04:00. Durante este período, algumas funcionalidades podem ficar indisponíveis.",
      type: "warning",
      actionUrl: "/configuracoes",
      actionLabel: "Mais informações"
    });
  }

  async notifyNewFeature(featureName: string, description: string): Promise<boolean> {
    return this.createSystemNotification({
      title: `Nova Funcionalidade: ${featureName}`,
      message: description,
      type: "info",
      actionUrl: "/configuracoes",
      actionLabel: "Saiba mais"
    });
  }

  async notifySecurityAlert(userType?: "matriz" | "unidade"): Promise<boolean> {
    return this.createSystemNotification({
      title: "Alerta de Segurança",
      message: "Detectamos atividade suspeita em sua conta. Por favor, verifique seus dados e altere sua senha se necessário.",
      type: "error",
      actionUrl: "/perfil",
      actionLabel: "Verificar Conta",
      userType
    });
  }
}

export const notificationService = new NotificationService();

// Export individual functions for easier imports
export const createNotification = (params: CreateNotificationParams) => notificationService.createNotification(params);
export const createSystemNotification = (params: SystemNotificationParams) => notificationService.createSystemNotification(params);
export const notifyPaymentConfirmed = (userId: string, beneficiaryName: string, planName: string) => notificationService.notifyPaymentConfirmed(userId, beneficiaryName, planName);
export const notifyPaymentFailed = (userId: string, beneficiaryName: string, planName: string) => notificationService.notifyPaymentFailed(userId, beneficiaryName, planName);
export const notifyNewBeneficiary = (userId: string, beneficiaryName: string) => notificationService.notifyNewBeneficiary(userId, beneficiaryName);
export const notifyCancellation = (userId: string, beneficiaryName: string, reason: string) => notificationService.notifyCancellation(userId, beneficiaryName, reason);
export const notifySystemMaintenance = () => notificationService.notifySystemMaintenance();
export const notifyNewFeature = (featureName: string, description: string) => notificationService.notifyNewFeature(featureName, description);
export const notifySecurityAlert = (userType?: "matriz" | "unidade") => notificationService.notifySecurityAlert(userType);