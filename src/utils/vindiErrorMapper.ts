/**
 * Vindi Error Mapper
 * Maps Vindi API error codes to user-friendly messages
 * Based on ABECS standardization and Vindi documentation
 */

export type ErrorCategory = 'reversible' | 'irreversible' | 'user_action' | 'system';
export type ErrorAction = 'retry' | 'use_another_card' | 'fix_data' | 'contact_bank' | 'use_another_method';

export interface MappedError {
  title: string;
  message: string;
  category: ErrorCategory;
  suggestedAction: ErrorAction;
  canRetry: boolean;
  userFriendly: string;
}

/**
 * Common Vindi error patterns and their mappings
 */
const ERROR_MAPPINGS: Record<string, MappedError> = {
  // Tokenization errors
  'timeout': {
    title: 'Tempo esgotado',
    message: 'A validação do cartão demorou muito tempo.',
    category: 'reversible',
    suggestedAction: 'retry',
    canRetry: true,
    userFriendly: '⏱️ Tempo esgotado. Por favor, tente novamente.'
  },

  'network_error': {
    title: 'Erro de conexão',
    message: 'Não foi possível conectar ao servidor de pagamento.',
    category: 'reversible',
    suggestedAction: 'retry',
    canRetry: true,
    userFriendly: '🌐 Erro de conexão. Verifique sua internet e tente novamente.'
  },

  // Card validation errors
  'invalid_card_number': {
    title: 'Número do cartão inválido',
    message: 'O número do cartão informado é inválido.',
    category: 'user_action',
    suggestedAction: 'fix_data',
    canRetry: false,
    userFriendly: '💳 Número do cartão inválido. Verifique os dados e tente novamente.'
  },

  'invalid_cvv': {
    title: 'CVV incorreto',
    message: 'O código de segurança (CVV) está incorreto.',
    category: 'user_action',
    suggestedAction: 'fix_data',
    canRetry: false,
    userFriendly: '🔐 CVV incorreto. Verifique o código de segurança no verso do cartão.'
  },

  'expired_card': {
    title: 'Cartão expirado',
    message: 'O cartão informado está vencido.',
    category: 'irreversible',
    suggestedAction: 'use_another_card',
    canRetry: false,
    userFriendly: '📅 Cartão vencido. Por favor, use outro cartão.'
  },

  // Transaction denied errors
  'card_declined': {
    title: 'Cartão recusado',
    message: 'A operadora do cartão recusou a transação.',
    category: 'irreversible',
    suggestedAction: 'use_another_card',
    canRetry: false,
    userFriendly: '❌ Cartão recusado pela operadora. Tente outro cartão ou método de pagamento.'
  },

  'insufficient_funds': {
    title: 'Saldo insuficiente',
    message: 'O cartão não possui limite disponível para esta transação.',
    category: 'reversible',
    suggestedAction: 'contact_bank',
    canRetry: false,
    userFriendly: '💰 Saldo insuficiente. Verifique o limite do seu cartão ou use outro método.'
  },

  'restricted_card': {
    title: 'Cartão bloqueado',
    message: 'O cartão está bloqueado ou com restrições.',
    category: 'irreversible',
    suggestedAction: 'contact_bank',
    canRetry: false,
    userFriendly: '🚫 Cartão bloqueado. Entre em contato com seu banco.'
  },

  'fraud_suspected': {
    title: 'Suspeita de fraude',
    message: 'A transação foi bloqueada por suspeita de fraude.',
    category: 'irreversible',
    suggestedAction: 'contact_bank',
    canRetry: false,
    userFriendly: '🛡️ Transação bloqueada por segurança. Entre em contato com seu banco.'
  },

  // API/System errors
  'api_error': {
    title: 'Erro no processamento',
    message: 'Ocorreu um erro ao processar o pagamento.',
    category: 'system',
    suggestedAction: 'retry',
    canRetry: true,
    userFriendly: '⚠️ Erro no processamento. Por favor, tente novamente.'
  },

  'payment_profile_error': {
    title: 'Erro ao salvar cartão',
    message: 'Não foi possível salvar os dados do cartão.',
    category: 'system',
    suggestedAction: 'retry',
    canRetry: true,
    userFriendly: '💾 Erro ao processar dados do cartão. Tente novamente.'
  },

  'subscription_error': {
    title: 'Erro ao criar assinatura',
    message: 'Não foi possível criar a assinatura.',
    category: 'system',
    suggestedAction: 'retry',
    canRetry: true,
    userFriendly: '📋 Erro ao criar assinatura. Por favor, tente novamente.'
  },

  // Generic fallback
  'unknown_error': {
    title: 'Erro desconhecido',
    message: 'Ocorreu um erro inesperado.',
    category: 'system',
    suggestedAction: 'use_another_method',
    canRetry: true,
    userFriendly: '❓ Erro inesperado. Tente novamente ou use outro método de pagamento.'
  }
};

