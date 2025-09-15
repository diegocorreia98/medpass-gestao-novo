import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  Loader2, 
  CreditCard, 
  QrCode, 
  CheckCircle, 
  AlertCircle, 
  Shield, 
  Copy, 
  Clock,
  User,
  Mail,
  Phone,
  MapPin
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { VindiCrypto, type EncryptedCardData } from '@/utils/vindiCrypto';
import { validateCPF, validateCNPJ, validateEmail, validatePhone, validateCreditCard, getCreditCardBrand } from '@/utils/validators';
import { generateQRCodeFromPayload } from '@/utils/pixQRCode';
import InputMask from 'react-input-mask';
import type { Plan, CustomerData, CardData, TransactionResult } from '@/types/checkout';

interface UnifiedTransparentCheckoutProps {
  preSelectedPlan?: Plan;
  customerData?: Partial<CustomerData>; // ✅ NOVO: Dados pré-preenchidos do cliente
  onSuccess?: (result: TransactionResult) => void;
  onCancel?: () => void;
}

type CheckoutState = 'form' | 'processing' | 'pix-payment' | 'success' | 'error';

const BRAZILIAN_STATES = [
  { value: 'AC', label: 'Acre' },
  { value: 'AL', label: 'Alagoas' },
  { value: 'AP', label: 'Amapá' },
  { value: 'AM', label: 'Amazonas' },
  { value: 'BA', label: 'Bahia' },
  { value: 'CE', label: 'Ceará' },
  { value: 'DF', label: 'Distrito Federal' },
  { value: 'ES', label: 'Espírito Santo' },
  { value: 'GO', label: 'Goiás' },
  { value: 'MA', label: 'Maranhão' },
  { value: 'MT', label: 'Mato Grosso' },
  { value: 'MS', label: 'Mato Grosso do Sul' },
  { value: 'MG', label: 'Minas Gerais' },
  { value: 'PA', label: 'Pará' },
  { value: 'PB', label: 'Paraíba' },
  { value: 'PR', label: 'Paraná' },
  { value: 'PE', label: 'Pernambuco' },
  { value: 'PI', label: 'Piauí' },
  { value: 'RJ', label: 'Rio de Janeiro' },
  { value: 'RN', label: 'Rio Grande do Norte' },
  { value: 'RS', label: 'Rio Grande do Sul' },
  { value: 'RO', label: 'Rondônia' },
  { value: 'RR', label: 'Roraima' },
  { value: 'SC', label: 'Santa Catarina' },
  { value: 'SP', label: 'São Paulo' },
  { value: 'SE', label: 'Sergipe' },
  { value: 'TO', label: 'Tocantins' }
];

