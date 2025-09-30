// Utility function to format webhook event names to be user-friendly

const WEBHOOK_EVENT_NAMES: Record<string, string> = {
  // Vindi common events
  'bill_created': 'Cobrança Criada',
  'bill_paid': 'Cobrança Paga',
  'bill_cancelled': 'Cobrança Cancelada',
  'subscription_created': 'Assinatura Criada',
  'subscription_cancelled': 'Assinatura Cancelada',
  'subscription_activated': 'Assinatura Ativada',
  'subscription_reactivated': 'Assinatura Reativada',
  'subscription_suspended': 'Assinatura Suspensa',
  'customer_created': 'Cliente Criado',
  'customer_updated': 'Cliente Atualizado',
  'payment_method_created': 'Método Pagamento Criado',
  'payment_method_updated': 'Método Pagamento Atualizado',
  'charge_rejected': 'Cobrança Rejeitada',
  'charge_chargeback': 'Estorno de Cobrança',
  'issue_created': 'Problema Criado',
  'issue_resolved': 'Problema Resolvido',
  'test': 'Teste de Webhook',
  'test_webhook': 'Teste de Webhook',
  'unknown': 'Evento Desconhecido',
};

export function formatWebhookEventName(eventType: string): string {
  // ✅ DEFENSIVE: Handle malformed event_type (JSON stored as string)
  let cleanEventType = eventType;

  // Check if eventType is actually a JSON string
  if (eventType && (eventType.startsWith('{') || eventType.startsWith('['))) {
    try {
      const parsed = JSON.parse(eventType);
      // Extract the actual event type from the JSON
      cleanEventType = parsed.type || parsed.event?.type || 'unknown';
      console.warn('[webhookEventFormatter] Extracted event type from JSON:', {
        original: eventType.substring(0, 50) + '...',
        extracted: cleanEventType
      });
    } catch (error) {
      console.error('[webhookEventFormatter] Failed to parse JSON event_type:', error);
      // If parsing fails, try to extract type with regex
      const match = eventType.match(/"type"\s*:\s*"([^"]+)"/);
      if (match && match[1]) {
        cleanEventType = match[1];
      } else {
        cleanEventType = 'unknown';
      }
    }
  }

  // First check if we have a predefined translation
  if (WEBHOOK_EVENT_NAMES[cleanEventType]) {
    return WEBHOOK_EVENT_NAMES[cleanEventType];
  }

  // For unknown events, format them nicely
  let formatted = cleanEventType
    .replace(/_/g, ' ') // Replace underscores with spaces
    .replace(/\b\w/g, l => l.toUpperCase()) // Capitalize each word
    .trim();

  // Truncate if too long (keep max 30 characters)
  if (formatted.length > 30) {
    formatted = formatted.substring(0, 27) + '...';
  }

  return formatted;
}
