
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Building2, Users } from "lucide-react";

const cobertura = [
  {
    icon: MapPin,
    title: "Cobertura Nacional",
    description: "Atendimento em todas as capitais e principais cidades do Brasil"
  },
  {
    icon: Building2,
    title: "Hospitais de Referência",
    description: "Parceria com os melhores hospitais e clínicas do país"
  },
  {
    icon: Users,
    title: "Rede Credenciada",
    description: "Mais de 15.000 profissionais e estabelecimentos credenciados"
  }
];

const principais_cidades = [
  "São Paulo", "Rio de Janeiro", "Belo Horizonte", "Brasília", 
  "Salvador", "Fortaleza", "Recife", "Porto Alegre", 
  "Curitiba", "Goiânia", "Manaus", "Belém"
];

export function CoberturaSection() {
  return (
    <section id="cobertura" className="py-20 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Cobertura em Todo o Brasil
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Onde quer que você esteja, nossa rede credenciada está presente
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {cobertura.map((item, index) => (
            <Card key={index} className="text-center hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <item.icon className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-xl">{item.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{item.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="bg-card rounded-lg p-8 shadow-sm">
          <h3 className="text-2xl font-bold text-center mb-8">Principais Cidades Atendidas</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {principais_cidades.map((cidade, index) => (
              <div key={index} className="text-center p-4 bg-muted/50 rounded-lg">
                <span className="font-medium text-foreground">{cidade}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