export function UnifiedTransparentCheckout({ preSelectedPlan, customerData: preFilledCustomerData, onSuccess, onCancel }: UnifiedTransparentCheckoutProps) {
  const [checkoutState, setCheckoutState] = useState<CheckoutState>('form');
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(preSelectedPlan || null);
  const [paymentMethod, setPaymentMethod] = useState<'credit_card' | 'pix'>('credit_card');
  const [error, setError] = useState<string | null>(null);
  const [transactionResult, setTransactionResult] = useState<TransactionResult | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(!preSelectedPlan);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [qrCodeDataURL, setQrCodeDataURL] = useState<string | null>(null);
  const [isGeneratingQRCode, setIsGeneratingQRCode] = useState(false);
  
  // Form data - usar dados pré-preenchidos se fornecidos
  const [customerData, setCustomerData] = useState<Partial<CustomerData>>({
    documentType: 'cpf',
    ...preFilledCustomerData // ✅ NOVO: Dados pré-preenchidos da adesão
  });
  const [cardData, setCardData] = useState<Partial<CardData>>({});
  const [installments, setInstallments] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { toast } = useToast();

  // ✅ NOVO: Aplicar dados pré-preenchidos quando fornecidos
  useEffect(() => {
    if (preFilledCustomerData) {
      console.log('🔄 [UNIFIED-CHECKOUT] Aplicando dados pré-preenchidos:', preFilledCustomerData);
      setCustomerData(prev => ({
        ...prev,
        ...preFilledCustomerData
      }));
    }
  }, [preFilledCustomerData]);

  // Load plans
  useEffect(() => {
    if (!preSelectedPlan) {
      loadPlans();
    }
  }, [preSelectedPlan]);

  // PIX timer countdown
  useEffect(() => {
    if (checkoutState !== 'pix-payment' || !transactionResult?.pix?.expires_at) return;

    const expirationTime = new Date(transactionResult.pix.expires_at).getTime();
    
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const remaining = Math.max(0, expirationTime - now);
      
      setTimeRemaining(remaining);
      
      if (remaining === 0) {
        setError('PIX expirado. Gere um novo código.');
        setCheckoutState('error');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [checkoutState, transactionResult]);

  const loadPlans = async () => {
    try {
      setIsLoadingPlans(true);
      const { data, error } = await supabase
        .from('planos')
        .select('*')
        .eq('ativo', true)
        .order('valor', { ascending: true });

      if (error) throw error;

      const formattedPlans: Plan[] = data.map(plan => ({
        id: plan.id,
        name: plan.nome,
        price: plan.valor,
        description: plan.descricao,
        features: []
      }));

      setPlans(formattedPlans);
    } catch (error) {
      console.error('Error loading plans:', error);
      setError('Erro ao carregar planos');
    } finally {
      setIsLoadingPlans(false);
    }
  };

  const validateField = (field: string, value: string) => {
    const newErrors = { ...errors };
    
    switch (field) {
      case 'name':
        if (!value.trim() || value.trim().length < 3) {
          newErrors[field] = 'Nome deve ter pelo menos 3 caracteres';
        } else {
          delete newErrors[field];
        }
        break;
        
      case 'email':
        if (!validateEmail(value)) {
          newErrors[field] = 'Email inválido';
        } else {
          delete newErrors[field];
        }
        break;
        
      case 'document':
        const docType = customerData.documentType || 'cpf';
        const isValid = docType === 'cpf' ? validateCPF(value) : validateCNPJ(value);
        if (!isValid) {
          newErrors[field] = docType === 'cpf' ? 'CPF inválido' : 'CNPJ inválido';
        } else {
          delete newErrors[field];
        }
        break;
        
      case 'phone':
        if (value && !validatePhone(value)) {
          newErrors[field] = 'Telefone inválido';
        } else {
          delete newErrors[field];
        }
        break;

      // Card validation
      case 'card_number':
        if (paymentMethod === 'credit_card' && !validateCreditCard(value)) {
          newErrors[field] = 'Número do cartão inválido';
        } else {
          delete newErrors[field];
        }
        break;
        
      case 'cvv':
        if (paymentMethod === 'credit_card') {
          const cleanCvv = value.replace(/\D/g, '');
          if (cleanCvv.length < 3 || cleanCvv.length > 4) {
            newErrors[field] = 'CVV deve ter 3 ou 4 dígitos';
          } else {
            delete newErrors[field];
          }
        }
        break;
        
      case 'holder_name':
        if (paymentMethod === 'credit_card' && (!value.trim() || value.trim().length < 3)) {
          newErrors[field] = 'Nome deve ter pelo menos 3 caracteres';
        } else {
          delete newErrors[field];
        }
        break;
    }
    
    setErrors(newErrors);
  };

  const handleCustomerDataChange = (field: keyof CustomerData, value: string) => {
    setCustomerData(prev => ({ ...prev, [field]: value }));
    validateField(field, value);
  };

  const handleCardDataChange = (field: keyof CardData, value: string) => {
    setCardData(prev => ({ ...prev, [field]: value }));
    if (field === 'number') {
      validateField('card_number', value);
    } else {
      validateField(field, value);
    }
  };

  const isFormValid = () => {
    const basicDataValid = !!(
      customerData.name?.trim() &&
      customerData.email?.trim() &&
      customerData.document?.trim() &&
      selectedPlan &&
      Object.keys(errors).length === 0
    );

    if (paymentMethod === 'pix') {
      return basicDataValid;
    }

    // Credit card validation
    const cardValid = !!(
      cardData.holder_name?.trim() &&
      cardData.number?.trim() &&
      cardData.cvv?.trim() &&
      cardData.expiry_month &&
      cardData.expiry_year
    );

    return basicDataValid && cardValid;
  };

  const handleSubmit = async () => {
    if (!isFormValid()) return;

    setCheckoutState('processing');
    setError(null);

    try {
      console.log('[UNIFIED-CHECKOUT] Starting checkout process');

      let encryptedCard: EncryptedCardData | null = null;
      
      // Encrypt card data if credit card payment
      if (paymentMethod === 'credit_card') {
        console.log('[UNIFIED-CHECKOUT] Encrypting card data');
        encryptedCard = await VindiCrypto.encryptCard(cardData as CardData);
      }

      const checkoutPayload = {
        clinicData: customerData,
        planData: selectedPlan,
        paymentMethod,
        cardData: encryptedCard ? {
          holder_name: cardData.holder_name!,
          number: encryptedCard.gateway_token, // Use encrypted token
          cvv: cardData.cvv!,
          expiry_month: cardData.expiry_month!,
          expiry_year: cardData.expiry_year!
        } : undefined,
        installments: paymentMethod === 'credit_card' ? installments : undefined
      };

      console.log('[UNIFIED-CHECKOUT] Calling vindi-transparent-checkout');
      
      const response = await supabase.functions.invoke('vindi-transparent-checkout', {
        body: checkoutPayload
      });

      if (response.error || !response.data?.success) {
        throw new Error(response.error?.message || response.data?.error || 'Erro ao processar pagamento');
      }

      const result = response.data;
      console.log('[UNIFIED-CHECKOUT] Checkout successful:', result);

      // Prepare transaction result
      const transactionResult: TransactionResult = {
        success: true,
        transaction_id: result.subscription_id?.toString(),
        charge_id: result.charge_id?.toString(),
        status: result.status || 'processing',
        pix: result.pix_data ? {
          qr_code: result.pix_data.qr_code,
          qr_code_url: undefined,
          expires_at: result.pix_data.expires_at
        } : undefined
      };

      setTransactionResult(transactionResult);

      if (paymentMethod === 'pix') {
        setCheckoutState('pix-payment');
        
        // Generate QR Code from PIX payload
        if (result.pix_data?.qr_code) {
          setIsGeneratingQRCode(true);
          
          try {
            const qrResult = await generateQRCodeFromPayload(result.pix_data.qr_code);
            
            if (qrResult.success && qrResult.qrCodeDataURL) {
              setQrCodeDataURL(qrResult.qrCodeDataURL);
              console.log('[UNIFIED-CHECKOUT] QR Code image generated successfully');
            } else {
              console.error('[UNIFIED-CHECKOUT] Failed to generate QR Code:', qrResult.error);
              toast({
                title: "Aviso",
                description: "QR Code visual não pôde ser gerado, mas o código PIX está disponível.",
                variant: "destructive",
              });
            }
          } catch (error) {
            console.error('[UNIFIED-CHECKOUT] Error generating QR Code image:', error);
          } finally {
            setIsGeneratingQRCode(false);
          }
        }
        
        toast({
          title: "PIX gerado com sucesso!",
          description: "Use o QR Code ou código PIX para efetuar o pagamento.",
        });
      } else {
        setCheckoutState('success');
        toast({
          title: "Pagamento processado!",
          description: "Sua assinatura foi criada com sucesso.",
        });
      }

      if (onSuccess) {
        onSuccess(transactionResult);
      }

    } catch (error) {
      console.error('[UNIFIED-CHECKOUT] Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setError(errorMessage);
      setCheckoutState('error');
      
      toast({
        title: "Erro no checkout",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: "Código PIX copiado para a área de transferência.",
    });
  };

  const formatTime = (milliseconds: number) => {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = Math.floor((milliseconds % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const renderContent = () => {
    switch (checkoutState) {
      case 'form':
        return (
          <div className="space-y-6">
            {/* Plan Selection */}
            {!preSelectedPlan && (
              <Card>
                <CardHeader>
                  <CardTitle>Selecione seu Plano</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingPlans ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                      {plans.map((plan) => (
                        <Card 
                          key={plan.id} 
                          className={`cursor-pointer transition-colors ${
                            selectedPlan?.id === plan.id ? 'ring-2 ring-primary' : 'hover:border-primary/50'
                          }`}
                          onClick={() => setSelectedPlan(plan)}
                        >
                          <CardContent className="p-4">
                            <h3 className="font-semibold">{plan.name}</h3>
                            <p className="text-2xl font-bold">
                              R$ {plan.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              <span className="text-sm font-normal text-muted-foreground">/mês</span>
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Customer Data */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="w-5 h-5" />
                  <span>Dados da Clínica</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome Completo *</Label>
                  <Input
                    id="name"
                    placeholder="Nome completo da clínica"
                    value={customerData.name || ''}
                    onChange={(e) => handleCustomerDataChange('name', e.target.value)}
                    className={errors.name ? 'border-destructive' : ''}
                  />
                  {errors.name && (
                    <div className="flex items-center text-destructive text-sm">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.name}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="email@clinica.com"
                    value={customerData.email || ''}
                    onChange={(e) => handleCustomerDataChange('email', e.target.value)}
                    className={errors.email ? 'border-destructive' : ''}
                  />
                  {errors.email && (
                    <div className="flex items-center text-destructive text-sm">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.email}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo de Documento *</Label>
                    <Select 
                      value={customerData.documentType || 'cpf'} 
                      onValueChange={(value: 'cpf' | 'cnpj') => {
                        setCustomerData(prev => ({ ...prev, documentType: value }));
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cpf">CPF</SelectItem>
                        <SelectItem value="cnpj">CNPJ</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="document">{customerData.documentType === 'cnpj' ? 'CNPJ' : 'CPF'} *</Label>
                    <InputMask
                      mask={customerData.documentType === 'cnpj' ? '99.999.999/9999-99' : '999.999.999-99'}
                      value={customerData.document || ''}
                      onChange={(e) => handleCustomerDataChange('document', e.target.value)}
                    >
                      {(inputProps: any) => (
                        <Input
                          {...inputProps}
                          id="document"
                          placeholder={customerData.documentType === 'cnpj' ? '00.000.000/0000-00' : '000.000.000-00'}
                          className={errors.document ? 'border-destructive' : ''}
                        />
                      )}
                    </InputMask>
                    {errors.document && (
                      <div className="flex items-center text-destructive text-sm">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        {errors.document}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <InputMask
                    mask="(99) 99999-9999"
                    value={customerData.phone || ''}
                    onChange={(e) => handleCustomerDataChange('phone', e.target.value)}
                  >
                    {(inputProps: any) => (
                      <Input
                        {...inputProps}
                        id="phone"
                        placeholder="(11) 99999-9999"
                        className={errors.phone ? 'border-destructive' : ''}
                      />
                    )}
                  </InputMask>
                  {errors.phone && (
                    <div className="flex items-center text-destructive text-sm">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {errors.phone}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Payment Method */}
            <Card>
              <CardHeader>
                <CardTitle>Método de Pagamento</CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup 
                  value={paymentMethod} 
                  onValueChange={(value: 'credit_card' | 'pix') => setPaymentMethod(value)}
                  className="space-y-3"
                >
                  <div className="flex items-center space-x-2 p-3 border rounded-lg">
                    <RadioGroupItem value="credit_card" id="credit_card" />
                    <CreditCard className="w-5 h-5" />
                    <Label htmlFor="credit_card" className="flex-1 cursor-pointer">
                      <div>
                        <div className="font-medium">💳 Cartão de Crédito</div>
                        <div className="text-sm text-muted-foreground">Aprovação imediata</div>
                      </div>
                    </Label>
                    <Badge variant="secondary">Recomendado</Badge>
                  </div>
                  
                  <div className="flex items-center space-x-2 p-3 border rounded-lg">
                    <RadioGroupItem value="pix" id="pix" />
                    <QrCode className="w-5 h-5" />
                    <Label htmlFor="pix" className="flex-1 cursor-pointer">
                      <div>
                        <div className="font-medium">🔗 PIX</div>
                        <div className="text-sm text-muted-foreground">QR Code será gerado após confirmar</div>
                      </div>
                    </Label>
                    <Badge variant="outline">Mais rápido</Badge>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>

            {/* Credit Card Form */}
            {paymentMethod === 'credit_card' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Shield className="w-5 h-5 text-green-600" />
                    <span>Dados do Cartão</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="card-number">Número do Cartão</Label>
                    <div className="relative">
                      <InputMask
                        mask="9999 9999 9999 9999"
                        value={cardData.number || ''}
                        onChange={(e) => handleCardDataChange('number', e.target.value)}
                      >
                        {(inputProps: any) => (
                          <Input
                            {...inputProps}
                            id="card-number"
                            placeholder="1234 5678 9012 3456"
                            className={errors.card_number ? 'border-destructive' : ''}
                          />
                        )}
                      </InputMask>
                      
                      {getCreditCardBrand(cardData.number || '') !== 'generic' && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                          <div className={`w-8 h-5 rounded text-xs flex items-center justify-center font-bold ${
                            getCreditCardBrand(cardData.number || '') === 'visa' ? 'bg-blue-600 text-white' :
                            getCreditCardBrand(cardData.number || '') === 'mastercard' ? 'bg-red-600 text-white' :
                            getCreditCardBrand(cardData.number || '') === 'amex' ? 'bg-green-600 text-white' :
                            'bg-gray-400 text-white'
                          }`}>
                            {getCreditCardBrand(cardData.number || '').toUpperCase().slice(0, 4)}
                          </div>
                        </div>
                      )}
                    </div>
                    {errors.card_number && (
                      <div className="flex items-center text-destructive text-sm">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        {errors.card_number}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="holder-name">Nome no Cartão</Label>
                    <Input
                      id="holder-name"
                      placeholder="Nome conforme impresso no cartão"
                      value={cardData.holder_name || ''}
                      onChange={(e) => handleCardDataChange('holder_name', e.target.value.toUpperCase())}
                      className={errors.holder_name ? 'border-destructive' : ''}
                    />
                    {errors.holder_name && (
                      <div className="flex items-center text-destructive text-sm">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        {errors.holder_name}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Mês</Label>
                      <Select 
                        value={cardData.expiry_month || ''} 
                        onValueChange={(value) => handleCardDataChange('expiry_month', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="MM" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                            <SelectItem key={month} value={month.toString().padStart(2, '0')}>
                              {month.toString().padStart(2, '0')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Ano</Label>
                      <Select 
                        value={cardData.expiry_year || ''} 
                        onValueChange={(value) => handleCardDataChange('expiry_year', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="AAAA" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 21 }, (_, i) => new Date().getFullYear() + i).map((year) => (
                            <SelectItem key={year} value={year.toString()}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>CVV</Label>
                      <InputMask
                        mask="999"
                        maskChar=""
                        value={cardData.cvv || ''}
                        onChange={(e) => handleCardDataChange('cvv', e.target.value)}
                      >
                        {(inputProps: any) => (
                          <Input
                            {...inputProps}
                            placeholder="123"
                            type="password"
                            className={errors.cvv ? 'border-destructive' : ''}
                          />
                        )}
                      </InputMask>
                      {errors.cvv && (
                        <div className="text-destructive text-xs">{errors.cvv}</div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Parcelamento</Label>
                    <Select 
                      value={installments.toString()} 
                      onValueChange={(value) => setInstallments(parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((i) => {
                          const installmentPrice = (selectedPlan?.price || 0) / i;
                          return (
                            <SelectItem key={i} value={i.toString()}>
                              {i === 1 
                                ? `À vista - R$ ${(selectedPlan?.price || 0).toFixed(2).replace('.', ',')}`
                                : `${i}x de R$ ${installmentPrice.toFixed(2).replace('.', ',')} ${i > 6 ? '(com juros)' : 'sem juros'}`
                              }
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Submit Button */}
            <Button 
              onClick={handleSubmit}
              disabled={!isFormValid()}
              className="w-full"
              size="lg"
            >
              <Shield className="mr-2 h-4 w-4" />
              Confirmar Pagamento
            </Button>
          </div>
        );

      case 'processing':
        return (
          <div className="text-center space-y-4 py-8">
            <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
            <h2 className="text-2xl font-bold">Processando pagamento...</h2>
            <div className="space-y-2 text-muted-foreground">
              {paymentMethod === 'credit_card' ? (
                <>
                  <p>🔐 Criptografando dados do cartão</p>
                  <p>💳 Processando pagamento na Vindi</p>
                </>
              ) : (
                <p>🔐 Gerando código PIX</p>
              )}
            </div>
          </div>
        );

      case 'pix-payment':
        return (
          <div className="space-y-6 text-center py-8">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold flex items-center justify-center gap-2">
                <QrCode className="h-6 w-6" />
                Finalize seu pagamento via PIX
              </h2>
              <Badge variant="outline" className="mx-auto">
                <Clock className="h-4 w-4 mr-1" />
                Expira em: {formatTime(timeRemaining)}
              </Badge>
            </div>

            {transactionResult?.pix?.qr_code && (
              <div className="flex flex-col items-center space-y-4">
                <div className="p-4 bg-white rounded-lg border">
                  {isGeneratingQRCode ? (
                    <div className="w-48 h-48 bg-gray-100 flex flex-col items-center justify-center rounded-lg">
                      <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                      <span className="text-sm text-muted-foreground">Gerando QR Code...</span>
                    </div>
                  ) : transactionResult.pix.qr_code_svg ? (
                    // 🎯 PRIORIDADE: SVG QR Code da Vindi (mais preciso)
                    <div 
                      className="w-48 h-48 flex items-center justify-center"
                      dangerouslySetInnerHTML={{ __html: transactionResult.pix.qr_code_svg }}
                    />
                  ) : qrCodeDataURL ? (
                    <img 
                      src={qrCodeDataURL} 
                      alt="QR Code PIX" 
                      className="w-48 h-48 object-contain"
                    />
                  ) : transactionResult.pix.qr_code_url ? (
                    <img 
                      src={transactionResult.pix.qr_code_url} 
                      alt="QR Code PIX" 
                      className="w-48 h-48 object-contain"
                    />
                  ) : (
                    <div className="w-48 h-48 bg-gray-100 flex flex-col items-center justify-center rounded-lg">
                      <QrCode className="h-16 w-16 text-gray-400 mb-2" />
                      <span className="text-xs text-muted-foreground text-center">QR Code não disponível<br />Use o código PIX abaixo</span>
                    </div>
                  )}
                </div>
                
                {/* ✅ BOTÃO PARA COPIAR PIX COPIA E COLA */}
                <div className="flex flex-col gap-2 w-full max-w-sm">
                  {transactionResult.pix.pix_copia_cola ? (
                    <Button 
                      variant="default" 
                      onClick={() => {
                        copyToClipboard(transactionResult.pix!.pix_copia_cola!);
                        toast({
                          title: "Código PIX copiado! 📱",
                          description: "Cole no seu app do banco para pagar",
                        });
                      }}
                      className="w-full"
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copiar PIX Copia e Cola
                    </Button>
                  ) : (
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        copyToClipboard(transactionResult.pix!.qr_code!);
                        toast({
                          title: "Código PIX copiado!",
                          description: "Cole no seu app do banco para pagar",
                        });
                      }}
                      className="w-full"
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copiar código PIX
                    </Button>
                  )}
                </div>
                
                {/* Show the PIX code in a copyable text area for debugging/fallback */}
                <details className="w-full max-w-sm">
                  <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                    Ver código PIX (debug)
                  </summary>
                  <div className="mt-2 p-2 bg-muted rounded text-xs font-mono break-all">
                    {transactionResult.pix.qr_code}
                  </div>
                </details>
              </div>
            )}

            <div className="space-y-2 text-sm text-muted-foreground">
              <p><strong>Valor:</strong> R$ {selectedPlan?.price.toFixed(2)}</p>
              <div className="text-left max-w-sm mx-auto">
                <p className="font-medium mb-2">Como pagar:</p>
                <ol className="space-y-1">
                  <li>1. Abra o app do seu banco</li>
                  <li>2. Escaneie o QR Code ou cole o código PIX</li>
                  <li>3. Confirme o pagamento</li>
                  <li>4. Sua assinatura será ativada automaticamente</li>
                </ol>
              </div>
            </div>
          </div>
        );

      case 'success':
        return (
          <div className="text-center space-y-4 py-8">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto" />
            <h2 className="text-2xl font-bold text-green-600">Pagamento Confirmado!</h2>
            <p className="text-muted-foreground">
              Sua assinatura foi criada com sucesso e já está ativa.
            </p>
            {transactionResult?.transaction_id && (
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm">
                  <strong>ID da Transação:</strong> {transactionResult.transaction_id}
                </p>
              </div>
            )}
          </div>
        );

      case 'error':
        return (
          <div className="text-center space-y-4 py-8">
            <AlertCircle className="h-16 w-16 text-destructive mx-auto" />
            <h2 className="text-2xl font-bold text-destructive">Erro no Pagamento</h2>
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={() => setCheckoutState('form')} variant="outline">
              Tentar Novamente
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Checkout Transparente</h1>
          <Badge variant="outline">
            <Shield className="h-4 w-4 mr-1" />
            Pagamento Seguro
          </Badge>
        </div>

        {/* Progress Indicator */}
        <div className="flex items-center justify-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${
            ['form', 'processing', 'pix-payment', 'success', 'error'].includes(checkoutState) 
              ? 'bg-primary' 
              : 'bg-muted'
          }`} />
          <div className={`w-8 h-1 ${
            ['processing', 'pix-payment', 'success', 'error'].includes(checkoutState) 
              ? 'bg-primary' 
              : 'bg-muted'
          }`} />
          <div className={`w-3 h-3 rounded-full ${
            ['pix-payment', 'success', 'error'].includes(checkoutState) 
              ? 'bg-primary' 
              : 'bg-muted'
          }`} />
          <div className={`w-8 h-1 ${
            ['success', 'error'].includes(checkoutState) 
              ? 'bg-primary' 
              : 'bg-muted'
          }`} />
          <div className={`w-3 h-3 rounded-full ${
            ['success'].includes(checkoutState) 
              ? 'bg-primary' 
              : 'bg-muted'
          }`} />
        </div>

        {/* Main Content */}
        {renderContent()}

        {/* Order Summary - Show only on form step */}
        {checkoutState === 'form' && selectedPlan && (
          <Card>
            <CardHeader>
              <CardTitle>Resumo do Pedido</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>{selectedPlan.name}</span>
                  <span>R$ {selectedPlan.price.toFixed(2)}</span>
                </div>
                {paymentMethod === 'credit_card' && installments > 1 && (
                  <div className="text-sm text-muted-foreground">
                    {installments}x de R$ {(selectedPlan.price / installments).toFixed(2)}
                  </div>
                )}
                <div className="border-t pt-2 font-bold flex justify-between">
                  <span>Total</span>
                  <span>R$ {selectedPlan.price.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}