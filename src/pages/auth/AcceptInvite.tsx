import { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { supabase } from "@/integrations/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { Loader2, CheckCircle, XCircle } from "lucide-react"

const acceptInviteSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Senhas não coincidem",
  path: ["confirmPassword"],
})

type AcceptInviteForm = z.infer<typeof acceptInviteSchema>

interface ConviteData {
  id: string
  email: string
  expires_at: string
  aceito: boolean
  tipo?: 'franqueado' | 'matriz'
  unidades?: {
    nome: string
  }
}

export function AcceptInvite() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [conviteData, setConviteData] = useState<ConviteData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [accepting, setAccepting] = useState(false)

  const { register, handleSubmit, formState: { errors }, setValue } = useForm<AcceptInviteForm>({
    resolver: zodResolver(acceptInviteSchema)
  })

  useEffect(() => {
    async function validateToken() {
      if (!token) {
        setError("Token de convite não encontrado")
        setLoading(false)
        return
      }

      try {
        console.log('Validando token:', token)
        
        // Primeiro tenta buscar como convite de franqueado
        let { data: franqueadoData, error: franqueadoError } = await supabase
          .from('convites_franqueados')
          .select(`
            id,
            email,
            expires_at,
            aceito,
            unidades:unidade_id (
              nome
            )
          `)
          .eq('token', token)
          .maybeSingle()

        if (franqueadoData && !franqueadoError) {
          if (franqueadoData.aceito) {
            setError("Este convite já foi aceito")
            return
          }

          if (new Date(franqueadoData.expires_at) < new Date()) {
            setError("Este convite expirou")
            return
          }

          setConviteData({
            ...franqueadoData,
            tipo: 'franqueado'
          } as ConviteData)
          setValue('email', franqueadoData.email)
          setLoading(false)
          return
        }

        // Se não encontrou como franqueado, tenta como convite matriz
        const { data: matrizData, error: matrizError } = await supabase
          .from('convites_matriz')
          .select('id, email, expires_at, aceito')
          .eq('token', token)
          .maybeSingle()

        if (matrizError) {
          console.error('Erro ao buscar convite matriz:', matrizError)
          setError("Erro ao validar convite")
          return
        }

        if (!matrizData) {
          setError("Convite não encontrado")
          return
        }

        if (matrizData.aceito) {
          setError("Este convite já foi aceito")
          return
        }

        if (new Date(matrizData.expires_at) < new Date()) {
          setError("Este convite expirou")
          return
        }

        setConviteData({
          ...matrizData,
          tipo: 'matriz'
        } as ConviteData)
        setValue('email', matrizData.email)
        
      } catch (err) {
        console.error('Erro inesperado:', err)
        setError("Erro inesperado ao validar convite")
      } finally {
        setLoading(false)
      }
    }

    validateToken()
  }, [token, setValue])

  const onSubmit = async (data: AcceptInviteForm) => {
    if (!conviteData || !token) return

    setAccepting(true)
    
    try {
      console.log('Processando convite para:', data.email)
      
      let userId: string

      // 1. Verificar se é um usuário convidado (invited) que precisa confirmar
      try {
        console.log('Tentando aceitar convite via signInWithPassword...')
        
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password
        })

        if (authData.user) {
          userId = authData.user.id
          console.log('Login/Confirmação realizada com sucesso:', userId)
        } else if (authError) {
          // Se falhou login, pode ser que precise criar conta
          if (authError.message.includes('Invalid login credentials') || 
              authError.message.includes('Email not confirmed')) {
            
            console.log('Login falhou, tentando criar conta...')
            
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
              email: data.email,
              password: data.password,
              options: {
                data: {
                  user_type: conviteData.tipo || 'unidade',
                  full_name: data.email
                }
              }
            })

            if (signUpError) {
              console.error('Erro ao criar conta:', signUpError)
              
              if (signUpError.message.includes('already been registered')) {
                // Usuário existe mas senha está errada
                toast({
                  title: "Credenciais inválidas",
                  description: "Este email já está cadastrado. Verifique sua senha ou use 'Esqueci minha senha'.",
                  variant: "destructive"
                })
                return
              }
              throw signUpError
            }

            if (!signUpData.user) {
              throw new Error("Falha ao criar usuário")
            }

            userId = signUpData.user.id
            console.log('Conta criada com sucesso:', userId)
          } else {
            throw authError
          }
        }
      } catch (error: any) {
        console.error('Erro no processo de autenticação:', error)
        toast({
          title: "Erro de autenticação",
          description: error.message || "Erro ao processar convite. Verifique suas credenciais.",
          variant: "destructive"
        })
        return
      }

      // 2. Marcar convite como aceito
      if (conviteData.tipo === 'matriz') {
        const { error: updateError } = await supabase
          .from('convites_matriz')
          .update({
            aceito: true,
            user_id_aceito: userId
          })
          .eq('token', token)

        if (updateError) {
          console.error('Erro ao marcar convite matriz como aceito:', updateError)
          throw updateError
        }

        console.log('Convite matriz aceito com sucesso')
        
        // Para usuários matriz, só precisa marcar como aceito
        toast({
          title: "Convite aceito!",
          description: "Bem-vindo ao painel de administração.",
        })

        navigate("/")
        return
        
      } else {
        // Convite de franqueado (comportamento original)
        const { error: updateError } = await supabase
          .from('convites_franqueados')
          .update({
            aceito: true,
            user_id_aceito: userId
          })
          .eq('token', token)

        if (updateError) {
          console.error('Erro ao marcar convite como aceito:', updateError)
          throw updateError
        }

        console.log('Convite marcado como aceito')

        // 3. Buscar dados da unidade pelo convite
        const { data: conviteComUnidade, error: conviteQueryError } = await supabase
          .from('convites_franqueados')
          .select('unidade_id')
          .eq('token', token)
          .single()

        if (conviteQueryError) {
          console.error('Erro ao buscar dados do convite:', conviteQueryError)
          throw conviteQueryError
        }

        // 4. Vincular usuário à unidade
        const { error: unidadeError } = await supabase
          .from('unidades')
          .update({
            user_id: userId
          })
          .eq('id', conviteComUnidade.unidade_id)

        if (unidadeError) {
          console.error('Erro ao vincular usuário à unidade:', unidadeError)
          // Continuar o fluxo mesmo se der erro aqui
          toast({
            title: "Atenção",
            description: "Conta criada, mas houve erro ao vincular à unidade. Entre em contato com o suporte.",
            variant: "destructive"
          })
        } else {
          console.log('Usuário vinculado à unidade com sucesso')
        }

        toast({
          title: "Convite aceito com sucesso!",
          description: "Você foi autenticado e vinculado à unidade.",
        })

        // Redirecionar para o dashboard da unidade
        navigate('/unidade')
      }
        
    } catch (error: any) {
      console.error('Erro ao aceitar convite:', error)
      toast({
        title: "Erro ao aceitar convite",
        description: error.message || "Houve um erro ao criar sua conta.",
        variant: "destructive"
      })
    } finally {
      setAccepting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-primary/10 flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: 'url(/lovable-uploads/f72f8f93-e250-4870-9d33-41b5e3e657f9.png)' }}>
        <Card className="w-full max-w-md">
          <CardContent className="flex items-center justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Validando convite...</span>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-primary/10 flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: 'url(/lovable-uploads/f72f8f93-e250-4870-9d33-41b5e3e657f9.png)' }}>
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <CardTitle className="text-destructive">Convite Inválido</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => navigate('/auth')} 
              className="w-full"
              variant="outline"
            >
              Ir para Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-primary/10 flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: 'url(/lovable-uploads/f72f8f93-e250-4870-9d33-41b5e3e657f9.png)' }}>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
          <CardTitle>Aceitar Convite</CardTitle>
          <CardDescription>
            {conviteData?.tipo === 'matriz' ? (
              <>Você foi convidado para ser um administrador do sistema.</>
            ) : (
              <>
                Você foi convidado para ser um franqueado da unidade: <br />
                <strong>{conviteData?.unidades?.nome}</strong>
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                disabled
                {...register("email")}
                className="bg-muted"
              />
              {errors.email && (
                <Alert variant="destructive">
                  <AlertDescription>{errors.email.message}</AlertDescription>
                </Alert>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="Digite sua senha"
                {...register("password")}
              />
              {errors.password && (
                <Alert variant="destructive">
                  <AlertDescription>{errors.password.message}</AlertDescription>
                </Alert>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirme sua senha"
                {...register("confirmPassword")}
              />
              {errors.confirmPassword && (
                <Alert variant="destructive">
                  <AlertDescription>{errors.confirmPassword.message}</AlertDescription>
                </Alert>
              )}
            </div>

            <Button 
              type="submit" 
              className="w-full"
              disabled={accepting}
            >
              {accepting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando conta...
                </>
              ) : (
                "Aceitar Convite e Criar Conta"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}