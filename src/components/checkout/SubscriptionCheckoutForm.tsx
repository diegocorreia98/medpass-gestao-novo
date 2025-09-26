import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
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
  pix_qr_svg?: string; // ✅ SVG do QR Code da Vindi
  pix_code?: string;
  pix_copia_cola?: string; // ✅ Código PIX copia e cola
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

  const fetchSubscriptionData = useCallback(async () => {
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
        // payment_method: checkoutData.payment_method, // ❌ REMOVIDO: usuário escolhe no frontend
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
  }, [token, navigate]);

  useEffect(() => {
    fetchSubscriptionData();
  }, [fetchSubscriptionData]);

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
            const newTransaction = payload.new as { status: string; id: string };
            
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
        // 🔍 DEBUG: Log detalhado da resposta do backend
        console.log('🔍 [PAYMENT DEBUG] Resposta completa do backend:', data);
        console.log('🔍 [PAYMENT DEBUG] Campos PIX na resposta:', {
          pix_qr_svg: data.pix_qr_svg ? `${data.pix_qr_svg.substring(0, 100)}...` : 'VAZIO',
          pix_qr_code_url: data.pix_qr_code_url || 'VAZIO',
          pix_qr_code: data.pix_qr_code ? `${data.pix_qr_code.substring(0, 50)}...` : 'VAZIO',
          pix_code: data.pix_code || 'VAZIO',
          pix_copia_cola: data.pix_copia_cola || 'VAZIO',
          pix_print_url: data.pix_print_url || 'VAZIO',
          pix_qr_base64: data.pix_qr_base64 ? `${data.pix_qr_base64.substring(0, 50)}...` : 'VAZIO',
          due_at: data.due_at || 'VAZIO',
          pix_object: data.pix || 'VAZIO'
        });

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


  const formatTime = useCallback((seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, []);

  // 🎯 FUNÇÃO PARA RENDERIZAR QR CODE COM DEBUG DETALHADO
  const renderPixQr = useCallback((r: PaymentResult) => {
    // 🔍 DEBUG: Log detalhado dos dados PIX recebidos
    console.log('🔍 [PIX DEBUG] PaymentResult completo:', r);
    console.log('🔍 [PIX DEBUG] Campos PIX disponíveis:', {
      pix_qr_svg: r.pix_qr_svg ? `${r.pix_qr_svg.substring(0, 100)}...` : 'VAZIO',
      pix_qr_code_url: r.pix_qr_code_url || 'VAZIO',
      pix_qr_code: r.pix_qr_code ? `${r.pix_qr_code.substring(0, 50)}...` : 'VAZIO',
      pix_code: r.pix_code || 'VAZIO',
      pix_copia_cola: r.pix_copia_cola || 'VAZIO',
      due_at: r.due_at || 'VAZIO'
    });

    const s = (r.pix_qr_svg || '').trim();

    // 1) Se vier MARKUP SVG, injeta como HTML
    if (s.startsWith('<svg')) {
      console.log('✅ [PIX DEBUG] Renderizando QR Code como SVG inline');
      return (
        <div
          className="w-32 h-32 sm:w-40 sm:h-40 lg:w-48 lg:h-48 p-2 bg-white border rounded-lg flex items-center justify-center mx-auto touch-manipulation"
          dangerouslySetInnerHTML={{ __html: s }}
        />
      );
    }

    // 2) Se vier DATA URI (svg ou png), usa <img>
    if (s.startsWith('data:image/')) {
      console.log('✅ [PIX DEBUG] Renderizando QR Code como Data URI');
      return (
        <img
          src={s}
          alt="QR Code PIX"
          className="w-32 h-32 sm:w-40 sm:h-40 lg:w-48 lg:h-48 border rounded-lg bg-white p-2 mx-auto touch-manipulation"
          onLoad={() => console.log('✅ [PIX DEBUG] QR Code Data URI carregou com sucesso')}
          onError={(e) => {
            console.error('❌ [PIX DEBUG] Erro ao carregar QR Code Data URI:', e);
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
          }}
        />
      );
    }

    // 3) Se vier URL http(s), usa <img>
    if (/^https?:\/\//i.test(s)) {
      console.log('✅ [PIX DEBUG] Renderizando QR Code como URL HTTP:', s);
      return (
        <img
          src={s}
          alt="QR Code PIX"
          className="w-32 h-32 sm:w-40 sm:h-40 lg:w-48 lg:h-48 border rounded-lg bg-white p-2 mx-auto touch-manipulation"
          onLoad={() => console.log('✅ [PIX DEBUG] QR Code URL carregou com sucesso')}
          onError={(e) => {
            console.error('❌ [PIX DEBUG] Erro ao carregar QR Code URL:', s, e);
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
          }}
        />
      );
    }

    // 4) Fallback para pix_qr_code_url
    if (r.pix_qr_code_url) {
      console.log('✅ [PIX DEBUG] Usando fallback pix_qr_code_url:', r.pix_qr_code_url);
      return (
        <img
          src={r.pix_qr_code_url}
          alt="QR Code PIX"
          className="w-32 h-32 sm:w-40 sm:h-40 lg:w-48 lg:h-48 border rounded-lg bg-white p-2 mx-auto touch-manipulation"
          onLoad={() => console.log('✅ [PIX DEBUG] QR Code URL fallback carregou com sucesso')}
          onError={(e) => {
            console.error('❌ [PIX DEBUG] Erro ao carregar QR Code URL fallback:', r.pix_qr_code_url, e);
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
          }}
        />
      );
    }

    // 5) Fallback para pix_qr_code (base64)
    if (r.pix_qr_code) {
      const src = r.pix_qr_code.startsWith('data:')
        ? r.pix_qr_code
        : `data:image/png;base64,${r.pix_qr_code}`;
      console.log('✅ [PIX DEBUG] Usando fallback pix_qr_code (base64)');
      return (
        <img
          src={src}
          alt="QR Code PIX"
          className="w-32 h-32 sm:w-40 sm:h-40 lg:w-48 lg:h-48 border rounded-lg bg-white p-2 mx-auto touch-manipulation"
          onLoad={() => console.log('✅ [PIX DEBUG] QR Code base64 carregou com sucesso')}
          onError={(e) => {
            console.error('❌ [PIX DEBUG] Erro ao carregar QR Code base64:', e);
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
          }}
        />
      );
    }

    // 6) NOVO: Tentar buscar em campos alternativos que podem existir
    const alternativeFields = [
      r.pix?.qr_code_url,
      r.pix?.qr_code_svg,
      r.pix?.qr_code_base64,
      (r as unknown as { qr_code_url?: string }).qr_code_url,
      (r as unknown as { qr_code_svg?: string }).qr_code_svg,
      (r as unknown as { qr_code_base64?: string }).qr_code_base64
    ].filter(Boolean);

    if (alternativeFields.length > 0) {
      console.log('✅ [PIX DEBUG] Tentando campos alternativos:', alternativeFields);
      const altField = alternativeFields[0];

      if (typeof altField === 'string') {
        if (altField.startsWith('data:image/') || /^https?:\/\//i.test(altField)) {
          return (
            <img
              src={altField}
              alt="QR Code PIX"
              className="w-32 h-32 sm:w-40 sm:h-40 lg:w-48 lg:h-48 border rounded-lg bg-white p-2 mx-auto touch-manipulation"
              onLoad={() => console.log('✅ [PIX DEBUG] QR Code campo alternativo carregou com sucesso')}
              onError={(e) => {
                console.error('❌ [PIX DEBUG] Erro ao carregar QR Code campo alternativo:', altField, e);
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
          );
        }
      }
    }

    // 7) Nenhum QR Code encontrado: placeholder com debug
    console.warn('⚠️ [PIX DEBUG] Nenhum QR Code encontrado em nenhum campo! Mostrando placeholder.');
    return (
      <div className="w-32 h-32 sm:w-40 sm:h-40 lg:w-48 lg:h-48 bg-gray-100 flex flex-col items-center justify-center rounded-lg border mx-auto">
        <QrCode className="h-8 w-8 sm:h-12 sm:w-12 lg:h-16 lg:w-16 text-gray-400 mb-2" />
        <span className="text-xs text-muted-foreground text-center px-2">
          QR Code não disponível<br />Use o código PIX abaixo
        </span>
      </div>
    );
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
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-6">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 sm:h-12 sm:w-12 animate-spin mx-auto text-primary" />
          <p className="text-sm sm:text-base text-muted-foreground" aria-live="polite">
            Carregando dados do pagamento...
          </p>
        </div>
      </div>
    );
  }

  if (!subscriptionData) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-6">
        <div className="text-center max-w-md mx-auto">
          <AlertCircle
            className="h-12 w-12 sm:h-16 sm:w-16 text-destructive mx-auto mb-4 sm:mb-6"
            aria-hidden="true"
          />
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2 sm:mb-4">
            Assinatura não encontrada
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground">
            O link pode ter expirado ou ser inválido
          </p>
        </div>
      </div>
    );
  }

  // Approved step - redirect to success
  if (currentStep === 'approved') {
    setTimeout(() => navigate('/'), 3000);

    return (
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-6">
        <Card className="w-full max-w-sm sm:max-w-md">
          <CardHeader className="text-center space-y-4 p-6 sm:p-8">
            <CheckCircle className="h-12 w-12 sm:h-16 sm:w-16 text-green-500 mx-auto" />
            <CardTitle className="text-lg sm:text-xl text-green-600">Pagamento Confirmado!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center p-6 sm:p-8 pt-0">
            <p className="text-sm sm:text-base text-muted-foreground">
              Seu pagamento foi processado com sucesso. Você será redirecionado em alguns segundos.
            </p>
            <Button
              onClick={() => navigate('/')}
              className="w-full h-12 sm:h-14 text-base touch-manipulation"
              size="lg"
            >
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
      <div className="min-h-screen flex items-center justify-center p-4 sm:p-6">
        <Card className="w-full max-w-sm sm:max-w-lg">
          <CardHeader className="text-center space-y-4 p-4 sm:p-6">
            {selectedPaymentMethod === 'pix' ? (
              <QrCode className="h-12 w-12 sm:h-16 sm:w-16 text-primary mx-auto" />
            ) : (
              <Clock className="h-12 w-12 sm:h-16 sm:w-16 text-primary mx-auto" />
            )}
            <CardTitle className="text-lg sm:text-xl">
              {selectedPaymentMethod === 'pix' ? 'Pagamento PIX' : 'Processando Pagamento'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 p-4 sm:p-6 pt-0">
            {selectedPaymentMethod === 'pix' && (
              <>
                {timeLeft > 0 && (
                  <div
                    className="text-center text-sm sm:text-base text-muted-foreground flex items-center justify-center gap-2 p-3 bg-muted rounded-lg"
                    role="timer"
                    aria-live="polite"
                    aria-label={`PIX expira em ${formatTime(timeLeft)}`}
                  >
                    <Clock className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
                    <span className="font-medium">Expira em: {formatTime(timeLeft)}</span>
                  </div>
                )}

                <div className="flex justify-center">
                  {renderPixQr(paymentResult)}
                </div>

                {/* ✅ CÓDIGO PIX COPIA E COLA - MOBILE OTIMIZADO */}
                {(paymentResult.pix_copia_cola || paymentResult.pix_code) && (
                  <div className="space-y-4">
                    <h4 className="text-sm sm:text-base font-semibold text-center">
                      {paymentResult.pix_copia_cola ? 'Código PIX (Copia e Cola)' : 'Código PIX'}
                    </h4>

                    <div className="space-y-3">
                      <div className="p-4 bg-muted rounded-lg border border-dashed">
                        <code className="text-xs sm:text-sm font-mono break-all text-center block leading-relaxed">
                          {paymentResult.pix_copia_cola || paymentResult.pix_code}
                        </code>
                      </div>

                      <Button
                        size="lg"
                        variant={paymentResult.pix_copia_cola ? "default" : "outline"}
                        onClick={async () => {
                          const pixCode = paymentResult.pix_copia_cola || paymentResult.pix_code;
                          try {
                            await navigator.clipboard.writeText(pixCode!);
                            toast({
                              title: paymentResult.pix_copia_cola ? "PIX Copia e Cola copiado! 📱" : "Código PIX copiado!",
                              description: "Cole no seu app do banco para pagar",
                            });
                          } catch (error) {
                            toast({
                              title: "Erro ao copiar",
                              description: "Não foi possível copiar o código PIX",
                              variant: "destructive",
                            });
                          }
                        }}
                        className="w-full h-12 sm:h-14 text-base touch-manipulation"
                        aria-label={`Copiar ${paymentResult.pix_copia_cola ? 'PIX Copia e Cola' : 'código PIX'} para área de transferência`}
                      >
                        <Copy className="mr-2 h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
                        <span className="truncate">
                          {paymentResult.pix_copia_cola ? 'Copiar PIX Copia e Cola' : 'Copiar código PIX'}
                        </span>
                      </Button>
                    </div>
                  </div>
                )}

                <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm sm:text-base text-blue-700 font-medium">
                    Aguardando confirmação do pagamento...
                  </p>
                  <p className="text-xs sm:text-sm text-blue-600 mt-1">
                    O pagamento será confirmado automaticamente
                  </p>
                </div>
              </>
            )}

            {selectedPaymentMethod === 'credit_card' && (
              <div className="text-center space-y-4 p-6">
                <Loader2 className="h-12 w-12 sm:h-16 sm:w-16 animate-spin mx-auto text-primary" />
                <div className="space-y-2">
                  <p className="text-base sm:text-lg font-medium">
                    Processando pagamento...
                  </p>
                  <p className="text-sm sm:text-base text-muted-foreground">
                    Aguarde a confirmação do cartão de crédito
                  </p>
                </div>
              </div>
            )}

            <Button
              variant="outline"
              onClick={() => setCurrentStep('payment')}
              className="w-full h-12 sm:h-14 text-base touch-manipulation"
              size="lg"
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
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 sm:mb-8 lg:mb-12 text-center">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2 sm:mb-4">
            Finalizar Assinatura
          </h1>
          <p className="text-sm sm:text-base lg:text-lg text-muted-foreground">
            Complete os dados para ativar seu plano
          </p>
        </div>

        <div className="grid gap-6 sm:gap-8 lg:grid-cols-2 xl:gap-12">
          {/* Order Summary */}
          <div className="order-2 lg:order-1">
            <Card className="sticky top-4">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <CreditCard className="h-5 w-5 sm:h-6 sm:w-6" />
                  Resumo da Assinatura
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6 pt-0">
                <div className="space-y-2 sm:space-y-3 p-4 bg-muted rounded-lg">
                  <h3 className="text-base sm:text-lg font-semibold">{subscriptionData.planos?.nome}</h3>
                  <p className="text-sm sm:text-base text-muted-foreground">
                    {subscriptionData.planos?.descricao}
                  </p>
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex justify-between items-start gap-4">
                    <span className="text-sm sm:text-base font-medium">Cliente:</span>
                    <span className="text-sm sm:text-base text-right text-muted-foreground">
                      {subscriptionData.customer_name}
                    </span>
                  </div>
                  <div className="flex justify-between items-start gap-4">
                    <span className="text-sm sm:text-base font-medium">Email:</span>
                    <span className="text-sm sm:text-base text-right text-muted-foreground break-all">
                      {subscriptionData.customer_email}
                    </span>
                  </div>
                  <div className="flex justify-between items-start gap-4">
                    <span className="text-sm sm:text-base font-medium">Documento:</span>
                    <span className="text-sm sm:text-base text-right text-muted-foreground">
                      {subscriptionData.customer_document}
                    </span>
                  </div>
                </div>

                <Separator />

                <div className="flex justify-between items-center p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <span className="text-base sm:text-lg lg:text-xl font-semibold">Total Mensal:</span>
                  <span className="text-lg sm:text-xl lg:text-2xl font-bold text-primary">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL'
                    }).format(subscriptionData.plan_price || subscriptionData.planos?.valor || 0)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payment Form */}
          <div className="order-1 lg:order-2">
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <Smartphone className="h-5 w-5 sm:h-6 sm:w-6" />
                  Método de Pagamento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6 sm:space-y-8 p-4 sm:p-6 pt-0">
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
                  className="w-full h-12 sm:h-14 lg:h-16 text-base sm:text-lg touch-manipulation"
                  size="lg"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
                      <span className="truncate">
                        {selectedPaymentMethod === 'pix' ? 'Gerando QR Code...' : 'Processando...'}
                      </span>
                    </>
                  ) : selectedPaymentMethod === 'pix' ? (
                    <span className="truncate">
                      Gerar QR Code{' '}
                      <span className="hidden sm:inline">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        }).format(subscriptionData.plan_price || subscriptionData.planos?.valor || 0)}
                      </span>
                    </span>
                  ) : (
                    <span className="truncate">
                      Pagar{' '}
                      <span className="hidden sm:inline">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        }).format(subscriptionData.plan_price || subscriptionData.planos?.valor || 0)}
                      </span>
                    </span>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}