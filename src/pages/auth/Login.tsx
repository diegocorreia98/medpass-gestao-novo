import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth, UserType } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Building2, Store, Loader2, AlertCircle } from 'lucide-react';
import { LoginPopupManager } from '@/components/notifications/PopupNotificationManager';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<UserType>('matriz');
  const [showPopups, setShowPopups] = useState(false);

  const { signIn, user, profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Safe error rendering helper
  const renderError = (errorMessage: string) => {
    if (typeof errorMessage !== 'string') {
      return 'Erro inesperado. Tente novamente.';
    }
    return errorMessage;
  };

  useEffect(() => {
    // Aguarda o loading e profile para redirecionar
    if (!authLoading && user && profile) {
      // Show popups after successful login but before redirect
      setShowPopups(true);

      // Small delay to allow popup to show before redirect
      const timer = setTimeout(() => {
        const redirectPath = profile.user_type === 'matriz' ? '/dashboard' : '/unidade';
        navigate(redirectPath, { replace: true });
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [user, profile, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error } = await signIn(email, password, activeTab);
      
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setError('Email ou senha incorretos');
        } else if (error.message.includes('Acesso negado')) {
          setError(error.message);
        } else {
          setError(error.message || 'Erro ao fazer login');
        }
      } else {
        // Login bem-sucedido - navegação será feita pelo useEffect
        toast({
          title: 'Login realizado com sucesso!',
          description: 'Redirecionando...',
        });
      }
    } catch (error) {
      setError('Erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setError('');
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value as UserType);
    resetForm();
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: 'url(/uploads/f72f8f93-e250-4870-9d33-41b5e3e657f9.png)' }}>
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            Entrar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="matriz" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Matriz
              </TabsTrigger>
              <TabsTrigger value="unidade" className="flex items-center gap-2">
                <Store className="h-4 w-4" />
                Unidade
              </TabsTrigger>
            </TabsList>

            <TabsContent value="matriz" className="mt-6">
              <div className="text-center text-sm text-muted-foreground mb-4">
                Acesso completo ao sistema - Gestão da matriz
              </div>
            </TabsContent>

            <TabsContent value="unidade" className="mt-6">
              <div className="text-center text-sm text-muted-foreground mb-4">
                Acesso de franqueado - Gestão da unidade
              </div>
            </TabsContent>
          </Tabs>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Digite seu email"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua senha"
                required
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{renderError(error)}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </Button>
          </form>

          <div className="mt-6">
            <div className="text-center">
              <Link to="/auth/forgot-password">
                <Button variant="link" className="text-sm">
                  Esqueceu sua senha?
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Popup Notifications Manager for Login */}
      {showPopups && user && profile && (
        <LoginPopupManager
          onEvent={(event) => {
            console.log('Login popup event:', event);
            // Handle popup events if needed
          }}
        />
      )}
    </div>
  );
};