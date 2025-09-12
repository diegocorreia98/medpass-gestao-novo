import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, TrendingUp, Users, Shield, MapPin, Phone, Mail, Clock, Award, Target, Banknote, HeadphonesIcon } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
export default function Franquia() {
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    telefone: "",
    cidade: "",
    estado: "",
    experiencia: "",
    investimento: "",
    observacoes: ""
  });
  const {
    toast
  } = useToast();
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Dados da franquia:", formData);
    toast({
      title: "Formulário enviado!",
      description: "Entraremos em contato em breve para apresentar nossa oportunidade."
    });
  };
  return <div className="min-h-screen bg-background">
      {/* Header Section */}
      <section className="relative py-20 lg:py-32 bg-gradient-to-br from-primary/10 via-background to-secondary/10">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl md:text-6xl font-bold text-foreground">
                Seja um{" "}
                <span className="bg-gradient-primary bg-clip-text text-transparent">
                  Franqueado
                </span>{" "}
                MedPass
              </h1>
              <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
                Empreenda no setor de saúde com uma marca consolidada. Baixo investimento, alto retorno e suporte completo.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-2">R$ 15K</div>
                <div className="text-muted-foreground">Investimento Inicial</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-2">30%</div>
                <div className="text-muted-foreground">Margem de Lucro</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary mb-2">6 meses</div>
                <div className="text-muted-foreground">Retorno do Investimento</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Vantagens Section */}
      <section className="py-20 bg-secondary/5">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Por que escolher a MedPass?</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Faça parte de um mercado em crescimento com todo o suporte necessário para seu sucesso.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="border-0 shadow-lg">
              <CardHeader className="text-center">
                <TrendingUp className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle>Mercado em Expansão</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center">
                  O setor de planos de saúde cresce 8% ao ano. Posicione-se neste mercado promissor.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader className="text-center">
                <Users className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle>Base de Clientes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center">
                  Acesso à nossa base de mais de 50.000 beneficiários ativos em todo o país.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader className="text-center">
                <Shield className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle>Marca Consolidada</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center">
                  Mais de 15 anos no mercado com reconhecimento e confiança dos consumidores.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader className="text-center">
                <Award className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle>Treinamento Completo</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center">
                  Capacitação em vendas, produtos e gestão do negócio para garantir seu sucesso.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader className="text-center">
                <Target className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle>Suporte de Marketing</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center">
                  Materiais promocionais, campanhas digitais e apoio constante em marketing.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader className="text-center">
                <HeadphonesIcon className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle>Suporte Técnico</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-center">
                  Equipe dedicada para suporte técnico e operacional 24 horas por dia.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Como Funciona Section */}
      <section className="py-20 bg-blue-100">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Como funciona o modelo de franquia</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Um processo simples e estruturado para você começar seu negócio.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto mb-4">1</div>
              <h3 className="text-xl font-semibold mb-2">Análise de Perfil</h3>
              <p className="text-muted-foreground">Avaliamos seu perfil e região de interesse para garantir o melhor fit.</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto mb-4">2</div>
              <h3 className="text-xl font-semibold mb-2">Treinamento</h3>
              <p className="text-muted-foreground">Capacitação completa em produtos, vendas e gestão do negócio.</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto mb-4">3</div>
              <h3 className="text-xl font-semibold mb-2">Estruturação</h3>
              <p className="text-muted-foreground">Montagem da estrutura e acesso aos sistemas de gestão.</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto mb-4">4</div>
              <h3 className="text-xl font-semibold mb-2">Lançamento</h3>
              <p className="text-muted-foreground">Início das operações com suporte completo da nossa equipe.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Investimento Section */}
      <section className="py-20 bg-secondary/5">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Investimento e Retorno</h2>
              <p className="text-xl text-muted-foreground">
                Valores transparentes e projeções realistas para seu planejamento.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Banknote className="h-6 w-6 text-primary" />
                    Investimento Inicial
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>Taxa de Franquia</span>
                    <span className="font-semibold">R$ 10.000</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Capital de Giro</span>
                    <span className="font-semibold">R$ 5.000</span>
                  </div>
                  <div className="border-t pt-4">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span className="text-primary">R$ 15.000</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-6 w-6 text-primary" />
                    Projeção de Retorno
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between">
                    <span>Faturamento Mensal</span>
                    <span className="font-semibold">R$ 8.000 - R$ 15.000</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Margem de Lucro</span>
                    <span className="font-semibold">25% - 35%</span>
                  </div>
                  <div className="border-t pt-4">
                    <div className="flex justify-between text-lg font-bold">
                      <span>ROI</span>
                      <span className="text-primary">6-12 meses</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Formulário Section */}
      <section id="formulario-franquia" className="py-20 bg-sky-100">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Quero ser um Franqueado</h2>
              <p className="text-xl text-muted-foreground">
                Preencha o formulário e nossa equipe entrará em contato para apresentar a oportunidade.
              </p>
            </div>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="nome">Nome Completo *</Label>
                      <Input id="nome" value={formData.nome} onChange={e => handleInputChange("nome", e.target.value)} required />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">E-mail *</Label>
                      <Input id="email" type="email" value={formData.email} onChange={e => handleInputChange("email", e.target.value)} required />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="telefone">Telefone *</Label>
                      <Input id="telefone" value={formData.telefone} onChange={e => handleInputChange("telefone", e.target.value)} required />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="cidade">Cidade *</Label>
                      <Input id="cidade" value={formData.cidade} onChange={e => handleInputChange("cidade", e.target.value)} required />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="estado">Estado *</Label>
                      <Select value={formData.estado} onValueChange={value => handleInputChange("estado", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o estado" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="AC">Acre</SelectItem>
                          <SelectItem value="AL">Alagoas</SelectItem>
                          <SelectItem value="AP">Amapá</SelectItem>
                          <SelectItem value="AM">Amazonas</SelectItem>
                          <SelectItem value="BA">Bahia</SelectItem>
                          <SelectItem value="CE">Ceará</SelectItem>
                          <SelectItem value="DF">Distrito Federal</SelectItem>
                          <SelectItem value="ES">Espírito Santo</SelectItem>
                          <SelectItem value="GO">Goiás</SelectItem>
                          <SelectItem value="MA">Maranhão</SelectItem>
                          <SelectItem value="MT">Mato Grosso</SelectItem>
                          <SelectItem value="MS">Mato Grosso do Sul</SelectItem>
                          <SelectItem value="MG">Minas Gerais</SelectItem>
                          <SelectItem value="PA">Pará</SelectItem>
                          <SelectItem value="PB">Paraíba</SelectItem>
                          <SelectItem value="PR">Paraná</SelectItem>
                          <SelectItem value="PE">Pernambuco</SelectItem>
                          <SelectItem value="PI">Piauí</SelectItem>
                          <SelectItem value="RJ">Rio de Janeiro</SelectItem>
                          <SelectItem value="RN">Rio Grande do Norte</SelectItem>
                          <SelectItem value="RS">Rio Grande do Sul</SelectItem>
                          <SelectItem value="RO">Rondônia</SelectItem>
                          <SelectItem value="RR">Roraima</SelectItem>
                          <SelectItem value="SC">Santa Catarina</SelectItem>
                          <SelectItem value="SP">São Paulo</SelectItem>
                          <SelectItem value="SE">Sergipe</SelectItem>
                          <SelectItem value="TO">Tocantins</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="experiencia">Experiência em Vendas</Label>
                      <Select value={formData.experiencia} onValueChange={value => handleInputChange("experiencia", value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione sua experiência" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="nenhuma">Nenhuma experiência</SelectItem>
                          <SelectItem value="1-2">1 a 2 anos</SelectItem>
                          <SelectItem value="3-5">3 a 5 anos</SelectItem>
                          <SelectItem value="5+">Mais de 5 anos</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="investimento">Capital Disponível para Investimento</Label>
                    <Select value={formData.investimento} onValueChange={value => handleInputChange("investimento", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a faixa de investimento" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15-25k">R$ 15.000 - R$ 25.000</SelectItem>
                        <SelectItem value="25-50k">R$ 25.000 - R$ 50.000</SelectItem>
                        <SelectItem value="50k+">Acima de R$ 50.000</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="observacoes">Observações</Label>
                    <Textarea id="observacoes" value={formData.observacoes} onChange={e => handleInputChange("observacoes", e.target.value)} placeholder="Conte-nos mais sobre seu interesse na franquia..." rows={4} />
                  </div>

                  <Button type="submit" size="lg" className="w-full gap-2">
                    Enviar Solicitação
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Contato Section */}
      <section className="py-20 bg-secondary/5">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-8">Fale Conosco</h2>
            <p className="text-xl text-muted-foreground mb-12">
              Nossa equipe está pronta para esclarecer suas dúvidas sobre a franquia.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="flex flex-col items-center">
                <Phone className="h-12 w-12 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2">Telefone</h3>
                <p className="text-muted-foreground">0800 591 8795</p>
              </div>

              <div className="flex flex-col items-center">
                <Mail className="h-12 w-12 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2">E-mail</h3>
                <p className="text-muted-foreground">franquias@medpassbeneficios.com.br</p>
              </div>

              <div className="flex flex-col items-center">
                <Clock className="h-12 w-12 text-primary mb-4" />
                <h3 className="text-xl font-semibold mb-2">Horário</h3>
                <p className="text-muted-foreground">Segunda a Sexta<br />8h às 18h</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>;
}