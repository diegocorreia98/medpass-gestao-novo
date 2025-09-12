import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/contexts/AuthContext"
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types"

type Unidade = Tables<'unidades'>
type UnidadeInsert = TablesInsert<'unidades'>
type UnidadeUpdate = TablesUpdate<'unidades'>

export function useUnidades() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const { user, profile } = useAuth()

  // Buscar unidades
  const { data: unidades = [], isLoading, error, refetch } = useQuery({
    queryKey: ['unidades', user?.id],
    queryFn: async () => {
      if (!user) throw new Error('Usuário não autenticado')

      let query = supabase
        .from('unidades')
        .select(`
          *,
          franquia:franquias(
            id,
            nome,
            descricao
          )
        `)

      // Se for unidade, só vê a própria; se for matriz, vê todas
      if (profile?.user_type === 'unidade') {
        query = query.eq('user_id', user.id)
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    },
    enabled: !!user,
    refetchInterval: 5 * 60 * 1000, // Atualiza a cada 5 minutos (reduzido de 30s)
  })

  // Mutation para criar unidade
  const createUnidade = useMutation({
    mutationFn: async (unidade: Omit<UnidadeInsert, 'user_id'>) => {
      if (!user) throw new Error('Usuário não autenticado')

      // Matriz users create units without immediate ownership (user_id = null)
      // Unidade users create their own unit (user_id = user.id)
      const unitData = {
        ...unidade,
        user_id: profile?.user_type === 'matriz' ? null : user.id,
      }

      const { data, error } = await supabase
        .from('unidades')
        .insert(unitData)
        .select()
        .single()

      if (error) throw error

      // Enviar convite por email usando edge function
      if (unidade.email) {
        try {
          console.log('Enviando convite para unidade:', { id: data.id, email: unidade.email, nome: unidade.nome });
          
          const { data: inviteResult, error: inviteError } = await supabase.functions.invoke('send-franchise-invite', {
            body: {
              unidadeId: data.id,
              email: unidade.email,
              nome: unidade.nome,
            }
          });

          console.log('Resultado do convite:', { inviteResult, inviteError });

          if (inviteError) {
            console.error('Erro ao invocar função de convite:', inviteError);
            toast({
              title: "Unidade criada!",
              description: "Unidade criada, mas houve erro ao enviar o convite por email. Verifique os logs.",
              variant: "destructive"
            });
          } else if (inviteResult?.manual_action_required) {
            toast({
              title: "Unidade criada!",
              description: `Unidade criada. Convite salvo no sistema. URL: ${inviteResult.invite_url}`,
            });
          } else if (inviteResult?.warning) {
            toast({
              title: "Unidade criada!",
              description: inviteResult.message || "Unidade criada com sucesso.",
            });
          } else {
            toast({
              title: "Unidade criada!",
              description: "Unidade criada e convite enviado por email com sucesso.",
            });
          }
        } catch (error) {
          console.error('Erro ao enviar convite (catch):', error);
          toast({
            title: "Unidade criada!",
            description: "Unidade criada, mas houve erro ao enviar o convite por email.",
            variant: "destructive"
          });
        }
      } else {
        toast({
          title: "Unidade criada!",
          description: "A unidade foi criada com sucesso.",
        });
      }

      return data
    },
    onError: (error: any) => {
      // Handle duplicate key constraint error specifically
      if (error.code === '23505' && error.message.includes('unique_user_unidade')) {
        toast({
          title: "Erro ao criar unidade",
          description: "Este usuário já possui uma unidade associada.",
          variant: "destructive"
        })
      } else {
        toast({
          title: "Erro ao criar unidade",
          description: error.message,
          variant: "destructive"
        })
      }
    }
  })

  // Mutation para atualizar unidade
  const updateUnidade = useMutation({
    mutationFn: async ({ id, ...unidade }: UnidadeUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from('unidades')
        .update(unidade)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unidades'] })
      toast({
        title: "Unidade atualizada!",
        description: "A unidade foi atualizada com sucesso.",
      })
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar unidade",
        description: error.message,
        variant: "destructive"
      })
    }
  })

  // Mutation para deletar unidade (só matriz pode)
  const deleteUnidade = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('unidades')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unidades'] })
      toast({
        title: "Unidade removida!",
        description: "A unidade foi removida com sucesso.",
      })
    },
    onError: (error) => {
      toast({
        title: "Erro ao remover unidade",
        description: error.message,
        variant: "destructive"
      })
    }
  })

  // Função para buscar unidade por ID
  const getUnidadeById = async (id: string): Promise<Unidade | null> => {
    const { data, error } = await supabase
      .from('unidades')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      console.error('Erro ao buscar unidade:', error)
      return null
    }

    return data
  }

  return {
    unidades,
    isLoading,
    error,
    refetch,
    createUnidade: createUnidade.mutate,
    updateUnidade: updateUnidade.mutate,
    deleteUnidade: deleteUnidade.mutate,
    getUnidadeById,
    isCreating: createUnidade.isPending,
    isUpdating: updateUnidade.isPending,
    isDeleting: deleteUnidade.isPending,
    canManageAll: profile?.user_type === 'matriz'
  }
}