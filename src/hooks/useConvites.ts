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

      const query = supabase
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

  // Mutation para sincronizar status de convites
  const syncInviteStatuses = useMutation({
    mutationFn: async () => {
      console.log('=== SINCRONIZANDO STATUS DE CONVITES ===')

      // Buscar convites pendentes (não aceitos e não expirados)
      const { data: pendingInvites, error: invitesError } = await supabase
        .from('convites_franqueados')
        .select('id, email, unidade_id, aceito, expires_at')
        .eq('aceito', false)
        .gt('expires_at', new Date().toISOString())

      if (invitesError) {
        console.error('Erro ao buscar convites pendentes:', invitesError)
        throw invitesError
      }

      if (!pendingInvites || pendingInvites.length === 0) {
        console.log('Nenhum convite pendente encontrado')
        return { updated: 0, total: 0 }
      }

      console.log(`Found ${pendingInvites.length} pending invites`)

      let updatedCount = 0

      // Para cada convite pendente, verificar se existe usuário ativo com o email
      for (const invite of pendingInvites) {
        try {
          // Verificar se existe um perfil de usuário ativo com este email
          const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('user_id, user_type')
            .eq('user_type', 'unidade')

          if (profileError) {
            console.error('Erro ao buscar perfis:', profileError)
            continue
          }

          // Verificar se existe usuário ativo para este convite usando uma abordagem diferente
          // Buscar unidades que já têm user_id mas o convite ainda não foi marcado como aceito
          const { data: associatedUnits, error: unitsError } = await supabase
            .from('unidades')
            .select('user_id, email')
            .eq('email', invite.email)
            .not('user_id', 'is', null)

          let matchingUserId = null
          if (!unitsError && associatedUnits && associatedUnits.length > 0) {
            matchingUserId = associatedUnits[0].user_id
          }

          if (matchingUserId) {
            console.log(`Found active user for invite ${invite.id}: ${invite.email}`)

            // Marcar convite como aceito
            const { error: updateInviteError } = await supabase
              .from('convites_franqueados')
              .update({
                aceito: true,
                user_id_aceito: matchingUserId,
                updated_at: new Date().toISOString()
              })
              .eq('id', invite.id)

            if (updateInviteError) {
              console.error('Erro ao atualizar convite:', invite.id, updateInviteError)
              continue
            }

            // Associar unidade ao usuário
            const { error: updateUnitError } = await supabase
              .from('unidades')
              .update({ user_id: matchingUserId })
              .eq('id', invite.unidade_id)

            if (updateUnitError) {
              console.error('Erro ao associar unidade:', updateUnitError)
              // Continue - invite is still marked as accepted
            }

            updatedCount++
            console.log(`Successfully synced invite ${invite.id}`)
          }
        } catch (error) {
          console.error('Erro ao processar convite:', invite.id, error)
        }
      }

      console.log(`Sync completed: ${updatedCount}/${pendingInvites.length} invites updated`)
      return { updated: updatedCount, total: pendingInvites.length }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['convites'] })

      if (result.updated > 0) {
        toast({
          title: "Sincronização concluída!",
          description: `${result.updated} de ${result.total} convites foram atualizados automaticamente.`,
        })
      } else {
        toast({
          title: "Sincronização concluída",
          description: result.total > 0
            ? "Nenhum convite precisou ser atualizado."
            : "Nenhum convite pendente encontrado.",
        })
      }
    },
    onError: (error) => {
      console.error('Erro na sincronização:', error)
      toast({
        title: "Erro na sincronização",
        description: "Houve um erro ao sincronizar os status dos convites.",
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
    syncInviteStatuses: syncInviteStatuses.mutate,
    isSyncing: syncInviteStatuses.isPending,
  }
}