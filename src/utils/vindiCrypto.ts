import { CardData } from '@/types/checkout';
import { supabase } from '@/integrations/supabase/client';

interface VindiEnvironment {
  sandbox: string;
  production: string;
}

const VINDI_HOSTED_URLS: VindiEnvironment = {
  sandbox: 'https://sandbox-app.vindi.com.br/api/v1/hosted',
  production: 'https://app.vindi.com.br/api/v1/hosted'
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
   * Encrypts card data using Vindi's hosted endpoints
   * This method calls the vindi-encrypt-card edge function to perform encryption securely
   */
  static async encryptCard(cardData: CardData): Promise<EncryptedCardData> {
    try {
      console.log('[VINDI-CRYPTO] Starting card encryption process');
      
      // Validate card data
      this.validateCardData(cardData);

      // Prepare card data for encryption
      const encryptionData = {
        card_number: cardData.number.replace(/\s/g, ''), // Remove spaces
        card_holder_name: cardData.holder_name,
        card_expiry_month: cardData.expiry_month.padStart(2, '0'),
        card_expiry_year: cardData.expiry_year,
        card_cvv: cardData.cvv,
        public_key: this.getPublicKey(),
        environment: this.getEnvironment()
      };

      console.log('[VINDI-CRYPTO] Sending card data for encryption (sensitive data masked)');

      // Call Supabase edge function for encryption
      const { data, error } = await supabase.functions.invoke('vindi-encrypt-card', {
        body: encryptionData
      });

      if (error) {
        throw new Error(error.message || 'Erro na comunicação com o servidor');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Erro na criptografia do cartão');
      }
      
      if (!data.gateway_token) {
        throw new Error('Token de gateway não recebido');
      }

      console.log('[VINDI-CRYPTO] Card encryption successful');
      
      return {
        gateway_token: data.gateway_token,
        card_brand: data.card_brand || this.detectCardBrand(cardData.number),
        card_last_four: data.card_last_four || cardData.number.replace(/\s/g, '').slice(-4)
      };

    } catch (error) {
      console.error('[VINDI-CRYPTO] Encryption failed:', error);
      throw new Error(`Falha na criptografia do cartão: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
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
   * Gets the hosted URL for the current environment
   */
  static getHostedUrl(): string {
    const environment = this.getEnvironment();
    return VINDI_HOSTED_URLS[environment];
  }
}

// Export utilities for easier access
export const vindiCrypto = VindiCrypto;
export default VindiCrypto;