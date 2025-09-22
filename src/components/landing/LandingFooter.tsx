import { Heart, Mail, Phone, MapPin } from "lucide-react";
export function LandingFooter() {
  return <footer className="bg-secondary text-secondary-foreground py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo e Descrição */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <img 
                src="/uploads/17bddd1a-b658-4657-bc0f-8199a43e2129.png" 
                alt="medpass Multi Benefícios" 
                className="h-8"
              />
            </div>
            <p className="text-sm opacity-80">
              Planos de saúde completos com cobertura nacional e atendimento 24 horas.
            </p>
          </div>

          {/* Links Planos */}
          <div className="space-y-4">
            <h3 className="font-semibold">Planos</h3>
            <ul className="space-y-2 text-sm opacity-80">
              <li><a href="#" className="hover:opacity-100 transition-opacity">Plano Básico</a></li>
              <li><a href="#" className="hover:opacity-100 transition-opacity">Plano Completo</a></li>
              <li><a href="#" className="hover:opacity-100 transition-opacity">Plano Premium</a></li>
              <li><a href="#" className="hover:opacity-100 transition-opacity">Plano Familiar</a></li>
            </ul>
          </div>

          {/* Links Atendimento */}
          <div className="space-y-4">
            <h3 className="font-semibold">Atendimento</h3>
            <ul className="space-y-2 text-sm opacity-80">
              <li><a href="#" className="hover:opacity-100 transition-opacity">Rede Credenciada</a></li>
              <li><a href="#" className="hover:opacity-100 transition-opacity">Autorização de Exames</a></li>
              <li><a href="#" className="hover:opacity-100 transition-opacity">Segunda Via de Cartão</a></li>
              <li><a href="#" className="hover:opacity-100 transition-opacity">Suporte ao Cliente</a></li>
            </ul>
          </div>

          {/* Contato */}
          <div className="space-y-4">
            <h3 className="font-semibold">Contato</h3>
            <div className="space-y-2 text-sm opacity-80">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                <span>0800 591 8795</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <span>contato@medpassbeneficios.com.br</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>Umuarama, PR</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-secondary-foreground/20 mt-8 pt-8 text-center text-sm opacity-80">
          <p>© 2024 MedPlus. Todos os direitos reservados</p>
        </div>
      </div>
    </footer>;
}