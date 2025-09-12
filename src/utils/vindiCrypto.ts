import { CardData } from '@/types/checkout';

interface VindiEnvironment {
  sandbox: string;
  production: string;
}

const VINDI_PUBLIC_URLS: VindiEnvironment = {
  sandbox: 'https://sandbox-app.vindi.com.br/api/v1/public',
  production: 'https://app.vindi.com.br/api/v1/public'
};

const VINDI_PRIVATE_URLS: VindiEnvironment = {
  sandbox: 'https://sandbox-app.vindi.com.br/api/v1',
  production: 'https://app.vindi.com.br/api/v1'
};

export interface VindiKeys {
  publicKey: string;
  environment: 'sandbox' | 'production';
}

export interface EncryptedCardData {
  gateway_token: string;
  card_brand?: string;
  card_last_four?: string;
}

/**
 * Vindi Crypto utility for transparent checkout
 * Encrypts card data using Vindi's official encryption process
 */
export class VindiCrypto {
  private static getPublicKey(): string {
    // Get public key from environment
    const publicKey = import.meta.env.VITE_VINDI_PUBLIC_KEY;
    if (!publicKey) {
      throw new Error('Chave pública Vindi não configurada');
    }
    return publicKey;
  }

  private static getEnvironment(): 'sandbox' | 'production' {
    const env = import.meta.env.VITE_VINDI_ENVIRONMENT || 'sandbox';
    return env as 'sandbox' | 'production';
  }

  /**
   * Creates a payment profile (tokenization) using Vindi's public API
   * This method follows the transparent checkout specification by calling Vindi directly from frontend
   */
  static async encryptCard(cardData: CardData): Promise<EncryptedCardData> {
    try {
      console.log('[VINDI-CRYPTO] Starting card tokenization via Vindi public API');
      
      // Validate card data
      this.validateCardData(cardData);

      // Prepare payment profile data for Vindi's public API
      const paymentProfileData = {
        holder_name: cardData.holder_name.trim(),
        card_number: cardData.number.replace(/\s/g, ''), // Remove spaces
        card_cvv: cardData.cvv,
        card_expiry_month: cardData.expiry_month.padStart(2, '0'),
        card_expiry_year: cardData.expiry_year,
        allow_as_fallback: false
      };

      console.log('[VINDI-CRYPTO] Calling Vindi public payment_profiles endpoint');

      // Call Vindi's public API for tokenization (as per specification)
      const response = await fetch(`${this.getPublicUrl()}/payment_profiles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${btoa(this.getPublicKey() + ':')}`
        },
        body: JSON.stringify(paymentProfileData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.errors?.[0]?.message || `HTTP ${response.status}`;
        throw new Error(`Vindi API error: ${errorMessage}`);
      }

      const result = await response.json();
      
      if (!result.payment_profile?.gateway_token) {
        throw new Error('Gateway token não recebido da Vindi');
      }

      console.log('[VINDI-CRYPTO] Tokenization successful, gateway_token received');
      
      const paymentProfile = result.payment_profile;
      
      return {
        gateway_token: paymentProfile.gateway_token,
        card_brand: paymentProfile.card_company_name?.toLowerCase() || this.detectCardBrand(cardData.number),
        card_last_four: paymentProfile.card_number_first_six?.slice(-4) || cardData.number.replace(/\s/g, '').slice(-4)
      };

    } catch (error) {
      console.error('[VINDI-CRYPTO] Tokenization failed:', error);
      throw new Error(`Falha na tokenização do cartão: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Validates card data before encryption
   */
  private static validateCardData(cardData: CardData): void {
    if (!cardData.number || cardData.number.replace(/\s/g, '').length < 13) {
      throw new Error('Número do cartão inválido');
    }

    if (!cardData.holder_name || cardData.holder_name.trim().length < 2) {
      throw new Error('Nome do portador inválido');
    }

    if (!cardData.cvv || cardData.cvv.length < 3) {
      throw new Error('CVV inválido');
    }

    if (!cardData.expiry_month || !cardData.expiry_year) {
      throw new Error('Data de validade inválida');
    }

    // Validate expiry date
    const month = parseInt(cardData.expiry_month);
    const year = parseInt(cardData.expiry_year);
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    if (month < 1 || month > 12) {
      throw new Error('Mês de validade inválido');
    }

    if (year < currentYear || (year === currentYear && month < currentMonth)) {
      throw new Error('Cartão expirado');
    }
  }

  /**
   * Detects card brand from card number
   */
  private static detectCardBrand(cardNumber: string): string {
    const number = cardNumber.replace(/\s/g, '');
    
    // Visa
    if (/^4/.test(number)) return 'visa';
    
    // Mastercard
    if (/^5[1-5]/.test(number) || /^2[2-7]/.test(number)) return 'mastercard';
    
    // American Express
    if (/^3[47]/.test(number)) return 'amex';
    
    // Diners
    if (/^3[0689]/.test(number)) return 'diners';
    
    // Discover
    if (/^6/.test(number)) return 'discover';
    
    // Elo
    if (/^(4011|4312|4389|4514|4573|6277|6362|6363)/.test(number)) return 'elo';
    
    // Hipercard
    if (/^(3841|6062)/.test(number)) return 'hipercard';
    
    return 'unknown';
  }

  /**
   * Validates Vindi configuration
   */
  static validateConfiguration(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    try {
      const publicKey = this.getPublicKey();
      if (publicKey.includes('private')) {
        errors.push('Chave pública configurada incorretamente');
      }
    } catch (error) {
      errors.push('Chave pública não configurada');
    }
    
    const environment = this.getEnvironment();
    if (!['sandbox', 'production'].includes(environment)) {
      errors.push('Ambiente Vindi inválido');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Gets the public API URL for the current environment (for tokenization)
   */
  static getPublicUrl(): string {
    const environment = this.getEnvironment();
    return VINDI_PUBLIC_URLS[environment];
  }

  /**
   * Gets the private API URL for the current environment (for backend operations)
   */
  static getPrivateUrl(): string {
    const environment = this.getEnvironment();
    return VINDI_PRIVATE_URLS[environment];
  }
}

/**
 * Token information interface for better type safety
 */
export interface TokenInfo {
  gateway_token: string;
  expires_at: Date;
  created_at: Date;
  is_expired: boolean;
}

/**
 * Utility class for managing gateway tokens
 */
export class GatewayTokenManager {
  private static readonly TOKEN_TTL_MINUTES = 5;

  /**
   * Creates a token info object with expiration tracking
   */
  static createTokenInfo(gateway_token: string): TokenInfo {
    const now = new Date();
    const expires_at = new Date(now.getTime() + (this.TOKEN_TTL_MINUTES * 60 * 1000));
    
    return {
      gateway_token,
      expires_at,
      created_at: now,
      is_expired: false
    };
  }

  /**
   * Checks if a token is expired
   */
  static isTokenExpired(tokenInfo: TokenInfo): boolean {
    return new Date() > tokenInfo.expires_at;
  }

  /**
   * Gets remaining TTL in milliseconds
   */
  static getRemainingTTL(tokenInfo: TokenInfo): number {
    const remaining = tokenInfo.expires_at.getTime() - new Date().getTime();
    return Math.max(0, remaining);
  }
}

// Export utilities for easier access
export const vindiCrypto = VindiCrypto;
export default VindiCrypto;