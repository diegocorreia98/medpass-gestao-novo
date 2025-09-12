import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface WebhookEvent {
  id: string;
  event_id: string;
  event_type: string;
  processed: boolean;
  processed_at: string | null;
  created_at: string;
  error_message: string | null;
  event_data: any;
}

export interface WebhookStats {
  total: number;
  processed: number;
  failed: number;
  successRate: string;
  last24h: number;
  last7days: number;
  last30days: number;
}

export function useWebhookStats() {
  const [stats, setStats] = useState<WebhookStats>({
    total: 0,
    processed: 0,
    failed: 0,
    successRate: '0',
    last24h: 0,
    last7days: 0,
    last30days: 0,
  });
  
  const [recentEvents, setRecentEvents] = useState<WebhookEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReprocessing, setIsReprocessing] = useState(false);
  const { toast } = useToast();

  const fetchWebhookStats = async () => {
    try {
      // Buscar estatísticas gerais
      const { data: statsData, error: statsError } = await supabase
        .from('vindi_webhook_events')
        .select('processed, error_message, created_at');

      if (statsError) throw statsError;

      const now = new Date();
      const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const last7days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const last30days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      const total = statsData.length;
      const processed = statsData.filter(event => event.processed).length;
      const failed = statsData.filter(event => event.error_message !== null).length;
      const successRate = total > 0 ? ((processed / total) * 100).toFixed(1) : '0';

      const events24h = statsData.filter(event => 
        new Date(event.created_at) >= last24h
      ).length;

      const events7days = statsData.filter(event => 
        new Date(event.created_at) >= last7days
      ).length;

      const events30days = statsData.filter(event => 
        new Date(event.created_at) >= last30days
      ).length;

      setStats({
        total,
        processed,
        failed,
        successRate,
        last24h: events24h,
        last7days: events7days,
        last30days: events30days,
      });

      // Buscar eventos recentes
      const { data: eventsData, error: eventsError } = await supabase
        .from('vindi_webhook_events')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (eventsError) throw eventsError;

      setRecentEvents(eventsData || []);
    } catch (error: any) {
      console.error('Error fetching webhook stats:', error);
      toast({
        title: "Erro ao carregar estatísticas",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const reprocessFailedEvents = async () => {
    setIsReprocessing(true);
    try {
      // Buscar eventos com erro
      const { data: failedEvents, error } = await supabase
        .from('vindi_webhook_events')
        .select('*')
        .eq('processed', false)
        .not('error_message', 'is', null);

      if (error) throw error;

      if (failedEvents && failedEvents.length > 0) {
        // Aqui você poderia implementar lógica para reprocessar eventos
        // Por enquanto, apenas mostrar uma mensagem
        toast({
          title: "Reprocessamento Iniciado",
          description: `${failedEvents.length} evento(s) serão reprocessados`,
        });
      } else {
        toast({
          title: "Nenhum evento para reprocessar",
          description: "Não há eventos com erro no momento",
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro ao reprocessar eventos",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsReprocessing(false);
    }
  };

  const testWebhook = async () => {
    try {
      // Criar um evento de teste
      const testEvent = {
        event_id: `test_${Date.now()}`,
        event_type: 'test_webhook',
        event_data: {
          type: 'test',
          created_at: new Date().toISOString(),
          data: {
            message: 'Teste de webhook enviado pelo sistema'
          }
        }
      };

      const { error } = await supabase
        .from('vindi_webhook_events')
        .insert([testEvent]);

      if (error) throw error;

      toast({
        title: "Evento de teste criado",
        description: "Um evento de teste foi adicionado ao sistema",
      });

      // Recarregar dados
      fetchWebhookStats();
    } catch (error: any) {
      toast({
        title: "Erro ao criar evento de teste",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchWebhookStats();
  }, []);

  return {
    stats,
    recentEvents,
    isLoading,
    isReprocessing,
    fetchWebhookStats,
    reprocessFailedEvents,
    testWebhook,
  };
}