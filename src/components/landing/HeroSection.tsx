import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Shield, Heart } from "lucide-react";
export function HeroSection() {
  return <section className="relative overflow-hidden py-20 lg:py-32" style={{
    backgroundImage: 'url(/lovable-uploads/a8b83fa3-7de7-487a-a542-7e6046cc3ec9.png)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat'
  }}>
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Coluna esquerda - Conteúdo */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground tracking-tight text-left">
                Plano de Saúde{" "}
                <span className="bg-gradient-primary bg-clip-text text-transparent">
                  Completo
                </span>{" "}
                para sua Família
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground text-left">Proteção total com cobertura nacional,
rede credenciada ampla e atendimento 24 horas</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
              <Button size="lg" className="gap-2" onClick={() => {
                const planosSection = document.getElementById('planos');
                if (planosSection) {
                  planosSection.scrollIntoView({ behavior: 'smooth' });
                }
              }}>
                Ver Planos e Preços
                <ArrowRight className="h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" className="gap-2" onClick={() => {
                const formSection = document.getElementById('contact');
                if (formSection) {
                  formSection.scrollIntoView({ behavior: 'smooth' });
                }
              }}>
                <Shield className="h-5 w-5" />
                Solicitar Cotação
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8">
              <div className="text-left">
                <div className="text-3xl font-bold text-primary mb-2">50K+</div>
                <div className="text-muted-foreground">Beneficiários Ativos</div>
              </div>
              <div className="text-left">
                <div className="text-3xl font-bold text-primary mb-2">1.200+</div>
                <div className="text-muted-foreground">Hospitais Credenciados</div>
              </div>
              <div className="text-left">
                <div className="text-3xl font-bold text-primary mb-2">24h</div>
                <div className="text-muted-foreground">Atendimento Disponível</div>
              </div>
            </div>
          </div>

          {/* Coluna direita - Espaço para imagem */}
          <div className="hidden lg:flex items-center justify-center">
            <div className="w-full h-96 rounded-2xl flex items-center justify-center bg-black/0">
              
            </div>
          </div>
        </div>
      </div>
    </section>;
}