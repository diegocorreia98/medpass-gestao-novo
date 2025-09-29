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
    console.log('[PIX-VALIDATOR] Invalid payload: not a string or empty');
    return false;
  }

  // Remove any whitespace
  payload = payload.trim();

  // PIX payload must have minimum length (typically 100+ chars)
  if (payload.length < 50) {
    console.log('[PIX-VALIDATOR] Invalid payload: too short', { length: payload.length });
    return false;
  }

  // PIX payload must start with "000201" (EMV format)
  if (!payload.startsWith('000201')) {
    console.log('[PIX-VALIDATOR] Invalid payload: does not start with 000201', { start: payload.substring(0, 10) });
    return false;
  }

  // Must contain BR.GOV.BCB.PIX identifier (merchant account info)
  if (!payload.includes('BR.GOV.BCB.PIX')) {
    console.log('[PIX-VALIDATOR] Invalid payload: missing BR.GOV.BCB.PIX identifier');
    return false;
  }

  // Must end with "6304" followed by CRC16 (4 characters)
  const crcPattern = /6304[0-9A-F]{4}$/i;
  if (!crcPattern.test(payload)) {
    console.log('[PIX-VALIDATOR] Invalid payload: invalid CRC format', { end: payload.substring(-10) });
    return false;
  }

  console.log('[PIX-VALIDATOR] Valid PIX payload detected', { length: payload.length });
  return true;
}

/**
 * Generates QR Code image from PIX payload (for dynamic PIX from PSP)
 * This is the recommended approach when you receive the payload from Vindi/PSP
 */
export async function generateQRCodeFromPayload(pixPayload: string): Promise<PixQRCodeResult> {
  try {
    console.log('[PIX-QR] Generating QR Code from payload:', {
      payloadLength: pixPayload?.length || 0,
      payloadStart: pixPayload?.substring(0, 50) + '...',
      timestamp: new Date().toISOString()
    });

    // Clean and validate payload
    const cleanPayload = pixPayload?.trim();
    if (!cleanPayload) {
      return {
        success: false,
        error: 'Payload PIX não fornecido ou vazio.'
      };
    }

    // Validate payload format
    if (!validatePixPayload(cleanPayload)) {
      return {
        success: false,
        error: 'Payload PIX inválido. Deve ser um BR Code válido (EMV format).'
      };
    }

    // Generate QR Code image with improved settings
    const qrCodeDataURL = await QRCode.toDataURL(cleanPayload, {
      type: 'image/png',
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M' // Medium error correction for better reliability
    });

    console.log('[PIX-QR] QR Code generated successfully', {
      dataURLLength: qrCodeDataURL.length,
      isValidDataURL: qrCodeDataURL.startsWith('data:image/png;base64,')
    });

    return {
      success: true,
      qrCodeDataURL,
      pixPayload: cleanPayload
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
 * Processes PIX data from Vindi response and extracts usable information
 */
export function processVindiPixData(gatewayFields: any): {
  pixCode?: string;
  qrCodeUrl?: string;
  qrCodeBase64?: string;
  printUrl?: string;
  dueAt?: string;
  success: boolean;
  error?: string;
} {
  try {
    console.log('[PIX-PROCESSOR] Processing Vindi gateway fields:', {
      availableFields: Object.keys(gatewayFields || {}),
      timestamp: new Date().toISOString()
    });

    if (!gatewayFields || typeof gatewayFields !== 'object') {
      return {
        success: false,
        error: 'Gateway response fields não fornecidos ou inválidos'
      };
    }

    // Extract PIX code (EMV) from various possible fields
    const pixCode =
      gatewayFields.qr_code_text ||
      gatewayFields.emv ||
      gatewayFields.copy_paste ||
      gatewayFields.pix_copia_cola ||
      gatewayFields.pix_code ||
      (gatewayFields.qrcode_original_path && gatewayFields.qrcode_original_path.startsWith('00020101')
        ? gatewayFields.qrcode_original_path : null);

    // Extract QR Code URL from various possible fields
    let qrCodeUrl =
      gatewayFields.qr_code_image_url ||
      gatewayFields.qr_code_url ||
      gatewayFields.qr_code_img_url ||
      null;

    // If qrcode_path exists and looks like a URL or path, process it
    if (!qrCodeUrl && gatewayFields.qrcode_path) {
      const qrPath = gatewayFields.qrcode_path;
      if (qrPath.startsWith('http')) {
        qrCodeUrl = qrPath;
      } else if (qrPath.startsWith('/')) {
        // Relative path - would need base URL to construct full URL
        console.log('[PIX-PROCESSOR] Found relative QR path:', qrPath);
      }
    }

    // Extract other useful fields
    const qrCodeBase64 =
      gatewayFields.qr_code_base64 ||
      gatewayFields.qr_code_png_base64 ||
      gatewayFields.qr_code_b64 ||
      null;

    const printUrl =
      gatewayFields.print_url ||
      gatewayFields.qr_code_print_url ||
      null;

    const dueAt =
      gatewayFields.expires_at ||
      gatewayFields.due_at ||
      gatewayFields.max_days_to_keep_waiting_payment ||
      null;

    const result = {
      pixCode,
      qrCodeUrl,
      qrCodeBase64,
      printUrl,
      dueAt,
      success: !!(pixCode || qrCodeUrl || qrCodeBase64 || printUrl)
    };

    console.log('[PIX-PROCESSOR] Processing result:', {
      hasPixCode: !!pixCode,
      hasQrCodeUrl: !!qrCodeUrl,
      hasQrCodeBase64: !!qrCodeBase64,
      hasPrintUrl: !!printUrl,
      hasDueAt: !!dueAt,
      success: result.success
    });

    if (!result.success) {
      return {
        ...result,
        error: 'Nenhum dado PIX válido encontrado nos campos de resposta'
      };
    }

    return result;

  } catch (error) {
    console.error('[PIX-PROCESSOR] Error processing Vindi PIX data:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erro ao processar dados PIX'
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
    info.hasPixIdentifier = payload.includes('BR.GOV.BCB.PIX') ? 'true' : 'false';

    // Extract amount if present (field 54)
    const amountMatch = payload.match(/54\d{2}(\d+\.?\d*)/);
    if (amountMatch) {
      info.amount = amountMatch[1];
    }

    return info;
  } catch (error) {
    console.error('[PIX-PARSER] Error parsing PIX payload:', error);
    return null;
  }
}