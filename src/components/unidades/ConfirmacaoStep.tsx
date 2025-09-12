import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Building2, User, Mail, Phone, MapPin, CreditCard, Hash } from "lucide-react"
import type { UnidadeFormData } from "./UnidadeStep"
import type { ResponsavelFormData } from "./ResponsavelStep"

interface ConfirmacaoStepProps {
  unidadeData: UnidadeFormData
  responsavelData: ResponsavelFormData
  franquiaNome?: string
}

export function ConfirmacaoStep({ unidadeData, responsavelData, franquiaNome }: ConfirmacaoStepProps) {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h3 className="text-xl font-semibold text-foreground">Revisar Informações</h3>
        <p className="text-muted-foreground">
          Confirme os dados antes de criar a unidade e enviar o convite ao responsável
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Dados da Unidade */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Informações da Unidade
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium text-foreground">{unidadeData.nome}</h4>
              {franquiaNome && (
                <Badge variant="secondary" className="mt-1">
                  {franquiaNome}
                </Badge>
              )}
            </div>

            {unidadeData.cnpj && (
              <div className="flex items-start gap-2">
                <Hash className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">CNPJ</p>
                  <p className="text-sm text-muted-foreground">{unidadeData.cnpj}</p>
                </div>
              </div>
            )}

            {unidadeData.telefone && (
              <div className="flex items-start gap-2">
                <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Telefone</p>
                  <p className="text-sm text-muted-foreground">{unidadeData.telefone}</p>
                </div>
              </div>
            )}

            {(unidadeData.endereco || unidadeData.cidade || unidadeData.estado) && (
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Endereço</p>
                  <div className="text-sm text-muted-foreground">
                    {unidadeData.endereco && <p>{unidadeData.endereco}</p>}
                    {(unidadeData.cidade || unidadeData.estado) && (
                      <p>{unidadeData.cidade}{unidadeData.cidade && unidadeData.estado ? ', ' : ''}{unidadeData.estado}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {unidadeData.observacoes && (
              <div>
                <p className="text-sm font-medium">Observações</p>
                <p className="text-sm text-muted-foreground">{unidadeData.observacoes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dados do Responsável */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Responsável da Unidade
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="font-medium text-foreground">{responsavelData.nome}</h4>
              <Badge variant="outline" className="mt-1">
                {responsavelData.cuf}
              </Badge>
            </div>

            <div className="flex items-start gap-2">
              <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Email</p>
                <p className="text-sm text-muted-foreground">{responsavelData.email}</p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm font-medium">Telefone</p>
                <p className="text-sm text-muted-foreground">{responsavelData.telefone}</p>
              </div>
            </div>

            <Separator />

            <div className="flex items-start gap-2">
              <CreditCard className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="space-y-2">
                <p className="text-sm font-medium">Dados Bancários</p>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p><span className="font-medium">Banco:</span> {responsavelData.banco}</p>
                  <p><span className="font-medium">Tipo:</span> {responsavelData.tipoConta}</p>
                  <p><span className="font-medium">Agência:</span> {responsavelData.agencia}</p>
                  <p><span className="font-medium">Conta:</span> {responsavelData.conta}</p>
                  <p><span className="font-medium">PIX:</span> {responsavelData.chavePix}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Mail className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <h4 className="font-medium text-foreground">O que acontece a seguir?</h4>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                <li>• A unidade será criada no sistema</li>
                <li>• Um email de convite será enviado para <strong>{responsavelData.email}</strong></li>
                <li>• O responsável receberá um link para aceitar o convite e acessar o sistema</li>
                <li>• Após aceitar, ele poderá gerenciar a unidade e receber comissões</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}