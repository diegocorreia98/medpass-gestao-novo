import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, CreditCard, CheckCircle, AlertCircle, Shield, Copy, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { VindiCrypto, type EncryptedCardData } from '@/utils/vindiCrypto';
import { CardForm } from './CardForm';
import { CustomerForm } from './CustomerForm';
import { OrderSummary } from './OrderSummary';
import { PaymentMethodSelector } from './PaymentMethodSelector';
import type { Plan, CustomerData, CardData, TransactionResult } from '@/types/checkout';

interface TransparentCheckoutProps {
  preSelectedPlan?: Plan;
  onSuccess?: (result: TransactionResult) => void;
  onCancel?: () => void;
}

type CheckoutStep = 'plan' | 'customer' | 'payment-method' | 'payment' | 'processing' | 'awaiting-payment' | 'approved' | 'success' | 'error';

export function TransparentCheckout({ preSelectedPlan, onSuccess, onCancel }: TransparentCheckoutProps) {
  const [currentStep, setCurrentStep] = useState<CheckoutStep>(preSelectedPlan ? 'customer' : 'plan');
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(preSelectedPlan || null);
  const [customerData, setCustomerData] = useState<Partial<CustomerData>>({});
  const [paymentMethod, setPaymentMethod] = useState<'credit_card' | 'pix' | 'boleto' | null>(null);
  const [cardData, setCardData] = useState<Partial<CardData>>({});
  const [installments, setInstallments] = useState(1);
  const [encryptedCardData, setEncryptedCardData] = useState<EncryptedCardData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactionResult, setTransactionResult] = useState<TransactionResult | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState(!preSelectedPlan);
  const [pixExpiresAt, setPixExpiresAt] = useState<Date | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number>(0);

  const { toast } = useToast();

  // Load available plans if not pre-selected
  useEffect(() => {
    if (!preSelectedPlan) {
      loadPlans();
    }
  }, [preSelectedPlan]);

  // Validate Vindi configuration on mount
  useEffect(() => {
    const validation = VindiCrypto.validateConfiguration();
    if (!validation.isValid) {
      setError(`Configuração Vindi inválida: ${validation.errors.join(', ')}`);
      setCurrentStep('error');
    }
  }, []);

  // Real-time listener for transaction status updates
  useEffect(() => {
    if (!transactionResult?.transaction_id || currentStep !== 'awaiting-payment') return;

    console.log('[REALTIME] Setting up listener for transaction:', transactionResult.transaction_id);

    const channel = supabase
      .channel('transaction-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'transactions',
          filter: `subscription_id=eq.${transactionResult.transaction_id}`
        },
        (payload) => {
          console.log('[REALTIME] Transaction status update:', payload);
          
          if (payload.new.status === 'paid') {
            console.log('[REALTIME] Payment confirmed! Redirecting to approved step');
            setCurrentStep('approved');
            
            toast({
              title: "Pagamento confirmado!",
              description: "Seu PIX foi processado com sucesso.",
            });
          }
        }
      )
      .subscribe();

    // Cleanup
    return () => {
      console.log('[REALTIME] Cleaning up channel');
      supabase.removeChannel(channel);
    };
  }, [transactionResult?.transaction_id, currentStep, toast]);

  // PIX timer countdown
  useEffect(() => {
    if (!pixExpiresAt || currentStep !== 'awaiting-payment') return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const expiration = pixExpiresAt.getTime();
      const remaining = Math.max(0, expiration - now);
      
      setTimeRemaining(remaining);
      
      if (remaining === 0) {
        setError('PIX expirado. Gere um novo código.');
        setCurrentStep('error');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [pixExpiresAt, currentStep]);

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
      setCurrentStep('error');
    } finally {
      setIsLoadingPlans(false);
    }
  };

  const handlePlanSelect = (plan: Plan) => {
    setSelectedPlan(plan);
    setCurrentStep('customer');
  };

  const handleCustomerSubmit = (data: CustomerData) => {
    setCustomerData(data);
    setCurrentStep('payment-method');
  };

  const handlePaymentMethodSelect = (method: 'credit_card' | 'pix' | 'boleto') => {
    setPaymentMethod(method);
    if (method === 'credit_card') {
      setCurrentStep('payment');
    } else {
      // For PIX/Boleto, process directly without card form
      handleAlternativePayment(method);
    }
  };

  const handleAlternativePayment = async (method: 'pix' | 'boleto') => {
    if (!selectedPlan || !customerData.name) return;

    setIsProcessing(true);
    setError(null);
    setCurrentStep('processing');

    try {
      console.log('[TRANSPARENT-CHECKOUT] Starting', method, 'payment');

      // Use transparent-checkout-payment for PIX/Boleto
      const paymentResponse = await supabase.functions.invoke('transparent-checkout-payment', {
        body: {
          customer_name: customerData.name,
          customer_email: customerData.email,
          customer_document: customerData.document,
          customer_phone: customerData.phone,
          plan_id: selectedPlan.id,
          payment_method: method,
          environment: 'production'
        }
      });

      if (paymentResponse.error || !paymentResponse.data?.success) {
        throw new Error(paymentResponse.error?.message || `Erro ao processar ${method.toUpperCase()}`);
      }

      const result = paymentResponse.data;
      console.log('[TRANSPARENT-CHECKOUT]', method.toUpperCase(), 'created successfully:', result);

      // Prepare transaction result
      const transactionResult: TransactionResult = {
        success: true,
        transaction_id: result.subscription_id?.toString(),
        charge_id: result.charge_id?.toString(),
        status: result.status || 'pending',
        pix: method === 'pix' && result.pix ? {
          qr_code: result.pix.qr_code,
          qr_code_url: result.pix.qr_code_url,
          expires_at: result.pix.expires_at
        } : undefined,
        boleto: method === 'boleto' && result.boleto ? {
          url: result.boleto.url,
          barcode: result.boleto.barcode,
          due_date: result.boleto.due_date
        } : undefined
      };

      console.log('[TRANSPARENT-CHECKOUT] Transaction result prepared:', transactionResult);
      setTransactionResult(transactionResult);

      // For PIX, show awaiting-payment step with QR code
      if (method === 'pix') {
        setCurrentStep('awaiting-payment');
        
        // Set PIX expiration
        if (result.pix?.expires_at) {
          setPixExpiresAt(new Date(result.pix.expires_at));
        } else {
          // Default 30 minutes expiration if not provided
          setPixExpiresAt(new Date(Date.now() + 30 * 60 * 1000));
        }
      } else {
        // For Boleto, show success immediately
        setCurrentStep('success');
      }

      toast({
        title: method === 'pix' ? "PIX gerado com sucesso!" : "Boleto gerado com sucesso!",
        description: method === 'pix' 
          ? "Use o QR Code ou código PIX para efetuar o pagamento." 
          : "Acesse o boleto para efetuar o pagamento.",
      });

      if (onSuccess) {
        onSuccess(transactionResult);
      }

    } catch (error) {
      console.error('[TRANSPARENT-CHECKOUT]', method, 'failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setError(errorMessage);
      setCurrentStep('error');
      
      toast({
        title: `Erro no ${method.toUpperCase()}`,
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCardSubmit = async (data: CardData, selectedInstallments: number) => {
    if (!selectedPlan) return;

    setIsProcessing(true);
    setError(null);
    setCurrentStep('processing');

    try {
      console.log('[TRANSPARENT-CHECKOUT] Starting card encryption');
      
      // Step 1: Encrypt card data using Vindi
      const encrypted = await VindiCrypto.encryptCard(data);
      setEncryptedCardData(encrypted);
      
      console.log('[TRANSPARENT-CHECKOUT] Card encrypted successfully');
      
      // Step 2: Create/update customer
      const customerResponse = await supabase.functions.invoke('vindi-hosted-customer', {
        body: {
          name: customerData!.name,
          email: customerData!.email,
          registry_code: customerData!.document,
          phone: customerData!.phone,
          environment: 'production'
        }
      });

      if (customerResponse.error || !customerResponse.data?.success) {
        throw new Error(customerResponse.error?.message || 'Erro ao processar cliente');
      }

      const vindiCustomerId = customerResponse.data.vindi_customer_id;
      console.log('[TRANSPARENT-CHECKOUT] Customer processed:', vindiCustomerId);

      // Step 3: Create subscription with encrypted card
      const subscriptionResponse = await supabase.functions.invoke('vindi-hosted-subscription', {
        body: {
          customer_name: customerData!.name,
          customer_email: customerData!.email,
          customer_document: customerData!.document,
          customer_phone: customerData!.phone,
          plan_id: selectedPlan.id,
          payment_method: 'credit_card',
          gateway_token: encrypted.gateway_token,
          installments: selectedInstallments,
          environment: 'production'
        }
      });

      if (subscriptionResponse.error || !subscriptionResponse.data?.success) {
        throw new Error(subscriptionResponse.error?.message || 'Erro ao criar assinatura');
      }

      const result = subscriptionResponse.data;
      console.log('[TRANSPARENT-CHECKOUT] Subscription created successfully');

      // Prepare transaction result
      const transactionResult: TransactionResult = {
        success: true,
        transaction_id: result.subscription_id?.toString(),
        charge_id: result.charge_id?.toString(),
        status: result.status || 'processing',
        pix: result.pix_qr_code ? {
          qr_code: result.pix_qr_code,
          qr_code_url: result.pix_qr_code_url,
          expires_at: result.due_date
        } : undefined,
        boleto: result.payment_url ? {
          url: result.payment_url,
          barcode: result.barcode,
          due_date: result.due_date
        } : undefined
      };

      setTransactionResult(transactionResult);
      setCurrentStep('success');

      toast({
        title: "Pagamento processado!",
        description: result.status === 'paid' 
          ? "Seu pagamento foi confirmado com sucesso." 
          : "Sua assinatura foi criada e o pagamento está sendo processado.",
      });

      if (onSuccess) {
        onSuccess(transactionResult);
      }

    } catch (error) {
      console.error('[TRANSPARENT-CHECKOUT] Payment failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      setError(errorMessage);
      setCurrentStep('error');
      
      toast({
        title: "Erro no pagamento",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRetry = () => {
    setError(null);
    setTransactionResult(null);
    setEncryptedCardData(null);
    setPaymentMethod(null);
    setCurrentStep('payment-method');
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'plan':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold">Escolha seu plano</h2>
              <p className="text-muted-foreground">Selecione o plano que melhor atende suas necessidades</p>
            </div>
            
            {isLoadingPlans ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {plans.map((plan) => (
                  <Card key={plan.id} className="p-6 cursor-pointer hover:border-primary transition-colors" onClick={() => handlePlanSelect(plan)}>
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold">{plan.name}</h3>
                        {plan.description && <p className="text-sm text-muted-foreground">{plan.description}</p>}
                      </div>
                      <div className="text-2xl font-bold">
                        R$ {plan.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        <span className="text-sm font-normal text-muted-foreground">/mês</span>
                      </div>
                      <Button className="w-full">Selecionar</Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        );

      case 'customer':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold">Dados pessoais</h2>
              <p className="text-muted-foreground">Informe seus dados para continuar</p>
            </div>
            <CustomerForm 
              customerData={customerData} 
              onSubmit={handleCustomerSubmit}
            />
          </div>
        );

      case 'payment-method':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold">Método de Pagamento</h2>
              <p className="text-muted-foreground">Como você gostaria de pagar?</p>
            </div>
            <PaymentMethodSelector
              selectedMethod={paymentMethod}
              onSelectMethod={handlePaymentMethodSelect}
            />
          </div>
        );

      case 'payment':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold flex items-center justify-center gap-2">
                <Shield className="h-6 w-6 text-green-600" />
                Pagamento Seguro
              </h2>
              <p className="text-muted-foreground">Seus dados são criptografados com tecnologia Vindi</p>
              <Badge variant="outline" className="mt-2">
                <CreditCard className="h-4 w-4 mr-1" />
                Checkout Transparente
              </Badge>
            </div>
            
            {encryptedCardData && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  Cartão criptografado com sucesso • {encryptedCardData.card_brand?.toUpperCase()} **** {encryptedCardData.card_last_four}
                </AlertDescription>
              </Alert>
            )}
            
            <CardForm
              cardData={cardData}
              installments={installments}
              planPrice={selectedPlan?.price || 0}
              onCardDataChange={setCardData}
              onInstallmentsChange={setInstallments}
              onSubmit={(cardData, installments) => handleCardSubmit(cardData, installments)}
              isProcessing={isProcessing}
            />
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
                  {encryptedCardData && <p>✅ Cartão criptografado com sucesso</p>}
                  <p>💳 Processando pagamento na Vindi</p>
                </>
              ) : paymentMethod === 'pix' ? (
                <p>🔐 Gerando código PIX</p>
              ) : (
                <p>📋 Gerando boleto bancário</p>
              )}
              <p>🏥 Criando sua assinatura MedPass</p>
            </div>
          </div>
        );

      case 'success':
        return (
          <div className="text-center space-y-6 py-8">
            <CheckCircle className="h-16 w-16 mx-auto text-green-600" />
            <div>
              <h2 className="text-2xl font-bold text-green-600">
                {paymentMethod === 'credit_card' ? 'Pagamento realizado com sucesso!' : 
                 paymentMethod === 'pix' ? 'PIX gerado com sucesso!' : 
                 'Boleto gerado com sucesso!'}
              </h2>
              <p className="text-muted-foreground">
                {paymentMethod === 'credit_card' ? 'Sua assinatura MedPass foi ativada' :
                 paymentMethod === 'pix' ? 'Use o QR Code abaixo para efetuar o pagamento' :
                 'Acesse o boleto para efetuar o pagamento'}
              </p>
            </div>
            
            {transactionResult && (
              <div className="space-y-4">
                <Card className="p-4 text-left">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Status:</span>
                      <Badge variant={transactionResult.status === 'paid' ? 'default' : 'secondary'} className="ml-2">
                        {transactionResult.status === 'paid' ? 'Pago' : 'Processando'}
                      </Badge>
                    </div>
                    <div>
                      <span className="font-medium">Plano:</span>
                      <span className="ml-2">{selectedPlan?.name}</span>
                    </div>
                    <div>
                      <span className="font-medium">Valor:</span>
                      <span className="ml-2">R$ {selectedPlan?.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div>
                      <span className="font-medium">Parcelas:</span>
                      <span className="ml-2">{installments}x</span>
                    </div>
                  </div>
                </Card>

                {/* PIX QR Code */}
                {transactionResult.pix && (
                  <Card className="p-4">
                    <h3 className="font-semibold mb-2">Código PIX</h3>
                    <div className="space-y-2">
                      {transactionResult.pix.qr_code_url && (
                        <img src={transactionResult.pix.qr_code_url} alt="QR Code PIX" className="mx-auto max-w-48" />
                      )}
                      <p className="text-xs text-muted-foreground break-all">{transactionResult.pix.qr_code}</p>
                    </div>
                  </Card>
                )}

                {/* Boleto */}
                {transactionResult.boleto && (
                  <Card className="p-4">
                    <h3 className="font-semibold mb-2">Boleto Bancário</h3>
                    <Button asChild className="w-full">
                      <a href={transactionResult.boleto.url} target="_blank" rel="noopener noreferrer">
                        Visualizar Boleto
                      </a>
                    </Button>
                  </Card>
                )}
              </div>
            )}

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                ✅ Dados criptografados com segurança Vindi<br/>
                🏥 Integração automática com sistema RMS<br/>
                📧 Confirmação enviada por email
              </p>
            </div>
          </div>
        );

      case 'awaiting-payment':
        return (
          <div className="text-center space-y-6 py-8">
            <div className="flex items-center justify-center gap-2">
              <Clock className="h-8 w-8 text-orange-500" />
              <h2 className="text-2xl font-bold">Aguardando pagamento PIX</h2>
            </div>
            
            <div className="text-muted-foreground">
              <p>Use o QR Code ou código PIX abaixo para efetuar o pagamento</p>
              {timeRemaining > 0 && (
                <p className="mt-2 text-orange-600 font-medium">
                  ⏰ Expira em: {Math.floor(timeRemaining / 60000)}:{String(Math.floor((timeRemaining % 60000) / 1000)).padStart(2, '0')}
                </p>
              )}
            </div>

            {transactionResult?.pix && (
              <Card className="p-6">
                <div className="space-y-4">
                  {/* QR Code Display - Priority: SVG > URL > Base64 */}
                  <div className="flex justify-center">
                    {transactionResult.pix.qr_code_svg ? (
                      // 🎯 PRIORIDADE: SVG QR Code da Vindi (mais preciso)
                      <div 
                        className="w-48 h-48 p-2 bg-white border rounded-lg flex items-center justify-center"
                        dangerouslySetInnerHTML={{ __html: transactionResult.pix.qr_code_svg }}
                      />
                    ) : transactionResult.pix.qr_code_url ? (
                      <img 
                        src={transactionResult.pix.qr_code_url} 
                        alt="QR Code PIX" 
                        className="w-48 h-48 border rounded-lg"
                      />
                    ) : transactionResult.pix.qr_code_base64 ? (
                      <img 
                        src={transactionResult.pix.qr_code_base64.startsWith('data:') 
                          ? transactionResult.pix.qr_code_base64 
                          : `data:image/png;base64,${transactionResult.pix.qr_code_base64}`
                        } 
                        alt="QR Code PIX" 
                        className="w-48 h-48 border rounded-lg"
                      />
                    ) : null}
                  </div>
                  
                  {/* PIX Code - Priorizar campo copia e cola da Vindi */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-center">Código PIX (Copia e Cola)</h3>
                    
                    {/* ✅ CÓDIGO PIX COPIA E COLA (PRIORITÁRIO) */}
                    {transactionResult.pix.pix_copia_cola ? (
                      <div className="space-y-2">
                        <div className="p-3 bg-muted rounded-lg border">
                          <code className="text-xs font-mono break-all text-center block">
                            {transactionResult.pix.pix_copia_cola}
                          </code>
                        </div>
                        <Button
                          size="lg"
                          onClick={() => {
                            navigator.clipboard.writeText(transactionResult.pix!.pix_copia_cola!);
                            toast({
                              title: "PIX Copia e Cola copiado! 📱",
                              description: "Cole no seu app do banco para pagar",
                            });
                          }}
                          className="w-full"
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Copiar PIX Copia e Cola
                        </Button>
                      </div>
                    ) : transactionResult.pix.qr_code ? (
                      <div className="space-y-2">
                        <div className="p-3 bg-muted rounded-lg border">
                          <code className="text-xs font-mono break-all text-center block">
                            {transactionResult.pix.qr_code}
                          </code>
                        </div>
                        <Button
                          size="lg"
                          variant="outline"
                          onClick={() => {
                            navigator.clipboard.writeText(transactionResult.pix!.qr_code!);
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
                      </div>
                    ) : null}
                  </div>

                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Após o pagamento, você será redirecionado automaticamente para a confirmação.
                    </AlertDescription>
                  </Alert>
                </div>
              </Card>
            )}

            <div className="space-x-4">
              <Button 
                variant="outline" 
                onClick={() => {
                  setCurrentStep('payment-method');
                  setTransactionResult(null);
                  setPixExpiresAt(null);
                }}
              >
                Gerar Novo PIX
              </Button>
              {onCancel && (
                <Button variant="outline" onClick={onCancel}>Cancelar</Button>
              )}
            </div>
          </div>
        );

      case 'approved':
        return (
          <div className="text-center space-y-6 py-8">
            <CheckCircle className="h-16 w-16 mx-auto text-green-600" />
            <div>
              <h2 className="text-2xl font-bold text-green-600">Pagamento aprovado!</h2>
              <p className="text-muted-foreground">Sua assinatura MedPass foi ativada com sucesso</p>
            </div>

            <Card className="p-4 text-left">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Status:</span>
                  <Badge variant="default" className="ml-2">Pago</Badge>
                </div>
                <div>
                  <span className="font-medium">Plano:</span>
                  <span className="ml-2">{selectedPlan?.name}</span>
                </div>
                <div>
                  <span className="font-medium">Valor:</span>
                  <span className="ml-2">R$ {selectedPlan?.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
                <div>
                  <span className="font-medium">Método:</span>
                  <span className="ml-2">PIX</span>
                </div>
              </div>
            </Card>

            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                ✅ Pagamento confirmado via PIX<br/>
                🏥 Integração automática com sistema RMS<br/>
                📧 Confirmação enviada por email
              </p>
            </div>

            <Button 
              className="w-full"
              onClick={() => {
                if (onSuccess) {
                  onSuccess({
                    ...transactionResult!,
                    status: 'paid'
                  });
                }
              }}
            >
              Continuar
            </Button>
          </div>
        );

      case 'error':
        return (
          <div className="text-center space-y-6 py-8">
            <AlertCircle className="h-16 w-16 mx-auto text-destructive" />
            <div>
              <h2 className="text-2xl font-bold text-destructive">Erro no processamento</h2>
              <p className="text-muted-foreground">Ocorreu um problema ao processar seu pagamento</p>
            </div>
            
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-x-4">
              <Button onClick={handleRetry}>Tentar Novamente</Button>
              {onCancel && (
                <Button variant="outline" onClick={onCancel}>Cancelar</Button>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Progress Steps */}
          {currentStep !== 'processing' && currentStep !== 'success' && currentStep !== 'error' && (
            <div className="flex justify-center mb-8">
              <div className="flex items-center space-x-4">
                {[
                  { key: 'plan', label: 'Plano', icon: '1' },
                  { key: 'customer', label: 'Dados', icon: '2' },
                  { key: 'payment-method', label: 'Método', icon: '3' },
                  { key: 'payment', label: 'Pagamento', icon: '4' }
                ].map((step, index) => (
                  <div key={step.key} className="flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      currentStep === step.key || 
                      (currentStep === 'customer' && step.key === 'plan') || 
                      (currentStep === 'payment-method' && ['plan', 'customer'].includes(step.key)) ||
                      (currentStep === 'payment' && ['plan', 'customer', 'payment-method'].includes(step.key))
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted text-muted-foreground'
                    }`}>
                      {step.icon}
                    </div>
                    <span className="ml-2 text-sm font-medium">{step.label}</span>
                    {index < 3 && <div className="w-8 h-px bg-muted mx-4" />}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              <Card className="p-6">
                {renderStepContent()}
              </Card>
            </div>

            {/* Order Summary - Only show when plan is selected */}
            {selectedPlan && currentStep !== 'success' && currentStep !== 'error' && (
              <div className="lg:col-span-1">
                <OrderSummary 
                  plan={selectedPlan}
                  installments={installments}
                  customerData={customerData}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}