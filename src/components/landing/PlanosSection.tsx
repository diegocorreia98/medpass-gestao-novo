
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Star, Loader2, Building2, Users, User } from "lucide-react";
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

export function PlanosSection() {
  const navigate = useNavigate();
  
  const {
    data: planos = [],
    isLoading,
    error
  } = useQuery({
    queryKey: ['planos-cotafacil'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('planos')
        .select('*')
        .eq('ativo', true)
        .ilike('nome', '%CotaFácil%')
        .order('valor', { ascending: true });
      
      if (error) {
        console.error('[PLANOS] Erro ao buscar planos CotaFácil:', error);
        throw error;
      }
      console.log('[PLANOS] Planos CotaFácil encontrados:', data);
      return data || [];
    },
  });

  if (isLoading) {
    return (
      <section id="planos" className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Escolha o Plano Ideal
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Planos flexíveis para atender suas necessidades e orçamento
            </p>
          </div>
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </section>
    );
  }

  // Se não houver planos CotaFácil, mostrar aviso
  if (!isLoading && planos.length === 0) {
    return (
      <section id="planos" className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Escolha o Plano Ideal
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Planos flexíveis para atender suas necessidades e orçamento
            </p>
          </div>
          <div className="flex justify-center items-center py-20">
            <div className="text-center text-muted-foreground">
              <p>Nenhum plano CotaFácil disponível no momento.</p>
              {error && <p className="text-sm mt-2">Erro: {error.message}</p>}
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Marcar o plano com maior valor como "Mais Escolhido" (normalmente o familiar)
  const planosComPopular = planos.map((plano) => ({
    ...plano,
    popular: plano.nome.toLowerCase().includes('familiar') || 
             planos.length > 1 && plano.valor === Math.max(...planos.map(p => p.valor))
  }));

  const handleContratarPlano = (plano: any) => {
    // Redirecionar para página de checkout com o plano selecionado
    navigate('/checkout', { state: { planoId: plano.id, planoNome: plano.nome } });
  };

  return (
    <section id="planos" className="py-20 bg-background">
      <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              CotaFácil - Planos de Saúde
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Planos flexíveis para você e sua família
            </p>
          </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {planosComPopular.map((plano, index) => (
            <Card key={plano.id} className={`relative hover:shadow-lg transition-all duration-300 hover-scale flex flex-col h-full ${
              plano.popular ? 'ring-2 ring-primary animate-fade-in' : ''
            }`}>
              {plano.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 animate-scale-in">
                  <div className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                    <Star className="h-4 w-4" />
                    Mais Escolhido
                  </div>
                </div>
              )}
              
              <CardHeader className="text-center">
                <div className="flex justify-center mb-4">
                  {plano.nome.toLowerCase().includes('familiar') ? (
                    <Users className="h-8 w-8 text-primary" />
                  ) : (
                    <User className="h-8 w-8 text-primary" />
                  )}
                </div>
                <CardTitle className="text-2xl mb-2">{plano.nome}</CardTitle>
                <div className="mb-4">
                  <span className="text-4xl font-bold text-primary">
                    R$ {plano.valor.toFixed(2).replace('.', ',')}
                  </span>
                  <span className="text-muted-foreground">/mês</span>
                </div>
                {plano.descricao && (
                  <p className="text-sm text-muted-foreground">{plano.descricao}</p>
                )}
              </CardHeader>
              
              <CardContent className="flex-1 flex flex-col justify-between space-y-6">
                <div className="space-y-3">
                  {plano.nome.toLowerCase().includes('individual') && (
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-muted-foreground">Cobertura individual</span>
                    </div>
                  )}
                  {plano.nome.toLowerCase().includes('familiar') && (
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-muted-foreground">Titular + até 3 dependentes</span>
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">Teleconsulta com Clínico Geral</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">Teleconsulta com Especialistas</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">Psicologia</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">Nutrição</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">Enfermagem</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">Assistência Fitness</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">Rede de Descontos</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">Check-up anual rotina</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">Assistência PET Flex</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">Assistência Funeral</span>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">Subsídio em medicamentos</span>
                  </div>
                </div>
                
                <Button 
                  className="w-full" 
                  variant={plano.popular ? "default" : "outline"}
                  onClick={() => handleContratarPlano(plano)}
                >
                  Contratar Agora
                </Button>
              </CardContent>
            </Card>
          ))}

          {/* Plano Empresarial - Card Estático */}
          <Card className="relative hover:shadow-lg transition-all duration-300 hover-scale flex flex-col h-full border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-orange-100 animate-fade-in">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 animate-scale-in">
              <div className="bg-orange-500 text-white px-4 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                <Building2 className="h-4 w-4" />
                Para Empresas
              </div>
            </div>
            
            <CardHeader className="text-center">
              <CardTitle className="text-2xl mb-2 text-orange-800">Plano Empresarial</CardTitle>
              <div className="mb-4">
                <span className="text-3xl font-bold text-orange-700">
                  Sob Consulta
                </span>
                <p className="text-sm text-orange-600 mt-1">Valores personalizados</p>
              </div>
            </CardHeader>
            
            <CardContent className="flex-1 flex flex-col justify-between space-y-6">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-orange-700">Teleconsulta com Clínico Geral</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-orange-700">Teleconsulta com Especialistas</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-orange-700">Psicologia</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-orange-700">Nutrição</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-orange-700">Enfermagem</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-orange-700">Assistência Fitness</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-orange-700">Rede de Descontos</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-orange-700">Check-up anual rotina</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-orange-700">Assistência PET Flex</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-orange-700">Assistência Funeral</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-orange-700">Subsídio em medicamentos</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-orange-700">Gestão centralizada de beneficiários</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-orange-700">Atendimento corporativo dedicado</span>
                </div>
              </div>
              
              <Button 
                className="w-full bg-orange-600 hover:bg-orange-700 text-white" 
                variant="default"
                onClick={() => navigate('/checkout', { state: { empresarial: true } })}
              >
                Solicitar Proposta
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
