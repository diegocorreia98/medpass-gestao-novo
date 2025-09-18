import { useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { notificationService, type CreateNotificationParams, type SystemNotificationParams } from "@/services/notificationService";

export function useNotificationService() {
  const { toast } = useToast();
  const { profile } = useAuth();

  const createNotification = useCallback(async (params: Omit<CreateNotificationParams, 'userId'>) => {
    if (!profile?.user_id) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado",
        variant: "destructive",
      });
      return false;
    }

    const success = await notificationService.createNotification({
      ...params,
      userId: profile.user_id,
    });

    if (!success) {
      toast({
        title: "Erro",
        description: "Não foi possível criar a notificação",
        variant: "destructive",
      });
    }

    return success;
  }, [profile?.user_id, toast]);

  const createSystemNotification = useCallback(async (params: SystemNotificationParams) => {
    const success = await notificationService.createSystemNotification(params);

    if (!success) {
      toast({
        title: "Erro",
        description: "Não foi possível criar a notificação do sistema",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Sucesso",
        description: "Notificação do sistema criada com sucesso",
      });
    }

    return success;
  }, [toast]);

  // Convenience methods for common notifications
  const notifyPaymentConfirmed = useCallback(async (beneficiaryName: string, planName: string, targetUserId?: string) => {
    const userId = targetUserId || profile?.user_id;
    if (!userId) return false;

    return notificationService.notifyPaymentConfirmed(userId, beneficiaryName, planName);
  }, [profile?.user_id]);

  const notifyPaymentFailed = useCallback(async (beneficiaryName: string, planName: string, targetUserId?: string) => {
    const userId = targetUserId || profile?.user_id;
    if (!userId) return false;

    return notificationService.notifyPaymentFailed(userId, beneficiaryName, planName);
  }, [profile?.user_id]);

  const notifyNewBeneficiary = useCallback(async (beneficiaryName: string, targetUserId?: string) => {
    const userId = targetUserId || profile?.user_id;
    if (!userId) return false;

    return notificationService.notifyNewBeneficiary(userId, beneficiaryName);
  }, [profile?.user_id]);

  const notifyCancellation = useCallback(async (beneficiaryName: string, reason: string, targetUserId?: string) => {
    const userId = targetUserId || profile?.user_id;
    if (!userId) return false;

    return notificationService.notifyCancellation(userId, beneficiaryName, reason);
  }, [profile?.user_id]);

  return {
    createNotification,
    createSystemNotification,
    notifyPaymentConfirmed,
    notifyPaymentFailed,
    notifyNewBeneficiary,
    notifyCancellation,
    // System-wide notifications (admin only)
    notifySystemMaintenance: notificationService.notifySystemMaintenance,
    notifyNewFeature: notificationService.notifyNewFeature,
    notifySecurityAlert: notificationService.notifySecurityAlert,
  };
}