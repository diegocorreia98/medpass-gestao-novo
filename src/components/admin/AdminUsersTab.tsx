import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { UserPlus, Mail, RotateCcw, Trash2, Users, Clock } from "lucide-react";
import { useAdminUsers } from "@/hooks/useAdminUsers";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export const AdminUsersTab = () => {
  const [email, setEmail] = useState("");
  const [nome, setNome] = useState("");
  const [showInviteForm, setShowInviteForm] = useState(false);

  const { 
    usuarios, 
    convitesPendentes, 
    isLoading, 
    sendInvite, 
    resendInvite, 
    removeInvite 
  } = useAdminUsers();

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !nome) return;

    await sendInvite(email, nome);
    setEmail("");
    setNome("");
    setShowInviteForm(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Gerenciar Usuários Matriz</h3>
          <p className="text-sm text-muted-foreground">
            Adicione e gerencie usuários com acesso ao painel de administração
          </p>
        </div>
        <Button 
          onClick={() => setShowInviteForm(!showInviteForm)}
          disabled={isLoading}
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Convidar Usuário
        </Button>
      </div>

      {showInviteForm && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="w-5 h-5" />
              Enviar Convite
            </CardTitle>
            <CardDescription>
              Envie um convite para um novo usuário acessar o painel matriz
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSendInvite} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome Completo</Label>
                  <Input
                    id="nome"
                    type="text"
                    placeholder="Digite o nome completo"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Digite o email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Enviando..." : "Enviar Convite"}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowInviteForm(false)}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Usuários Ativos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Usuários Ativos ({usuarios.length})
            </CardTitle>
            <CardDescription>
              Usuários com acesso ao painel matriz
            </CardDescription>
          </CardHeader>
          <CardContent>
            {usuarios.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                Nenhum usuário encontrado
              </p>
            ) : (
              <div className="space-y-3">
                {usuarios.map((usuario) => (
                  <div key={usuario.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{usuario.full_name || 'Nome não informado'}</p>
                      <p className="text-sm text-muted-foreground">
                        {usuario.email || 'Email não disponível'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Criado {formatDistanceToNow(new Date(usuario.created_at), { 
                          addSuffix: true, 
                          locale: ptBR 
                        })}
                      </p>
                    </div>
                    <Badge variant="secondary">Ativo</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Convites Pendentes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Convites Pendentes ({convitesPendentes.length})
            </CardTitle>
            <CardDescription>
              Convites enviados aguardando aceitação
            </CardDescription>
          </CardHeader>
          <CardContent>
            {convitesPendentes.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                Nenhum convite pendente
              </p>
            ) : (
              <div className="space-y-3">
                {convitesPendentes.map((convite) => (
                  <div key={convite.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium">{convite.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Enviado {formatDistanceToNow(new Date(convite.created_at), { 
                          addSuffix: true, 
                          locale: ptBR 
                        })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Expira {formatDistanceToNow(new Date(convite.expires_at), { 
                          addSuffix: true, 
                          locale: ptBR 
                        })}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => resendInvite(convite.id)}
                        disabled={isLoading}
                      >
                        <RotateCcw className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => removeInvite(convite.id)}
                        disabled={isLoading}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};