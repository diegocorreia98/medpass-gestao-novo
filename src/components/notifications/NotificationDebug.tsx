import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Profile {
  user_id: string;
  user_type: string;
  full_name: string | null;
}

export function NotificationDebug() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { profile } = useAuth();

  const fetchProfiles = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, user_type, full_name')
        .order('user_type');

      if (error) {
        setError(error.message);
        console.error('Erro ao buscar profiles:', error);
      } else {
        setProfiles(data || []);
        console.log('Profiles encontrados:', data);
      }
    } catch (err) {
      setError('Erro ao conectar com o banco');
      console.error('Erro:', err);
    } finally {
      setLoading(false);
    }
  };

  const testNotificationForUnidade = async () => {
    try {
      console.log('🧪 Testando notificação para unidades...');

      // Get all unidade users
      const { data: unidadeUsers, error } = await supabase
        .from('profiles')
        .select('user_id, user_type, full_name')
        .eq('user_type', 'unidade');

      if (error) {
        console.error('❌ Erro ao buscar usuários unidade:', error);
        return;
      }

      console.log('👥 Usuários unidade encontrados:', unidadeUsers);

      if (!unidadeUsers || unidadeUsers.length === 0) {
        console.warn('⚠️ Nenhum usuário unidade encontrado!');
        return;
      }

      // Create notifications for all unidade users
      const notifications = unidadeUsers.map(user => ({
        user_id: user.user_id,
        titulo: 'Teste Debug - Notificação Unidade',
        mensagem: `Teste de notificação para ${user.full_name || 'usuário'} (tipo: ${user.user_type})`,
        tipo: 'info',
        action_url: '/unidade/notificacoes',
        action_label: 'Ver Histórico'
      }));

      console.log('📬 Inserindo notificações:', notifications);

      const { data: insertedData, error: insertError } = await supabase
        .from('notificacoes')
        .insert(notifications)
        .select();

      if (insertError) {
        console.error('❌ Erro ao inserir notificações:', insertError);
      } else {
        console.log('✅ Notificações inseridas com sucesso:', insertedData);
      }

    } catch (error) {
      console.error('❌ Erro no teste:', error);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const matrizUsers = profiles.filter(p => p.user_type === 'matriz');
  const unidadeUsers = profiles.filter(p => p.user_type === 'unidade');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Debug - Sistema de Notificações</CardTitle>
        <CardDescription>
          Informações de debug para diagnosticar problemas com notificações
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button onClick={fetchProfiles} disabled={loading}>
            {loading ? "Carregando..." : "Recarregar Usuários"}
          </Button>
          <Button onClick={testNotificationForUnidade} variant="outline">
            Teste Direto - Notificação Unidade
          </Button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700">
            Erro: {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h3 className="font-medium mb-2">Usuários Matriz ({matrizUsers.length})</h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {matrizUsers.map(user => (
                <div key={user.user_id} className="flex items-center justify-between p-2 border rounded">
                  <span className="text-sm">{user.full_name || 'Sem nome'}</span>
                  <Badge variant="secondary">matriz</Badge>
                </div>
              ))}
              {matrizUsers.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum usuário matriz encontrado</p>
              )}
            </div>
          </div>

          <div>
            <h3 className="font-medium mb-2">Usuários Unidade ({unidadeUsers.length})</h3>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {unidadeUsers.map(user => (
                <div key={user.user_id} className="flex items-center justify-between p-2 border rounded">
                  <span className="text-sm">{user.full_name || 'Sem nome'}</span>
                  <Badge variant="outline">unidade</Badge>
                </div>
              ))}
              {unidadeUsers.length === 0 && (
                <p className="text-sm text-muted-foreground">Nenhum usuário unidade encontrado</p>
              )}
            </div>
          </div>
        </div>

        <div className="p-3 bg-blue-50 border border-blue-200 rounded">
          <h4 className="font-medium text-blue-900">Usuário Atual</h4>
          <p className="text-sm text-blue-700">
            ID: {profile?.user_id}<br/>
            Tipo: <Badge variant={profile?.user_type === 'matriz' ? 'default' : 'outline'}>
              {profile?.user_type}
            </Badge><br/>
            Nome: {profile?.full_name || 'Não definido'}
          </p>
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <p>💡 <strong>Dica:</strong> Abra o console do navegador (F12) para ver logs detalhados</p>
          <p>🔍 <strong>Para testar:</strong> Use o botão "Teste Direto" e verifique se aparece no sino de notificações</p>
        </div>
      </CardContent>
    </Card>
  );
}