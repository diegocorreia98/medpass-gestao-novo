import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/AuthContext"
import type { Tables } from "@/integrations/supabase/types"

type Convite = Tables<'convites_franqueados'>

export function useConvites() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { user, profile } = useAuth()

  // Buscar convites
  const { data: convites = [], isLoading, error, refetch } = useQuery({
    queryKey: ['convites', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('Usuário não autenticado')

      let query = supabase
        .from('convites_franqueados')
        .select(`
          *,
          unidades:unidade_id (
            id,
            nome,
            email
          )
        `)

      // Apenas matriz pode ver todos os convites
      if (profile?.user_type !== 'matriz') {
        return []
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    },
    enabled: !!user && profile?.user_type === 'matriz',
  })

  // Buscar convite por unidade
  const getConviteByUnidade = (unidadeId: string): Convite | undefined => {
    return convites.find(convite => convite.unidade_id === unidadeId)
  }

  // Verificar status do convite
  const getConviteStatus = (convite: Convite | undefined) => {
    if (!convite) return 'not_sent'
    if (convite.aceito) return 'accepted'
    if (new Date(convite.expires_at) < new Date()) return 'expired'
    return 'sent'
  }

  // Mutation para reenviar convite
  const resendInvite = useMutation({
    mutationFn: async ({ unidadeId, email, nome }: { unidadeId: string; email: string; nome: string }) => {
      console.log('=== REENVIANDO CONVITE ===')
      console.log('Dados:', { unidadeId, email, nome })
      
      const { data, error } = await supabase.functions.invoke('send-franchise-invite', {
        body: {
          unidadeId,
          email,
          nome,
        }
      })

      console.log('Resposta da função:', { data, error })

      if (error) {
        console.error('ERRO ao reenviar convite:', error)
        throw error
      }

      console.log('Convite reenviado com sucesso:', data)
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['convites'] })
      
      if (data?.manual_action_required) {
        toast({
          title: "Convite processado!",
          description: `Convite salvo no sistema. Compartilhe manualmente: ${data.invite_url}`,
        })
      } else if (data?.warning) {
        toast({
          title: "Convite processado!",
          description: data.message || "Convite processado com sucesso.",
        })
      } else {
        toast({
          title: "Convite reenviado!",
          description: "O convite foi reenviado por email com sucesso.",
        })
      }
    },
    onError: (error) => {
      console.error('Erro completo ao reenviar convite:', error)
      toast({
        title: "Erro ao reenviar convite",
        description: error.message || "Houve um erro ao tentar reenviar o convite.",
        variant: "destructive"
      })
    }
  })

  // Mutation para marcar convite como aceito manualmente
  const markInviteAccepted = useMutation({
    mutationFn: async ({ unidadeId }: { unidadeId: string }) => {
      // Buscar o convite existente
      const convite = convites.find(c => c.unidade_id === unidadeId)
      if (!convite) {
        throw new Error('Convite não encontrado')
      }

      // Atualizar o convite para aceito
      const { error } = await supabase
        .from('convites_franqueados')
        .update({ 
          aceito: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', convite.id)

      if (error) {
        console.error('ERRO ao marcar convite como aceito:', error)
        throw error
      }

      return { success: true }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['convites'] })
      toast({
        title: "Convite aceito!",
        description: "O convite foi marcado como aceito manualmente.",
      })
    },
    onError: (error) => {
      console.error('Erro ao marcar convite como aceito:', error)
      toast({
        title: "Erro ao aceitar convite",
        description: error.message || "Houve um erro ao marcar o convite como aceito.",
        variant: "destructive"
      })
    }
  })

  return {
    convites,
    isLoading,
    error,
    refetch,
    getConviteByUnidade,
    getConviteStatus,
    resendInvite: resendInvite.mutate,
    isResending: resendInvite.isPending,
    markInviteAccepted: markInviteAccepted.mutate,
    isMarkingAccepted: markInviteAccepted.isPending,
  }
}