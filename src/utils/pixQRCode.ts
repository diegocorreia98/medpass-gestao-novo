import QRCode from 'qrcode';

export interface PixQRCodeOptions {
  pixKey?: string;
  merchantName?: string;
  merchantCity?: string;
  amount?: number;
  transactionId?: string;
  description?: string;
}

export interface PixQRCodeResult {
  success: boolean;
  qrCodeDataURL?: string;
  pixPayload?: string;
  error?: string;
}

/**
 * Validates if a string is a valid PIX payload (EMV/BR Code)
 */
export function validatePixPayload(payload: string): boolean {
  if (!payload || typeof payload !== 'string') {
    return false;
  }

  // PIX payload must start with "000201" (EMV format)
  if (!payload.startsWith('000201')) {
    return false;
  }

  // Must contain BR.GOV.BCB.PIX identifier (merchant account info)
  if (!payload.includes('BR.GOV.BCB.PIX')) {
    return false;
  }

  // Must end with "6304" followed by CRC16 (4 characters)
  const crcPattern = /6304[0-9A-F]{4}$/i;
  if (!crcPattern.test(payload)) {
    return false;
  }

  return true;
}

/**
 * Generates QR Code image from PIX payload (for dynamic PIX from PSP)
 * This is the recommended approach when you receive the payload from Vindi/PSP
 */
export async function generateQRCodeFromPayload(pixPayload: string): Promise<PixQRCodeResult> {
  try {
    console.log('[PIX-QR] Generating QR Code from payload:', pixPayload.substring(0, 50) + '...');

    // Validate payload format
    if (!validatePixPayload(pixPayload)) {
      return {
        success: false,
        error: 'Payload PIX inválido. Deve ser um BR Code válido (EMV format).'
      };
    }

    // Generate QR Code image
    const qrCodeDataURL = await QRCode.toDataURL(pixPayload, {
      type: 'image/png',
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    console.log('[PIX-QR] QR Code generated successfully');

    return {
      success: true,
      qrCodeDataURL,
      pixPayload
    };

  } catch (error) {
    console.error('[PIX-QR] Error generating QR Code:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao gerar QR Code'
    };
  }
}

/**
 * Generates static PIX QR Code (when you have PIX key and amount)
 * SIMPLIFIED VERSION - Use Vindi's SVG QR Code instead when possible
 */
export async function generateStaticPixQRCode(options: PixQRCodeOptions): Promise<PixQRCodeResult> {
  try {
    console.log('[PIX-QR] Static PIX generation requested, but using Vindi SVG is recommended');
    
    return {
      success: false,
      error: 'Use o QR Code SVG fornecido pela Vindi (mais preciso). Esta função foi desabilitada para evitar conflitos.'
    };

  } catch (error) {
    console.error('[PIX-QR] Error in static PIX function:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao gerar PIX estático'
    };
  }
}

/**
 * Extracts information from a PIX payload (for debugging/display)
 */
export function parsePixPayload(payload: string): { [key: string]: string } | null {
  try {
    if (!validatePixPayload(payload)) {
      return null;
    }

    const info: { [key: string]: string } = {};
    
    // Basic parsing - in production you might want to use a proper EMV parser
    info.format = payload.substring(0, 6); // Should be "000201"
    info.valid = validatePixPayload(payload) ? 'true' : 'false';
    info.length = payload.length.toString();
    
    return info;
  } catch {
    return null;
  }
}