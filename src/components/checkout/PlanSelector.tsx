import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, Loader2 } from 'lucide-react';
import { Plan } from '@/types/checkout';
import { usePlanos } from '@/hooks/usePlanos';

interface PlanSelectorProps {
  selectedPlan: Plan | null;
  onSelectPlan: (plan: Plan) => void;
  preSelectedPlanId?: string;
  isEmpresarial?: boolean;
}

export function PlanSelector({ selectedPlan, onSelectPlan, preSelectedPlanId, isEmpresarial }: PlanSelectorProps) {
  const { planos: planosDb, isLoading } = usePlanos();

  // Converter planos do banco para o formato esperado pelo checkout
  const planos: Plan[] = planosDb?.filter(p => p.ativo).map(plano => ({
    id: plano.id,
    name: plano.nome,
    price: Number(plano.valor),
    description: plano.descricao || 'Plano disponível',
    features: plano.descricao ? [plano.descricao] : undefined
  })) || [];

  // Auto-select plan if preSelectedPlanId is provided
  React.useEffect(() => {
    if (preSelectedPlanId && planos.length > 0 && !selectedPlan) {
      const preSelected = planos.find(p => p.id === preSelectedPlanId);
      if (preSelected) {
        onSelectPlan(preSelected);
      }
    }
  }, [preSelectedPlanId, planos, selectedPlan, onSelectPlan]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Carregando planos...</span>
      </div>
    );
  }

  if (planos.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Nenhum plano disponível no momento.</p>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">
          {isEmpresarial ? 'Plano Empresarial' : 'Escolha seu plano'}
        </h2>
        <p className="text-muted-foreground">
          {isEmpresarial 
            ? 'Entre em contato conosco para um plano personalizado para sua empresa'
            : 'Selecione o plano que melhor atende suas necessidades'
          }
        </p>
        {isEmpresarial && (
          <div className="mt-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
            <p className="text-orange-800 font-medium">Plano Empresarial</p>
            <p className="text-orange-600 text-sm mt-1">
              Entre em contato através do WhatsApp: (11) 99999-9999 ou email: comercial@medpass.com.br
            </p>
          </div>
        )}
      </div>

      <div className={`grid gap-6 ${planos.length === 1 ? 'md:grid-cols-1 max-w-md mx-auto' : planos.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
        {planos.map((plan) => (
          <Card 
            key={plan.id} 
            className={`relative cursor-pointer transition-all duration-200 hover:shadow-lg ${
              selectedPlan?.id === plan.id 
                ? 'ring-2 ring-primary shadow-elegant' 
                : 'hover:shadow-md'
            }`}
            onClick={() => onSelectPlan(plan)}
          >
            {selectedPlan?.id === plan.id && (
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <Check className="w-4 h-4 text-primary-foreground" />
              </div>
            )}
            
            <CardHeader className="text-center">
              <CardTitle className="text-xl">{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
              <div className="mt-4">
                <span className="text-3xl font-bold">
                  R$ {plan.price.toFixed(2).replace('.', ',')}
                </span>
                <span className="text-muted-foreground">/mês</span>
              </div>
            </CardHeader>

            <CardContent>
              <ul className="space-y-2">
                {plan.features?.map((feature, index) => (
                  <li key={index} className="flex items-center text-sm">
                    <Check className="w-4 h-4 text-success mr-2 flex-shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Button 
                className="w-full mt-4"
                variant={selectedPlan?.id === plan.id ? 'default' : 'outline'}
              >
                {selectedPlan?.id === plan.id ? 'Selecionado' : 'Selecionar'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}