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
};

export function formatWebhookEventName(eventType: string): string {
  // First check if we have a predefined translation
  if (WEBHOOK_EVENT_NAMES[eventType]) {
    return WEBHOOK_EVENT_NAMES[eventType];
  }

  // For unknown events, format them nicely
  let formatted = eventType
    .replace(/_/g, ' ') // Replace underscores with spaces
    .replace(/\b\w/g, l => l.toUpperCase()) // Capitalize each word
    .trim();

  // Truncate if too long (keep max 30 characters)
  if (formatted.length > 30) {
    formatted = formatted.substring(0, 27) + '...';
  }

  return formatted;
}
