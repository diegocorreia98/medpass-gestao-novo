import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowRight, Phone, Mail, MessageCircle } from "lucide-react";
import { useState } from "react";
export function CTASection() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    age: ''
  });
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission
    console.log('Form submitted:', formData);
  };
  return <section id="contact" className="py-20 bg-gradient-to-br from-primary/5 to-secondary/5">
      <div className="container mx-auto px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Proteja sua Família Hoje
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Faça sua cotação gratuita e descubra o plano ideal para você
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Formulário de Cotação */}
            <div className="bg-card p-8 rounded-lg shadow-lg">
              <h3 className="text-2xl font-bold mb-6">Solicite sua Cotação</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome Completo</Label>
                  <Input id="name" type="text" placeholder="Seu nome completo" value={formData.name} onChange={e => setFormData({
                  ...formData,
                  name: e.target.value
                })} required />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" type="email" placeholder="seu@email.com" value={formData.email} onChange={e => setFormData({
                  ...formData,
                  email: e.target.value
                })} required />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input id="phone" type="tel" placeholder="(11) 99999-9999" value={formData.phone} onChange={e => setFormData({
                    ...formData,
                    phone: e.target.value
                  })} required />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="age">Idade</Label>
                    <Input id="age" type="number" placeholder="35" value={formData.age} onChange={e => setFormData({
                    ...formData,
                    age: e.target.value
                  })} required />
                  </div>
                </div>
                
                <Button type="submit" className="w-full gap-2">
                  Solicitar Cotação Gratuita
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </form>
            </div>

            {/* Informações de Contato */}
            <div className="space-y-8">
              <div className="text-center">
                <h3 className="text-2xl font-bold mb-4">Atendimento Personalizado</h3>
                <p className="text-muted-foreground mb-8">
                  Nossa equipe está pronta para ajudar você a escolher o melhor plano
                </p>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-4 p-4 bg-card rounded-lg">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <Phone className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold">Telefone</h4>
                    <p className="text-muted-foreground">0800 591 8795</p>
                    <p className="text-sm text-muted-foreground">Seg a Sex: 8h às 18h</p>
                  </div>
                </div>

                <div className="flex items-center gap-4 p-4 bg-card rounded-lg">
                  <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                    <MessageCircle className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold">WhatsApp</h4>
                    <p className="text-muted-foreground">(11) 99999-9999</p>
                    <p className="text-sm text-muted-foreground">Disponível 24h</p>
                  </div>
                </div>

                
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>;
}