/**
 * Common gateway response codes from Vindi/Cielo/Rede
 */
const GATEWAY_CODE_MAPPINGS: Record<string, string> = {
  // Success
  '00': 'success',
  '4': 'success',
  '6': 'success',

  // Declined - Reversible
  '05': 'card_declined',
  '51': 'insufficient_funds',
  '65': 'card_declined',
  '75': 'card_declined',
  '91': 'api_error',
  '96': 'api_error',

  // Declined - Irreversible
  '04': 'restricted_card',
  '07': 'restricted_card',
  '14': 'invalid_card_number',
  '41': 'restricted_card',
  '43': 'restricted_card',
  '54': 'expired_card',
  '57': 'restricted_card',
  '59': 'fraud_suspected',
  '62': 'restricted_card',
  '63': 'restricted_card',

  // Invalid data
  '82': 'invalid_cvv',
  '83': 'invalid_cvv',
  'N7': 'invalid_cvv',
};

/**
 * Maps a Vindi error to a user-friendly error object
 */
export function mapVindiError(error: Error | string, gatewayCode?: string): MappedError {
  const errorMessage = typeof error === 'string' ? error : error.message;
  const lowerError = errorMessage.toLowerCase();

  // Check for timeout
  if (lowerError.includes('timeout') || lowerError.includes('aborted')) {
    return ERROR_MAPPINGS.timeout;
  }

  // Check for network errors
  if (lowerError.includes('network') || lowerError.includes('fetch') || lowerError.includes('connection')) {
    return ERROR_MAPPINGS.network_error;
  }

  // Check gateway code first
  if (gatewayCode) {
    const mappedCode = GATEWAY_CODE_MAPPINGS[gatewayCode];
    if (mappedCode && ERROR_MAPPINGS[mappedCode]) {
      return ERROR_MAPPINGS[mappedCode];
    }
  }

  // Check for specific error patterns
  if (lowerError.includes('card_number') || lowerError.includes('número do cartão')) {
    return ERROR_MAPPINGS.invalid_card_number;
  }

  if (lowerError.includes('cvv') || lowerError.includes('código de segurança')) {
    return ERROR_MAPPINGS.invalid_cvv;
  }

  if (lowerError.includes('expirado') || lowerError.includes('expired') || lowerError.includes('validade')) {
    return ERROR_MAPPINGS.expired_card;
  }

  if (lowerError.includes('recusad') || lowerError.includes('declined') || lowerError.includes('negad')) {
    return ERROR_MAPPINGS.card_declined;
  }

  if (lowerError.includes('saldo') || lowerError.includes('insufficient') || lowerError.includes('limite')) {
    return ERROR_MAPPINGS.insufficient_funds;
  }

  if (lowerError.includes('bloqueado') || lowerError.includes('blocked') || lowerError.includes('restricted')) {
    return ERROR_MAPPINGS.restricted_card;
  }

  if (lowerError.includes('fraude') || lowerError.includes('fraud')) {
    return ERROR_MAPPINGS.fraud_suspected;
  }

  if (lowerError.includes('payment profile') || lowerError.includes('payment_profile')) {
    return ERROR_MAPPINGS.payment_profile_error;
  }

  if (lowerError.includes('subscription') || lowerError.includes('assinatura')) {
    return ERROR_MAPPINGS.subscription_error;
  }

  if (lowerError.includes('tokeniza') || lowerError.includes('gateway_token')) {
    return ERROR_MAPPINGS.payment_profile_error;
  }

  // Fallback to generic error
  return ERROR_MAPPINGS.unknown_error;
}

/**
 * Gets action button text based on suggested action
 */
export function getActionButtonText(action: ErrorAction): string {
  const texts: Record<ErrorAction, string> = {
    retry: 'Tentar Novamente',
    use_another_card: 'Usar Outro Cartão',
    fix_data: 'Corrigir Dados',
    contact_bank: 'Entendi',
    use_another_method: 'Usar Outro Método'
  };

  return texts[action] || 'Voltar';
}

/**
 * Gets icon for error category
 */
export function getErrorIcon(category: ErrorCategory): string {
  const icons: Record<ErrorCategory, string> = {
    reversible: '🔄',
    irreversible: '❌',
    user_action: '✏️',
    system: '⚠️'
  };

  return icons[category] || '❓';
}
