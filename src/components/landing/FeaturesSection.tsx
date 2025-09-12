import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, MapPin, Clock, Stethoscope, Phone, Heart, FileText, Users } from "lucide-react";
const features = [{
  icon: Shield,
  title: "Cobertura Nacional",
  description: "Atendimento em todo o Brasil com rede credenciada em mais de 1.200 cidades."
}, {
  icon: MapPin,
  title: "Rede Credenciada Ampla",
  description: "Hospitais, clínicas e laboratórios de referência próximos a você."
}, {
  icon: Clock,
  title: "Atendimento 24h",
  description: "Pronto-socorro, urgência e emergência disponíveis a qualquer hora."
}, {
  icon: Stethoscope,
  title: "Consultas sem Carência",
  description: "Consultas médicas básicas liberadas imediatamente após a contratação."
}, {
  icon: Phone,
  title: "Telemedicina",
  description: "Consultas online com médicos especialistas no conforto da sua casa."
}, {
  icon: Heart,
  title: "Medicina Preventiva",
  description: "Check-ups, exames preventivos e programas de saúde inclusos."
}, {
  icon: FileText,
  title: "Exames Inclusos",
  description: "Laboratório, imagem e diagnósticos cobertos pelo plano."
}, {
  icon: Users,
  title: "Plano Familiar",
  description: "Cobertura para toda a família com descontos especiais."
}];
export function FeaturesSection() {
  return <section id="features" className="py-20 bg-inherit">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Por que Escolher Nosso Plano?
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Proteção completa com os melhores benefícios para você e sua família
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader className="text-center">
                <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground text-center">
                  {feature.description}
                </p>
              </CardContent>
            </Card>)}
        </div>
      </div>
    </section>;
}