import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ConviteMatriz {
  id: string;
  email: string;
  token: string;
  expires_at: string;
  aceito: boolean;
  user_id_aceito?: string;
  created_at: string;
  created_by: string;
}

interface UsuarioMatriz {
  id: string;
  user_id: string;
  full_name: string | null;
  created_at: string;
  email?: string;
}

export const useAdminUsers = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar usuários matriz existentes
  const { data: usuarios = [], refetch: refetchUsuarios } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, user_id, full_name, created_at')
        .eq('user_type', 'matriz')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar usuários matriz:', error);
        throw error;
      }

      // Buscar emails dos usuários através do auth.users (via RPC se disponível)
      const usuariosComEmail: UsuarioMatriz[] = await Promise.all(
        (data || []).map(async (usuario) => {
          try {
            // Como não podemos acessar auth.users diretamente, vamos tentar obter através de profiles
            return {
              ...usuario,
              email: null, // Será preenchido se necessário
            };
          } catch (error) {
            console.error('Erro ao buscar email:', error);
            return { ...usuario, email: null };
          }
        })
      );

      return usuariosComEmail;
    },
    enabled: true,
  });

  // Buscar convites pendentes
  const { data: convitesPendentes = [], refetch: refetchConvites } = useQuery({
    queryKey: ['admin-invites'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('convites_matriz')
        .select('*')
        .eq('aceito', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar convites:', error);
        throw error;
      }

      return data as ConviteMatriz[];
    },
    enabled: true,
  });

  // Enviar convite
  const sendInviteMutation = useMutation({
    mutationFn: async ({ email, nome }: { email: string; nome: string }) => {
      const { data, error } = await supabase.functions.invoke('send-admin-invite', {
        body: { email, nome },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Convite enviado",
        description: "O convite foi enviado com sucesso para o email informado.",
      });
      refetchConvites();
    },
    onError: (error: any) => {
      console.error('Erro ao enviar convite:', error);
      toast({
        title: "Erro ao enviar convite",
        description: error.message || "Ocorreu um erro ao enviar o convite. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Reenviar convite
  const resendInviteMutation = useMutation({
    mutationFn: async (conviteId: string) => {
      // Buscar dados do convite
      const { data: convite, error: fetchError } = await supabase
        .from('convites_matriz')
        .select('email')
        .eq('id', conviteId)
        .single();

      if (fetchError) throw fetchError;

      // Reenviar convite (criar novo)
      const { data, error } = await supabase.functions.invoke('send-admin-invite', {
        body: { email: convite.email, nome: convite.email }, // Use email como nome temporário
      });

      if (error) throw error;

      // Marcar convite antigo como expirado
      await supabase
        .from('convites_matriz')
        .update({ expires_at: new Date().toISOString() })
        .eq('id', conviteId);

      return data;
    },
    onSuccess: () => {
      toast({
        title: "Convite reenviado",
        description: "Um novo convite foi enviado com sucesso.",
      });
      refetchConvites();
    },
    onError: (error: any) => {
      console.error('Erro ao reenviar convite:', error);
      toast({
        title: "Erro ao reenviar convite",
        description: error.message || "Ocorreu um erro ao reenviar o convite.",
        variant: "destructive",
      });
    },
  });

  // Remover convite
  const removeInviteMutation = useMutation({
    mutationFn: async (conviteId: string) => {
      const { error } = await supabase
        .from('convites_matriz')
        .update({ expires_at: new Date().toISOString() })
        .eq('id', conviteId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Convite removido",
        description: "O convite foi removido com sucesso.",
      });
      refetchConvites();
    },
    onError: (error: any) => {
      console.error('Erro ao remover convite:', error);
      toast({
        title: "Erro ao remover convite",
        description: "Ocorreu um erro ao remover o convite.",
        variant: "destructive",
      });
    },
  });

  const sendInvite = async (email: string, nome: string) => {
    setIsLoading(true);
    try {
      await sendInviteMutation.mutateAsync({ email, nome });
    } finally {
      setIsLoading(false);
    }
  };

  const resendInvite = async (conviteId: string) => {
    await resendInviteMutation.mutateAsync(conviteId);
  };

  const removeInvite = async (conviteId: string) => {
    await removeInviteMutation.mutateAsync(conviteId);
  };

  const refreshData = () => {
    refetchUsuarios();
    refetchConvites();
  };

  return {
    usuarios,
    convitesPendentes,
    isLoading: isLoading || sendInviteMutation.isPending || resendInviteMutation.isPending || removeInviteMutation.isPending,
    sendInvite,
    resendInvite,
    removeInvite,
    refreshData,
  };
};