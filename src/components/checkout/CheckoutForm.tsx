import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Loader2, ArrowLeft, ArrowRight, Check, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

import { PlanSelector } from './PlanSelector';
import { CustomerForm } from './CustomerForm';
import { PaymentMethodSelector } from './PaymentMethodSelector';
import { CardForm } from './CardForm';
import { OrderSummary } from './OrderSummary';

import { Plan, CustomerData, PaymentData, PaymentStatus, TransactionResult, CardData } from '@/types/checkout';
import { validateCPF, validateCNPJ, validateEmail } from '@/utils/validators';

const STEPS = [
  { id: 1, title: 'Plano', description: 'Escolha seu plano' },
  { id: 2, title: 'Dados', description: 'Informações pessoais' },
  { id: 3, title: 'Pagamento', description: 'Forma de pagamento' },
  { id: 4, title: 'Confirmação', description: 'Finalizar pedido' }
];

export function CheckoutForm() {
  const location = useLocation();
  const { planoId, planoNome, empresarial } = location.state || {};
  
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [customerData, setCustomerData] = useState<Partial<CustomerData>>({
    documentType: 'cpf'
  });
  const [paymentData, setPaymentData] = useState<Partial<PaymentData>>({
    installments: 1
  });
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('idle');
  const [transactionResult, setTransactionResult] = useState<TransactionResult | null>(null);

  const progress = (currentStep / STEPS.length) * 100;

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return selectedPlan !== null;
        
      case 2:
        if (!customerData.name?.trim() || customerData.name.length < 3) {
          toast({ title: 'Erro', description: 'Nome deve ter pelo menos 3 caracteres', variant: 'destructive' });
          return false;
        }
        
        if (!validateEmail(customerData.email || '')) {
          toast({ title: 'Erro', description: 'Email inválido', variant: 'destructive' });
          return false;
        }
        
        const docType = customerData.documentType || 'cpf';
        const docValid = docType === 'cpf' 
          ? validateCPF(customerData.document || '') 
          : validateCNPJ(customerData.document || '');
          
        if (!docValid) {
          toast({ title: 'Erro', description: `${docType.toUpperCase()} inválido`, variant: 'destructive' });
          return false;
        }
        
        return true;
        
      case 3:
        if (!paymentData.method) {
          toast({ title: 'Erro', description: 'Selecione um método de pagamento', variant: 'destructive' });
          return false;
        }
        
        if (paymentData.method === 'credit_card') {
          const card = paymentData.cardData;
          if (!card?.number || !card?.holder_name || !card?.cvv || !card?.expiry_month || !card?.expiry_year) {
            toast({ title: 'Erro', description: 'Preencha todos os dados do cartão', variant: 'destructive' });
            return false;
          }
        }
        
        return true;
        
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const processPayment = async () => {
    if (!selectedPlan || !validateStep(3)) return;

    setPaymentStatus('processing');

    try {
      const { data, error } = await supabase.functions.invoke('process-vindi-subscription', {
        body: {
          customerData: {
            name: customerData.name,
            email: customerData.email,
            document: customerData.document?.replace(/[^\d]/g, ''),
            phone: customerData.phone?.replace(/[^\d]/g, ''),
            address: customerData.address
          },
          paymentData: {
            method: paymentData.method,
            cardData: paymentData.method === 'credit_card' && paymentData.cardData ? {
              holder_name: paymentData.cardData.holder_name || '',
              number: paymentData.cardData.number?.replace(/\s/g, '') || '',
              cvv: paymentData.cardData.cvv || '',
              expiry_month: paymentData.cardData.expiry_month || '',
              expiry_year: paymentData.cardData.expiry_year || ''
            } : undefined,
            installments: paymentData.installments
          },
          planData: {
            id: selectedPlan.id,
            name: selectedPlan.name,
            price: selectedPlan.price
          }
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      setTransactionResult(data);

      if (data.success) {
        setPaymentStatus('success');
        setCurrentStep(4);
        
        toast({
          title: 'Assinatura criada!',
          description: paymentData.method === 'credit_card' 
            ? 'Sua assinatura foi ativada com sucesso'
            : 'Instruções de pagamento da primeira mensalidade enviadas por email',
          variant: 'default'
        });
      } else {
        throw new Error(data.error || 'Erro ao criar assinatura');
      }

    } catch (error: any) {
      console.error('Payment error:', error);
      setPaymentStatus('error');
      
      toast({
        title: 'Erro na assinatura',
        description: error.message || 'Tente novamente em alguns minutos',
        variant: 'destructive'
      });
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <PlanSelector
            selectedPlan={selectedPlan}
            onSelectPlan={setSelectedPlan}
            preSelectedPlanId={planoId}
            isEmpresarial={empresarial}
          />
        );

      case 2:
        return (
          <CustomerForm
            customerData={customerData}
            onCustomerDataChange={setCustomerData}
          />
        );

      case 3:
        return (
          <div className="space-y-6">
            <PaymentMethodSelector
              selectedMethod={paymentData.method || null}
              onSelectMethod={(method) => setPaymentData({ ...paymentData, method })}
            />

            {paymentData.method === 'credit_card' && selectedPlan && (
              <CardForm
                cardData={paymentData.cardData || {}}
                installments={paymentData.installments || 1}
                onCardDataChange={(cardData) => setPaymentData({ ...paymentData, cardData })}
                onInstallmentsChange={(installments) => setPaymentData({ ...paymentData, installments })}
                planPrice={selectedPlan.price}
              />
            )}

            {paymentData.method === 'pix' && (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center space-y-2">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                      <Check className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="font-semibold">PIX Selecionado</h3>
                    <p className="text-muted-foreground text-sm">
                      Você receberá o QR Code para pagamento na próxima etapa
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {paymentData.method === 'boleto' && (
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center space-y-2">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                      <Check className="w-8 h-8 text-primary" />
                    </div>
                    <h3 className="font-semibold">Boleto Selecionado</h3>
                    <p className="text-muted-foreground text-sm">
                      O boleto será gerado e enviado por email após a confirmação
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        );

      case 4:
        return (
          <div className="text-center space-y-6">
            {paymentStatus === 'success' && transactionResult?.success && (
              <div className="space-y-4">
                <div className="w-20 h-20 bg-success/10 rounded-full flex items-center justify-center mx-auto">
                  <Check className="w-10 h-10 text-success" />
                </div>
                
                <h2 className="text-2xl font-bold text-success">Pagamento Aprovado!</h2>
                
                <p className="text-muted-foreground">
                  Seu pedido foi processado com sucesso. Você receberá um email de confirmação em breve.
                </p>

                {paymentData.method === 'pix' && transactionResult?.pix && (
                  <Card>
                    <CardContent className="pt-6 space-y-4">
                      <h3 className="font-semibold">Pagamento PIX</h3>
                      {transactionResult.pix.qr_code_url && (
                        <img 
                          src={transactionResult.pix.qr_code_url} 
                          alt="QR Code PIX" 
                          className="mx-auto max-w-48"
                        />
                      )}
                      <p className="text-sm text-muted-foreground">
                        Escaneie o QR Code ou copie o código PIX para realizar o pagamento
                      </p>
                      {transactionResult.pix.expires_at && (
                        <p className="text-xs text-muted-foreground">
                          Válido até: {new Date(transactionResult.pix.expires_at).toLocaleString('pt-BR')}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )}

                {paymentData.method === 'boleto' && transactionResult?.boleto && (
                  <Card>
                    <CardContent className="pt-6 space-y-4">
                      <h3 className="font-semibold">Boleto Bancário</h3>
                      <p className="text-sm text-muted-foreground">
                        Seu boleto foi gerado com sucesso
                      </p>
                      {transactionResult.boleto.url && (
                        <Button asChild>
                          <a href={transactionResult.boleto.url} target="_blank" rel="noopener noreferrer">
                            Visualizar Boleto
                          </a>
                        </Button>
                      )}
                      {transactionResult.boleto.due_date && (
                        <p className="text-xs text-muted-foreground">
                          Vencimento: {new Date(transactionResult.boleto.due_date).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {paymentStatus === 'error' && (
              <div className="space-y-4">
                <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
                  <AlertCircle className="w-10 h-10 text-destructive" />
                </div>
                
                <h2 className="text-2xl font-bold text-destructive">Erro no Pagamento</h2>
                
                <p className="text-muted-foreground">
                  Houve um problema ao processar seu pagamento. Tente novamente.
                </p>
                
                <Button onClick={() => setPaymentStatus('idle')} variant="outline">
                  Tentar Novamente
                </Button>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Progress Header */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="space-y-4">
            <Progress value={progress} className="h-2" />
            
            <div className="flex justify-between">
              {STEPS.map((step, index) => (
                <div 
                  key={step.id} 
                  className={`flex flex-col items-center space-y-2 ${
                    currentStep >= step.id ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    currentStep > step.id 
                      ? 'bg-primary text-primary-foreground'
                      : currentStep === step.id
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    {currentStep > step.id ? <Check className="w-4 h-4" /> : step.id}
                  </div>
                  <div className="text-center">
                    <div className="font-medium text-xs">{step.title}</div>
                    <div className="text-xs opacity-75 hidden sm:block">{step.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <Card>
                <CardContent className="p-6">
                  {renderStepContent()}
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-1">
              {selectedPlan && (
                <OrderSummary
                  plan={selectedPlan}
                  paymentMethod={paymentData.method}
                  installments={paymentData.installments}
                />
              )}
            </div>
          </div>

          {/* Navigation */}
          {currentStep < 4 && (
            <div className="flex justify-between max-w-4xl mx-auto mt-8">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar
              </Button>

              {currentStep < 3 ? (
                <Button onClick={nextStep} disabled={!selectedPlan && currentStep === 1}>
                  Continuar
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={processPayment}
                  disabled={paymentStatus === 'processing'}
                >
                  {paymentStatus === 'processing' ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    'Finalizar Pedido'
                  )}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}