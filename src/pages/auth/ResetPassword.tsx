import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Lock, Loader2, AlertCircle, CheckCircle } from 'lucide-react';

export const ResetPassword: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { updatePassword } = useAuth();
  
  // Check if this is an invitation flow
  const conviteToken = searchParams.get('convite');
  const tipoConvite = searchParams.get('tipo');
  const isInvitationFlow = conviteToken && tipoConvite === 'matriz';

  useEffect(() => {
    const setupSession = async () => {
      console.log('🔍 RESET PASSWORD DEBUG - Component mounted');
      console.log('📍 Current URL:', window.location.href);
      console.log('🔗 Hash:', window.location.hash);
      console.log('📍 Pathname:', window.location.pathname);
      console.log('🔍 Search params:', window.location.search);
      console.log('🎫 Invitation flow:', isInvitationFlow, { conviteToken, tipoConvite });
      
      // For invitation flow, validate the invitation token
      if (isInvitationFlow) {
        try {
          console.log('Validating invitation token...');
          const { data: conviteData, error: conviteError } = await supabase
            .from('convites_matriz')
            .select('*')
            .eq('token', conviteToken)
            .eq('aceito', false)
            .gt('expires_at', new Date().toISOString())
            .single();

          if (conviteError || !conviteData) {
            console.error('Invalid invitation token:', conviteError);
            setError('Convite inválido ou expirado. Entre em contato com o administrador.');
            return;
          }

          console.log('Invitation token validated successfully');
          return; // Skip session setup for invitation flow
        } catch (error) {
          console.error('Error validating invitation:', error);
          setError('Erro ao validar convite. Tente novamente.');
          return;
        }
      }
      
      // Regular password reset flow - check for session tokens
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const tokenType = hashParams.get('type');
      const expiresAt = hashParams.get('expires_at');
      const expiresIn = hashParams.get('expires_in');
      
      console.log('🔑 Tokens found:', { 
        accessToken: !!accessToken, 
        refreshToken: !!refreshToken, 
        type: tokenType,
        expiresAt,
        expiresIn
      });
      
      if (!accessToken || !refreshToken) {
        console.error('Missing tokens in URL');
        setError('Link de recuperação inválido ou expirado. Verifique se você clicou no link mais recente do email.');
        return;
      }

      if (tokenType !== 'recovery') {
        console.error('Invalid token type:', tokenType);
        setError('Tipo de link inválido. Este link não é para recuperação de senha.');
        return;
      }

      try {
        console.log('Setting session with tokens...');
        // Set the session with the tokens from the URL
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });

        if (error) {
          console.error('Error setting session:', error);
          setError(`Erro ao configurar sessão: ${error.message}`);
          return;
        }

        console.log('Session set successfully:', !!data.session);
        
        // Verify the session was set
        const { data: currentSession } = await supabase.auth.getSession();
        if (!currentSession.session) {
          console.error('Session not found after setting');
          setError('Falha ao estabelecer sessão. Tente novamente.');
          return;
        }
        
        console.log('Session verified, user ready for password update');
      } catch (error) {
        console.error('Exception setting session:', error);
        setError('Erro inesperado ao processar o link. Tente solicitar um novo link.');
      }
    };

    setupSession();
  }, [isInvitationFlow, conviteToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }
    
    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      if (isInvitationFlow) {
        // Invitation flow - create new user account
        console.log('Creating new user account for invitation...');
        
        // Get invitation details
        const { data: conviteData, error: conviteError } = await supabase
          .from('convites_matriz')
          .select('email')
          .eq('token', conviteToken)
          .single();
          
        if (conviteError || !conviteData) {
          setError('Convite inválido. Entre em contato com o administrador.');
          return;
        }
        
        // Create the user account
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: conviteData.email,
          password: password,
          options: {
            data: {
              user_type: 'matriz',
            }
          }
        });
        
        if (signUpError) {
          console.error('Signup error:', signUpError);
          setError(signUpError.message || 'Erro ao criar conta.');
          return;
        }
        
        if (!signUpData.user) {
          setError('Erro ao criar usuário. Tente novamente.');
          return;
        }
        
        // Mark invitation as accepted
        const { error: updateError } = await supabase
          .from('convites_matriz')
          .update({ 
            aceito: true, 
            user_id_aceito: signUpData.user.id,
            updated_at: new Date().toISOString()
          })
          .eq('token', conviteToken);
          
        if (updateError) {
          console.error('Error updating invitation:', updateError);
          // Don't fail here, user account was created successfully
        }
        
        console.log('User account created and invitation accepted successfully');
        toast({
          title: "Conta criada com sucesso!",
          description: "Sua conta foi criada. Você será redirecionado para fazer login.",
        });
        
        // Sign out and redirect to login
        await supabase.auth.signOut();
        setTimeout(() => {
          navigate('/auth');
        }, 2000);
        
      } else {
        // Regular password reset flow
        // Verify we have a valid session before attempting password update
        const { data: currentSession } = await supabase.auth.getSession();
        if (!currentSession.session) {
          setError('Sessão expirada. Solicite um novo link de recuperação.');
          return;
        }
        
        console.log('Attempting password update...');
        const { error } = await updatePassword(password);
        
        if (error) {  
          console.error('Password update error:', error);
          setError(error.message || 'Erro ao atualizar a senha.');
          return;
        }
        
        console.log('Password updated successfully');
        toast({
          title: "Senha atualizada!",
          description: "Sua senha foi alterada com sucesso. Você será redirecionado para fazer login.",
        });
        
        // Sign out and redirect to login after successful password update
        await supabase.auth.signOut();
        setTimeout(() => {
          navigate('/auth');
        }, 2000);
      }
    } catch (error: any) {
      console.error('Password/signup exception:', error);
      setError(error.message || 'Erro ao processar solicitação.');
    } finally {
      setLoading(false);
    }
  };

  if (error && error.includes('inválido')) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: 'url(/uploads/f72f8f93-e250-4870-9d33-41b5e3e657f9.png)' }}>
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-xl">Link Inválido</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Este link de recuperação é inválido ou já expirou.
              Solicite um novo link de recuperação.
            </p>
            
            <Button 
              onClick={() => navigate('/auth/forgot-password')}
              className="w-full"
            >
              Solicitar Novo Link
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: 'url(/uploads/f72f8f93-e250-4870-9d33-41b5e3e657f9.png)' }}>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Lock className="h-6 w-6 text-primary" />
          </div>
            <CardTitle className="text-xl">
              {isInvitationFlow ? 'Criar Sua Senha' : 'Nova Senha'}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              {isInvitationFlow 
                ? 'Você foi convidado para acessar o painel. Crie sua senha abaixo.'
                : 'Digite sua nova senha abaixo'
              }
            </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">
                {isInvitationFlow ? 'Senha' : 'Nova Senha'}
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isInvitationFlow ? "Digite sua senha" : "Digite sua nova senha"}
                required
                minLength={6}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirme sua nova senha"
                required
                minLength={6}
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="text-sm text-muted-foreground">
              A senha deve ter pelo menos 6 caracteres.
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isInvitationFlow ? 'Criando conta...' : 'Atualizando...'}
                </>
              ) : (
                isInvitationFlow ? 'Criar Conta' : 'Atualizar Senha'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};