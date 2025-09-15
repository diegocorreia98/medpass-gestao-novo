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

      // For matriz users, use the Edge Function to create unit with user
      if (profile?.user_type === 'matriz' && unidade.email && unidade.responsavel) {
        console.log('Creating unit with user via Edge Function...');

        try {
          const { data: result, error: functionError } = await supabase.functions.invoke('create-unit-with-user', {
            body: {
              unidade: {
                nome: unidade.nome,
                cnpj: unidade.cnpj,
                endereco: unidade.endereco,
                cidade: unidade.cidade,
                estado: unidade.estado,
                telefone: unidade.telefone,
                franquia_id: unidade.franquia_id,
                status: unidade.status || 'ativo'
              },
              responsavel: {
                nome: unidade.responsavel,
                email: unidade.email,
                telefone: unidade.telefone
              }
            }
          });

          if (functionError) {
            console.error('Error calling create-unit-with-user:', functionError);
            throw new Error(`Edge Function não disponível: ${functionError.message}`);
          }

          if (result?.success) {
            console.log('Unit and user created successfully via Edge Function:', result);

            toast({
              title: "Unidade e usuário criados!",
              description: result.invitation_sent
                ? "Unidade criada, usuário criado e convite enviado com sucesso."
                : "Unidade criada e usuário criado. Convite será enviado posteriormente.",
            });

            return {
              id: result.unidade_id,
              nome: unidade.nome,
              email: unidade.email,
              responsavel: unidade.responsavel,
              user_id: result.user_id,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
          } else {
            throw new Error(result?.error || 'Edge Function falhou');
          }

        } catch (edgeFunctionError) {
          console.warn('Edge Function não disponível, usando método temporário:', edgeFunctionError);

          // Fallback: create unit without user_id and send invite the traditional way
          console.log('Using temporary fallback method...');

          // Create unit with a temporary user_id (we'll use the current matriz user temporarily)
          const { data: tempUnitData, error: tempUnitError } = await supabase
            .from('unidades')
            .insert({
              nome: unidade.nome,
              cnpj: unidade.cnpj,
              endereco: unidade.endereco,
              cidade: unidade.cidade,
              estado: unidade.estado,
              telefone: unidade.telefone,
              franquia_id: unidade.franquia_id,
              user_id: user.id, // Temporary - will be updated when user accepts invite
              responsavel: unidade.responsavel,
              email: unidade.email,
              status: unidade.status || 'ativo'
            })
            .select()
            .single();

          if (tempUnitError) {
            console.error('Error creating unit with fallback method:', tempUnitError);
            throw tempUnitError;
          }

          console.log('Unit created with fallback method:', tempUnitData.id);

          // Send invite using existing function
          try {
            const { error: inviteError } = await supabase.functions.invoke('send-franchise-invite', {
              body: {
                unidadeId: tempUnitData.id,
                email: unidade.email,
                nome: unidade.nome
              }
            });

            if (inviteError) {
              console.error('Error sending invite:', inviteError);
              // Don't fail the whole process if invite fails
            }
          } catch (inviteErr) {
            console.error('Failed to send invite:', inviteErr);
            // Continue without failing
          }

          toast({
            title: "Unidade criada!",
            description: "Unidade criada com sucesso. O convite será enviado por email (requer configuração manual do usuário).",
          });

          return tempUnitData;
        }
      }

      // For unidade users, create their own unit (existing behavior)
      const unitData = {
        ...unidade,
        user_id: user.id,
      }

      const { data, error } = await supabase
        .from('unidades')
        .insert(unitData)
        .select()
        .single()

      if (error) throw error

      toast({
        title: "Unidade criada!",
        description: "A unidade foi criada com sucesso.",
      });

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