export interface Plan {
  id: string;
  name: string;
  price: number;
  description?: string;
  features?: string[];
}

export interface CustomerData {
  name: string;
  email: string;
  document: string;
  documentType: 'cpf' | 'cnpj';
  phone?: string;
  address?: {
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
    zipcode: string;
  };
}

export interface CardData {
  holder_name: string;
  number: string;
  cvv: string;
  expiry_month: string;
  expiry_year: string;
}

export interface PaymentData {
  method: 'credit_card' | 'pix' | 'boleto';
  cardData?: Partial<CardData>;
  installments?: number;
}

export interface CheckoutState {
  step: number;
  selectedPlan: Plan | null;
  customerData: Partial<CustomerData>;
  paymentData: Partial<PaymentData>;
  isProcessing: boolean;
  error: string | null;
}

export type PaymentStatus = 'idle' | 'validating' | 'processing' | 'success' | 'error';

export interface TransactionResult {
  success: boolean;
  transaction_id?: string;
  charge_id?: string;
  status?: string;
  error?: string;
  pix?: {
    qr_code?: string;
    qr_code_url?: string;
    qr_code_base64?: string;
    qr_code_svg?: string; // ✅ SVG QR Code da Vindi (campo qrcode_path)
    pix_copia_cola?: string; // ✅ Código PIX copia e cola (campo qrcode_original_path)
    expires_at?: string;
  };
  boleto?: {
    url?: string;
    barcode?: string;
    due_date?: string;
  };
}