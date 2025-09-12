
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Store, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const matrizBenefits = [
  "Aumente receita em até 40% no primeiro ano",
  "Reduza custos operacionais em 60%",
  "Controle total de ROI e margens",
  "Automatize 80% dos processos manuais",
  "Escale sem limitações ou custos extras",
  "Suporte dedicado para seu crescimento"
];

const unidadeBenefits = [
  "Venda mais rápido com automação",
  "Feche negócios em segundos",
  "Clientes mais satisfeitos e fiéis",
  "Relatórios que geram mais vendas",
  "Interface que vende por você",
  "Treinamento garantido para resultados"
];

export function BenefitsSection() {
  return (
    <section id="benefits" className="py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Resultados Garantidos
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            ROI comprovado para matriz e franquias - seus resultados começam no primeiro mês
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Building2 className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Para a Matriz</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                {matrizBenefits.map((benefit, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">{benefit}</span>
                  </div>
                ))}
              </div>
              <Link to="/auth" className="block">
                <Button className="w-full">
                  Começar Teste Grátis
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mb-4">
                <Store className="h-8 w-8 text-secondary" />
              </div>
              <CardTitle className="text-2xl">Para as Unidades</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                {unidadeBenefits.map((benefit, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-muted-foreground">{benefit}</span>
                  </div>
                ))}
              </div>
              <Link to="/auth" className="block">
                <Button variant="secondary" className="w-full">
                  Solicitar Demonstração
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
