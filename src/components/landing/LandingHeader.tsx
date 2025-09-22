import { Button } from "@/components/ui/button";
import { Heart, Menu, X, Phone } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
export function LandingHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  return <header className="backdrop-blur-sm border-b border-border sticky top-0 z-50" style={{
    backgroundColor: '#4635BF'
  }}>
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/uploads/6063e8a5-a834-41f5-8331-f30fbef51860.png" alt="Logo" className="h-8 w-auto" />
          </div>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <a href="#planos" className="transition-colors" style={{
            color: '#E4E4E4'
          }}>
              Planos
            </a>
            <a href="#features" className="transition-colors" style={{
            color: '#E4E4E4'
          }}>
              Benefícios
            </a>
            <a href="#cobertura" className="transition-colors" style={{
            color: '#E4E4E4'
          }}>
              Cobertura
            </a>
            <a href="#contact" className="transition-colors" style={{
            color: '#E4E4E4'
          }}>
              Contato
            </a>
          </nav>

          <div className="hidden md:flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm" style={{
            color: '#E4E4E4'
          }}>
              <Phone className="h-4 w-4" style={{
              color: '#E4E4E4'
            }} />
              <span>0800 591 8795</span>
            </div>
            <Button variant="outline" onClick={() => navigate('/auth')}>
              Entrar
            </Button>
            <Button onClick={() => navigate('/franquia')}>
              Seja um Franqueado
            </Button>
            
          </div>

          {/* Mobile Menu Button */}
          <button className="md:hidden" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && <div className="md:hidden mt-4 pb-4 border-t border-border">
            <nav className="flex flex-col gap-4 pt-4">
              <a href="#planos" className="text-muted-foreground hover:text-primary transition-colors">
                Planos
              </a>
              <a href="#features" className="text-muted-foreground hover:text-primary transition-colors">
                Benefícios
              </a>
              <a href="#cobertura" className="text-muted-foreground hover:text-primary transition-colors">
                Cobertura
              </a>
              <a href="#contact" className="text-muted-foreground hover:text-primary transition-colors">
                Contato
              </a>
              <div className="flex flex-col gap-2 pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span>0800 591 8795</span>
                </div>
                <Button variant="outline" className="w-full" onClick={() => navigate('/auth')}>
                  Entrar
                </Button>
                <Button className="w-full" onClick={() => navigate('/franquia')}>
                  Seja um Franqueado
                </Button>
                <Button variant="outline" className="w-full">
                  Solicitar Cotação
                </Button>
              </div>
            </nav>
          </div>}
      </div>
    </header>;
}