import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface PaymentStatusUpdate {
  beneficiario_id: string;
  old_status: string;
  new_status: string;
}

export function usePaymentStatus() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  // Removed auto-refresh to prevent notification spam

  const refreshPaymentStatuses = async (showToast = false) => {
    if (isRefreshing) return;
    
    setIsRefreshing(true);
    
    try {
      // This would typically call an edge function to check Vindi API
      // and update payment statuses in the database
      const { data, error } = await supabase.functions.invoke('refresh-payment-statuses');
      
      if (error) {
        console.error('Error refreshing payment statuses:', error);
        return;
      }

      if (showToast && data?.updates && data.updates.length > 0) {
        toast({
          title: "Status atualizados",
          description: `${data.updates.length} pagamento(s) tiveram status atualizado`,
        });
      }
    } catch (error) {
      console.error('Error in refreshPaymentStatuses:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const manualRefresh = () => {
    refreshPaymentStatuses(true);
  };

  const checkSinglePaymentStatus = async (beneficiarioId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('check-payment-status', {
        body: { beneficiario_id: beneficiarioId }
      });

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('Error checking payment status:', error);
      throw error;
    }
  };

  return {
    isRefreshing,
    refreshPaymentStatuses: manualRefresh,
    checkSinglePaymentStatus,
  };
}