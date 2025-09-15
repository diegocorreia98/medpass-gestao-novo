import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Loader2, CreditCard, Smartphone, CheckCircle, AlertCircle, Clock, Copy, QrCode } from 'lucide-react';
import { PaymentMethodSelector } from './PaymentMethodSelector';
import { CardForm } from './CardForm';
import { CustomerForm } from './CustomerForm';
import { toast } from '@/hooks/use-toast';

interface SubscriptionData {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_document: string;
  plan_price: number;
  plan_id: string;
  planos?: {
    nome: string;
    descricao: string;
    valor: number;
  };
}

interface PaymentResult {
  success: boolean;
  bill_id: string;
  status: string;
  pix_qr_code?: string;
  pix_qr_code_url?: string;
  pix_code?: string;
  due_at?: string;
}

interface SubscriptionCheckoutFormProps {
  token: string;
}

type CheckoutStep = 'payment' | 'awaiting-payment' | 'approved';

export function SubscriptionCheckoutForm({ token }: SubscriptionCheckoutFormProps) {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<CheckoutStep>('payment');
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'credit_card' | 'pix'>('credit_card');
  const [cardData, setCardData] = useState({
    number: '',
    cvv: '',
    holder_name: '',
    expiry_month: '',
    expiry_year: '',
  });
  const [customerData, setCustomerData] = useState({
    name: '',
    email: '',
    cpf: '',
    phone: '',
    address: {
      street: '',
      number: '',
      neighborhood: '',
      city: '',
      state: '',
      zipcode: '',
    },
  });
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(0);

  useEffect(() => {
    fetchSubscriptionData();
  }, [token]);

  // Timer effect for PIX expiration
  useEffect(() => {
    if (currentStep === 'awaiting-payment' && paymentResult?.due_at) {
      const dueDate = new Date(paymentResult.due_at);
      const interval = setInterval(() => {
        const now = new Date();
        const diff = Math.max(0, Math.floor((dueDate.getTime() - now.getTime()) / 1000));
        setTimeLeft(diff);
        
        if (diff === 0) {
          clearInterval(interval);
          toast({
            title: "PIX Expirado",
            description: "O código PIX expirou. Gere um novo pagamento.",
            variant: "destructive",
          });
          setCurrentStep('payment');
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [currentStep, paymentResult?.due_at]);

  // Realtime listener for transaction status updates
  useEffect(() => {
    if (currentStep === 'awaiting-payment' && subscriptionData?.id) {
      const channel = supabase
        .channel('subscription-payment-updates')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'transactions',
            filter: `subscription_id=eq.${subscriptionData.id}`,
          },
          (payload) => {
            console.log('Transaction update received:', payload);
            const newTransaction = payload.new as any;
            
            if (newTransaction.status === 'paid') {
              console.log('Payment confirmed! Transitioning to approved step');
              setCurrentStep('approved');
              toast({
                title: "Pagamento Confirmado!",
                description: "Seu pagamento foi processado com sucesso.",
              });
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [currentStep, subscriptionData?.id]);

  const fetchSubscriptionData = async () => {
    try {
      console.log('Buscando dados do checkout com token:', token);
      
      // Usar edge function segura para validação de checkout
      const { data, error } = await supabase.functions.invoke('secure-checkout-validation', {
        body: { token }
      });

      console.log('Resposta da validação segura:', data);

      if (error || !data?.success) {
        console.error('Link inválido ou expirado:', error || data?.error);
        toast({
          title: "Erro",
          description: data?.error || "Link de pagamento inválido ou expirado",
          variant: "destructive",
        });
        navigate('/');
        return;
      }

      const checkoutData = data.data;
      
      // Processar dados já mascarados vindos da edge function segura
      const processedData = {
        id: checkoutData.id,
        customer_name: checkoutData.customer_name, // Já mascarado pela função
        customer_email: checkoutData.customer_email, // Já mascarado pela função  
        customer_document: checkoutData.customer_document, // Sempre mascarado
        plan_id: '', // Não expostos no checkout por segurança
        plan_price: checkoutData.plan_price,
        payment_method: checkoutData.payment_method,
        status: checkoutData.status,
        planos: {
          nome: checkoutData.plan_name,
          descricao: 'Plano de saúde',
          valor: checkoutData.plan_price
        }
      };
      
      console.log('Dados da subscription processados (seguros e mascarados):', processedData);
      setSubscriptionData(processedData);
      
      // Pre-fill customer data com dados mascarados (para exibição apenas)
      setCustomerData(prev => ({
        ...prev,
        name: processedData.customer_name || '',
        email: processedData.customer_email || '',
        cpf: processedData.customer_document || '',
      }));

    } catch (error) {
      console.error('Error fetching subscription data:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados da assinatura",
        variant: "destructive",
      });
      navigate('/');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!subscriptionData) return;

    setIsProcessing(true);
    try {
      const paymentData = {
        token,
        paymentMethod: selectedPaymentMethod,
        customerData,
        ...(selectedPaymentMethod === 'credit_card' && { cardData }),
      };

      const { data, error } = await supabase.functions.invoke('process-subscription-payment', {
        body: paymentData,
      });

      if (error) throw error;

      if (data.success) {
        setPaymentResult(data);
        
        if (selectedPaymentMethod === 'pix') {
          setCurrentStep('awaiting-payment');
          toast({
            title: "PIX Gerado!",
            description: "Escaneie o QR Code ou copie o código para pagar.",
          });
        } else {
          // For credit card, check status immediately
          if (data.status === 'paid') {
            setCurrentStep('approved');
            toast({
              title: "Pagamento Aprovado!",
              description: "Seu cartão foi processado com sucesso.",
            });
          } else {
            setCurrentStep('awaiting-payment');
            toast({
              title: "Processando Pagamento",
              description: "Aguardando confirmação do pagamento...",
            });
          }
        }
      } else {
        throw new Error(data.error || 'Erro no processamento do pagamento');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: "Erro no pagamento",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const copyPixCode = useCallback(() => {
    if (paymentResult?.pix_code) {
      navigator.clipboard.writeText(paymentResult.pix_code).then(() => {
        toast({
          title: "Código copiado!",
          description: "O código PIX foi copiado para a área de transferência.",
        });
      });
    }
  }, [paymentResult?.pix_code]);

  const formatTime = useCallback((seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, []);

  const isFormValid = () => {
    if (selectedPaymentMethod === 'credit_card') {
      return cardData.number && cardData.cvv && cardData.holder_name && 
             cardData.expiry_month && cardData.expiry_year &&
             customerData.name && customerData.email && customerData.cpf;
    }
    return customerData.name && customerData.email && customerData.cpf;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!subscriptionData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold">Assinatura não encontrada</h1>
          <p className="text-muted-foreground">O link pode ter expirado ou ser inválido</p>
        </div>
      </div>
    );
  }

  // Approved step - redirect to success
  if (currentStep === 'approved') {
    setTimeout(() => navigate('/'), 3000);
    
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-green-600">Pagamento Confirmado!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-muted-foreground">
              Seu pagamento foi processado com sucesso. Você será redirecionado em alguns segundos.
            </p>
            <Button onClick={() => navigate('/')} className="w-full">
              Ir para o Início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Awaiting payment step
  if (currentStep === 'awaiting-payment' && paymentResult) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            {selectedPaymentMethod === 'pix' ? (
              <QrCode className="h-12 w-12 text-primary mx-auto mb-4" />
            ) : (
              <Clock className="h-12 w-12 text-primary mx-auto mb-4" />
            )}
            <CardTitle>
              {selectedPaymentMethod === 'pix' ? 'Pagamento PIX' : 'Processando Pagamento'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedPaymentMethod === 'pix' && (
              <>
                {timeLeft > 0 && (
                  <div className="text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                    <Clock className="h-4 w-4" />
                    Expira em: {formatTime(timeLeft)}
                  </div>
                )}

                <div className="flex justify-center">
                  {paymentResult.pix_qr_svg ? (
                    // 🎯 PRIORIDADE: SVG QR Code da Vindi (mais preciso e limpo)
                    <div 
                      className="w-48 h-48 p-2 bg-white border rounded-lg flex items-center justify-center"
                      dangerouslySetInnerHTML={{ __html: paymentResult.pix_qr_svg }}
                    />
                  ) : paymentResult.pix_qr_code_url ? (
                    <img 
                      src={paymentResult.pix_qr_code_url} 
                      alt="QR Code PIX" 
                      className="w-48 h-48 border rounded-lg"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                      }}
                    />
                  ) : paymentResult.pix_qr_code ? (
                    <img
                      src={paymentResult.pix_qr_code.startsWith('data:') ? paymentResult.pix_qr_code : `data:image/png;base64,${paymentResult.pix_qr_code}`}
                      alt="QR Code PIX"
                      className="w-48 h-48 border rounded-lg"
                    />
                  ) : (
                    <div className="w-48 h-48 bg-gray-100 flex flex-col items-center justify-center rounded-lg border">
                      <QrCode className="h-16 w-16 text-gray-400 mb-2" />
                      <span className="text-xs text-muted-foreground text-center">QR Code não disponível<br />Use o código PIX abaixo</span>
                    </div>
                  )}
                </div>

                {/* ✅ CÓDIGO PIX COPIA E COLA - MELHORADO */}
                {(paymentResult.pix_copia_cola || paymentResult.pix_code) && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-semibold text-center">
                      {paymentResult.pix_copia_cola ? 'Código PIX (Copia e Cola)' : 'Código PIX'}
                    </h4>
                    
                    <div className="space-y-2">
                      <div className="p-3 bg-muted rounded-lg border">
                        <code className="text-xs font-mono break-all text-center block">
                          {paymentResult.pix_copia_cola || paymentResult.pix_code}
                        </code>
                      </div>
                      
                      <Button
                        size="lg"
                        variant={paymentResult.pix_copia_cola ? "default" : "outline"}
                        onClick={() => {
                          const pixCode = paymentResult.pix_copia_cola || paymentResult.pix_code;
                          navigator.clipboard.writeText(pixCode!);
                          toast({
                            title: paymentResult.pix_copia_cola ? "PIX Copia e Cola copiado! 📱" : "Código PIX copiado!",
                            description: "Cole no seu app do banco para pagar",
                          });
                        }}
                        className="w-full"
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        {paymentResult.pix_copia_cola ? 'Copiar PIX Copia e Cola' : 'Copiar código PIX'}
                      </Button>
                    </div>
                  </div>
                )}

                <div className="text-center text-sm text-muted-foreground">
                  Aguardando confirmação do pagamento...
                </div>
              </>
            )}

            {selectedPaymentMethod === 'credit_card' && (
              <div className="text-center space-y-2">
                <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                <p className="text-sm text-muted-foreground">
                  Processando pagamento no cartão de crédito...
                </p>
              </div>
            )}

            <Button 
              variant="outline" 
              onClick={() => setCurrentStep('payment')} 
              className="w-full"
            >
              Voltar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Payment form step
  return (
    <div className="min-h-screen p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">Finalizar Assinatura</h1>
          <p className="text-muted-foreground">Complete os dados para ativar seu plano</p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Resumo da Assinatura
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-semibold">{subscriptionData.planos?.nome}</h3>
                <p className="text-sm text-muted-foreground">
                  {subscriptionData.planos?.descricao}
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Cliente:</span>
                  <span className="text-sm">{subscriptionData.customer_name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Email:</span>
                  <span className="text-sm">{subscriptionData.customer_email}</span>
                </div>
                <div className="flex justify-between">
                  <span>Documento:</span>
                  <span className="text-sm">{subscriptionData.customer_document}</span>
                </div>
              </div>

              <Separator />

              <div className="flex justify-between items-center text-lg font-semibold">
                <span>Total Mensal:</span>
                <span>
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                  }).format(subscriptionData.plan_price || subscriptionData.planos?.valor || 0)}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Payment Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Método de Pagamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <PaymentMethodSelector
                selectedMethod={selectedPaymentMethod}
                onSelectMethod={(method) => setSelectedPaymentMethod(method as 'credit_card' | 'pix')}
                hideMethod="boleto"
              />

              {selectedPaymentMethod === 'credit_card' && (
                <CardForm
                  cardData={cardData}
                  onCardDataChange={(data) => setCardData(prev => ({ ...prev, ...data }))}
                  installments={1}
                  onInstallmentsChange={() => {}}
                  planPrice={subscriptionData.plan_price || subscriptionData.planos?.valor || 0}
                />
              )}

              <CustomerForm
                customerData={customerData}
                onCustomerDataChange={(data) => setCustomerData(prev => ({ ...prev, ...data }))}
                prefilled={true}
              />

              <Button
                onClick={handlePayment}
                disabled={!isFormValid() || isProcessing}
                className="w-full"
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {selectedPaymentMethod === 'pix' ? 'Gerando QR Code...' : 'Processando...'}
                  </>
                ) : selectedPaymentMethod === 'pix' ? (
                  `Gerar QR Code ${new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                  }).format(subscriptionData.plan_price || subscriptionData.planos?.valor || 0)}`
                ) : (
                  `Pagar ${new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                  }).format(subscriptionData.plan_price || subscriptionData.planos?.valor || 0)}`
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}