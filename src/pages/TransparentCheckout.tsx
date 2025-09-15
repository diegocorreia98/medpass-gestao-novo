import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { UnifiedTransparentCheckout } from '@/components/checkout/UnifiedTransparentCheckout';
import { usePlanos } from '@/hooks/usePlanos';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

export default function TransparentCheckout() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { planos } = usePlanos();
  
  const [preSelectedPlan, setPreSelectedPlan] = useState(null);
  const [customerData, setCustomerData] = useState(null);
  const [beneficiarioId, setBeneficiarioId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeCheckout = async () => {
      try {
        console.log('🔄 [TRANSPARENT-CHECKOUT] Inicializando checkout transparente');
        
        // Extrair dados dos parâmetros da URL
        const planId = searchParams.get('plan_id');
        const customerName = searchParams.get('customer_name');
        const customerEmail = searchParams.get('customer_email');
        const customerDocument = searchParams.get('customer_document');
        const customerPhone = searchParams.get('customer_phone');
        const beneficiarioIdParam = searchParams.get('beneficiario_id');
        
        console.log('📋 [TRANSPARENT-CHECKOUT] Parâmetros recebidos:', {
          planId,
          customerName,
          customerEmail,
          customerDocument: customerDocument?.substring(0, 5) + '***',
          beneficiarioId: beneficiarioIdParam
        });

        // Validar parâmetros obrigatórios
        if (!planId || !customerName || !customerEmail || !customerDocument) {
          throw new Error('Parâmetros obrigatórios ausentes na URL');
        }

        // Buscar dados do plano
        const planoSelecionado = planos.find(p => p.id === planId);
        if (!planoSelecionado) {
          throw new Error('Plano não encontrado');
        }

        // Preparar dados do plano
        const planData = {
          id: planoSelecionado.id,
          name: planoSelecionado.nome,
          price: Number(planoSelecionado.valor),
          description: planoSelecionado.descricao || '',
          vindi_plan_id: planoSelecionado.vindi_plan_id
        };

        // Preparar dados do cliente
        const customerInfo = {
          name: customerName,
          email: customerEmail,
          document: customerDocument,
          documentType: 'cpf' as const,
          phone: customerPhone || '',
          address: {
            street: searchParams.get('customer_address') || '',
            number: '',
            neighborhood: '',
            city: searchParams.get('customer_city') || '',
            state: searchParams.get('customer_state') || '',
            zipcode: searchParams.get('customer_zipcode') || ''
          }
        };

        console.log('✅ [TRANSPARENT-CHECKOUT] Dados preparados:', {
          plan: planData.name,
          customer: customerInfo.name,
          hasVindiPlanId: !!planData.vindi_plan_id
        });

        setPreSelectedPlan(planData);
        setCustomerData(customerInfo);
        setBeneficiarioId(beneficiarioIdParam);
        
      } catch (error) {
        console.error('❌ [TRANSPARENT-CHECKOUT] Erro na inicialização:', error);
        toast({
          title: "Erro no checkout",
          description: error.message || "Erro ao carregar dados do checkout",
          variant: "destructive"
        });
        
        // Redirecionar para página inicial após erro
        setTimeout(() => navigate('/'), 3000);
      } finally {
        setIsLoading(false);
      }
    };

    initializeCheckout();
  }, [searchParams, planos, navigate, toast]);

  // Mostrar loading enquanto carrega dados
  if (isLoading) {
    return (
      <div className="container mx-auto py-16 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Carregando checkout transparente...</p>
      </div>
    );
  }

  // Se não carregou dados, mostrar erro
  if (!preSelectedPlan || !customerData) {
    return (
      <div className="container mx-auto py-16 text-center space-y-4">
        <h1 className="text-2xl font-bold text-destructive">Erro no Checkout</h1>
        <p className="text-muted-foreground">
          Não foi possível carregar os dados do checkout. Redirecionando...
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Checkout Transparente
          </h1>
          <p className="text-muted-foreground">
            Finalize sua adesão escolhendo a forma de pagamento
          </p>
        </div>

        <UnifiedTransparentCheckout
          preSelectedPlan={preSelectedPlan}
          customerData={customerData}
          onSuccess={async (result) => {
            console.log('✅ [TRANSPARENT-CHECKOUT] Checkout concluído:', result);
            
            // Atualizar status do beneficiário se disponível
            if (beneficiarioId) {
              try {
                const updateData: any = {
                  updated_at: new Date().toISOString()
                };
                
                // Determinar status baseado no resultado
                if (result.status === 'paid') {
                  updateData.payment_status = 'paid';
                  updateData.status = 'ativo'; // Ativar beneficiário após pagamento
                } else if (result.pix) {
                  updateData.payment_status = 'awaiting_payment';
                } else {
                  updateData.payment_status = 'processing';
                }
                
                await supabase
                  .from('beneficiarios')
                  .update(updateData)
                  .eq('id', beneficiarioId);
                  
                console.log('✅ [TRANSPARENT-CHECKOUT] Beneficiário atualizado:', updateData);
              } catch (updateError) {
                console.warn('Erro ao atualizar beneficiário:', updateError);
              }
            }
            
            // Mostrar sucesso baseado no método de pagamento
            const successMessage = result.pix 
              ? "QR Code PIX gerado! Escaneie para pagar."
              : result.status === 'paid'
              ? "Seu pagamento foi confirmado com sucesso"
              : "Seu pagamento está sendo processado";
            
            toast({
              title: "Checkout finalizado! 🎉",
              description: successMessage,
            });
            
            // Para PIX, não redirecionar automaticamente (deixar cliente ver QR Code)
            if (!result.pix) {
              setTimeout(() => {
                navigate('/');
              }, 4000);
            }
          }}
          onCancel={() => {
            console.log('🚫 [TRANSPARENT-CHECKOUT] Checkout cancelado');
            toast({
              title: "Checkout cancelado",
              description: "Você pode voltar a qualquer momento para finalizar sua adesão",
            });
            
            // Voltar para página anterior
            navigate(-1);
          }}
        />
      </div>
    </div>
  );
}