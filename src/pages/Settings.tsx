import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { 
  Settings as SettingsIcon, 
  Bell, 
  Shield, 
  Palette, 
  Globe, 
  Moon, 
  Sun, 
  Monitor,
  Mail,
  Smartphone,
  Lock,
  Key,
  Eye,
  EyeOff,
  Server,
  Activity,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Loader2,
  Info,
  Code,
  MapPin,
  CreditCard,
  Webhook,
  RefreshCw,
  Copy,
  Calendar,
  TrendingUp
} from "lucide-react"
import { useApiLogs } from "@/hooks/useApiLogs"
import { useWebhookStats } from "@/hooks/useWebhookStats"
import { useNavigate } from "react-router-dom"
import { useState, useEffect } from "react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { useProfile } from "@/hooks/useProfile"
import { useUserSettings } from "@/hooks/useUserSettings"
import { useAuth } from "@/contexts/AuthContext"
import { AdminUsersTab } from "@/components/admin/AdminUsersTab"
import { formatWebhookEventName } from "@/utils/webhookEventFormatter"
import { ChangePasswordModal } from "@/components/profile/ChangePasswordModal"

export default function Settings() {
  const navigate = useNavigate()
  const { stats, testApiConnection, isTestingConnection } = useApiLogs()
  const { 
    stats: webhookStats, 
    recentEvents, 
    isLoading: webhookLoading, 
    isReprocessing, 
    fetchWebhookStats, 
    reprocessFailedEvents, 
    testWebhook 
  } = useWebhookStats()
  const { toast } = useToast()
  const { profile } = useProfile()
  const { user } = useAuth()
  const { settings, loading: settingsLoading, updateSettings } = useUserSettings()
  
  const [passwordModalOpen, setPasswordModalOpen] = useState(false)

  const [apiConfig, setApiConfig] = useState({
    apiKey: "",
    adesaoUrl: "",
    cancelamentoUrl: ""
  })

  const [isLoadingConfig, setIsLoadingConfig] = useState(false)
  const [isSavingConfig, setIsSavingConfig] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [eventModalOpen, setEventModalOpen] = useState(false)

  const loadCurrentConfig = async () => {
    setIsLoadingConfig(true)
    try {
      const { data, error } = await supabase.functions.invoke('get-api-settings')
      
      if (error) throw error
      
      setApiConfig({
        apiKey: data.apiKey || '',
        adesaoUrl: data.adesaoUrl || '',
        cancelamentoUrl: data.cancelamentoUrl || ''
      })
      
      toast({
        title: "Configurações Carregadas",
        description: "As configurações atuais foram carregadas com sucesso.",
      })
    } catch (error: any) {
      toast({
        title: "Erro ao Carregar",
        description: error.message || "Erro ao carregar configurações",
        variant: "destructive"
      })
    } finally {
      setIsLoadingConfig(false)
    }
  }

  const handleSaveConfig = async () => {
    if (!apiConfig.apiKey.trim() && !apiConfig.adesaoUrl.trim() && !apiConfig.cancelamentoUrl.trim()) {
      toast({
        title: "Erro de Validação",
        description: "Preencha pelo menos um campo para salvar as configurações.",
        variant: "destructive"
      })
      return
    }

    setIsSavingConfig(true)
    try {
      const { data, error } = await supabase.functions.invoke('update-api-settings', {
        body: {
          apiKey: apiConfig.apiKey.trim() || undefined,
          adesaoUrl: apiConfig.adesaoUrl.trim() || undefined,
          cancelamentoUrl: apiConfig.cancelamentoUrl.trim() || undefined
        }
      })
      
      if (error) throw error
      
      toast({
        title: "Configurações Salvas",
        description: "As configurações da API foram atualizadas com sucesso.",
      })

      // Recarregar as configurações para mostrar os valores mascarados
      await loadCurrentConfig()
      
    } catch (error: any) {
      toast({
        title: "Erro ao Salvar",
        description: error.message || "Erro ao salvar configurações",
        variant: "destructive"
      })
    } finally {
      setIsSavingConfig(false)
    }
  }

  const apiStatus = stats.total > 0 ? (stats.successRate === '100' ? 'online' : 'warning') : 'unknown'

  // Carregar configurações na inicialização
  useEffect(() => {
    loadCurrentConfig()
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-foreground">Configurações</h2>
        <p className="text-muted-foreground">Gerencie suas preferências e configurações da conta</p>
      </div>

      <Tabs defaultValue="geral" className="w-full">
        <TabsList className={`grid w-full ${profile?.user_type === 'matriz' ? 'grid-cols-4' : 'grid-cols-1'}`}>
          <TabsTrigger value="geral" className="flex items-center gap-2">
            <SettingsIcon className="h-4 w-4" />
            Geral
          </TabsTrigger>
          {profile?.user_type === 'matriz' && (
            <>
              <TabsTrigger value="usuarios" className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Usuários
              </TabsTrigger>
              <TabsTrigger value="apis" className="flex items-center gap-2">
                <Code className="h-4 w-4" />
                APIs
              </TabsTrigger>
              <TabsTrigger value="webhooks" className="flex items-center gap-2">
                <Webhook className="h-4 w-4" />
                Webhooks
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="geral" className="space-y-6 mt-6">
          <div className="grid gap-6">
            {/* Account Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <SettingsIcon className="h-5 w-5" />
                  Conta
                </CardTitle>
                <CardDescription>
                  Configurações básicas da sua conta
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="account-email">Email da Conta</Label>
                    <Input 
                      id="account-email" 
                      type="email" 
                      value={user?.email || ""}
                      disabled
                    />
                    <p className="text-xs text-muted-foreground">
                      Entre em contato com o suporte para alterar o email
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="display-name">Nome de Exibição</Label>
                    <Input 
                      id="display-name" 
                      value={profile?.full_name || ""}
                      onChange={(e) => {
                        // TODO: Implement profile update
                        console.log('Display name change:', e.target.value)
                      }}
                    />
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Status da Conta</h4>
                    <p className="text-sm text-muted-foreground">Sua conta está ativa e verificada</p>
                  </div>
                  <Badge variant="secondary" className="bg-green-100 text-green-700">
                    Ativa
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Notifications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notificações
                </CardTitle>
                <CardDescription>
                  Configure como e quando você quer receber notificações
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Notificações por Email</p>
                        <p className="text-sm text-muted-foreground">Receba atualizações importantes por email</p>
                      </div>
                    </div>
                    <Switch 
                      checked={settings?.email_notifications ?? true}
                      onCheckedChange={(checked) => 
                        updateSettings({ email_notifications: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Smartphone className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Notificações Push</p>
                        <p className="text-sm text-muted-foreground">Receba notificações no navegador</p>
                      </div>
                    </div>
                    <Switch 
                      checked={settings?.push_notifications ?? false}
                      onCheckedChange={(checked) => 
                        updateSettings({ push_notifications: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Smartphone className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">SMS</p>
                        <p className="text-sm text-muted-foreground">Receba alertas críticos via SMS</p>
                      </div>
                    </div>
                    <Switch 
                      checked={settings?.sms_notifications ?? false}
                      onCheckedChange={(checked) => 
                        updateSettings({ sms_notifications: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Emails de Marketing</p>
                        <p className="text-sm text-muted-foreground">Receba novidades e promoções</p>
                      </div>
                    </div>
                    <Switch 
                      checked={settings?.marketing_emails ?? false}
                      onCheckedChange={(checked) => 
                        updateSettings({ marketing_emails: checked })
                      }
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Security */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Segurança
                </CardTitle>
                <CardDescription>
                  Configurações de segurança e privacidade
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Key className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Senha</p>
                        <p className="text-sm text-muted-foreground">Altere sua senha de acesso</p>
                      </div>
                    </div>
                    <Button 
                      size="sm"
                      onClick={() => setPasswordModalOpen(true)}
                    >
                      <Key className="h-4 w-4 mr-2" />
                      Alterar Senha
                    </Button>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Activity className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Sessões Ativas</p>
                        <p className="text-sm text-muted-foreground">Visualize suas sessões ativas</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      Ver Sessões Ativas
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Appearance & Preferences */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Aparência e Preferências
                </CardTitle>
                <CardDescription>
                  Personalize a interface e configurações regionais
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="theme">Tema</Label>
                    <Select 
                      value={settings?.theme ?? "system"}
                      onValueChange={(value) => 
                        updateSettings({ theme: value as "system" | "light" | "dark" })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="system">
                          <div className="flex items-center gap-2">
                            <Monitor className="h-4 w-4" />
                            Sistema
                          </div>
                        </SelectItem>
                        <SelectItem value="light">
                          <div className="flex items-center gap-2">
                            <Sun className="h-4 w-4" />
                            Claro
                          </div>
                        </SelectItem>
                        <SelectItem value="dark">
                          <div className="flex items-center gap-2">
                            <Moon className="h-4 w-4" />
                            Escuro
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="language">Idioma</Label>
                    <Select 
                      value={settings?.language ?? "pt-BR"}
                      onValueChange={(value) => 
                        updateSettings({ language: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                        <SelectItem value="en-US">English (US)</SelectItem>
                        <SelectItem value="es-ES">Español</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="timezone">Fuso Horário</Label>
                    <Select 
                      value={settings?.timezone ?? "America/Sao_Paulo"}
                      onValueChange={(value) => 
                        updateSettings({ timezone: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="America/Sao_Paulo">
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4" />
                            São Paulo (UTC-3)
                          </div>
                        </SelectItem>
                        <SelectItem value="America/New_York">Nova York (UTC-5)</SelectItem>
                        <SelectItem value="Europe/London">Londres (UTC+0)</SelectItem>
                        <SelectItem value="Asia/Tokyo">Tóquio (UTC+9)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {profile?.user_type === 'matriz' && (
          <>
            <TabsContent value="apis" className="space-y-6 mt-6">
          <div className="grid gap-6">
            {/* API Status Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Status das APIs
                </CardTitle>
                <CardDescription>
                  Visão geral do status de conectividade das integrações
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <Server className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">API Externa</span>
                    </div>
                    <Badge variant={apiStatus === 'online' ? 'default' : 'secondary'}>
                      {apiStatus === 'online' ? 'Online' : 'Desconhecido'}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Vindi</span>
                    </div>
                    <Badge variant="secondary">Configurar</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Mapbox</span>
                    </div>
                    <Badge variant="secondary">Configurar</Badge>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Resend</span>
                    </div>
                    <Badge variant="secondary">Configurar</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* External API Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  API Externa
                </CardTitle>
                <CardDescription>
                  Configure a integração com a API externa de beneficiários
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-4 p-4 border rounded-lg">
                    <h4 className="font-medium flex items-center gap-2">
                      <Key className="h-4 w-4" />
                      Credenciais e Endpoints
                    </h4>
                    
                    <div className="grid grid-cols-1 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="api-key">API Key</Label>
                        <Input 
                          id="api-key" 
                          type="password"
                          placeholder="xWui9nwbzV3hC4uCE3f7I3prnzNZRzan9U4sHq5h"
                          value={apiConfig.apiKey}
                          onChange={(e) => setApiConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                        />
                        <p className="text-xs text-muted-foreground">
                          Chave de API para autenticação nos endpoints externos
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="adesao-url">URL de Adesão</Label>
                        <Input 
                          id="adesao-url" 
                          type="url"
                          placeholder="https://api.example.com/adesao"
                          value={apiConfig.adesaoUrl}
                          onChange={(e) => setApiConfig(prev => ({ ...prev, adesaoUrl: e.target.value }))}
                        />
                        <p className="text-xs text-muted-foreground">
                          Endpoint para registrar novas adesões
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="cancelamento-url">URL de Cancelamento</Label>
                        <Input 
                          id="cancelamento-url" 
                          type="url"
                          placeholder="https://api.example.com/cancelamento"
                          value={apiConfig.cancelamentoUrl}
                          onChange={(e) => setApiConfig(prev => ({ ...prev, cancelamentoUrl: e.target.value }))}
                        />
                        <p className="text-xs text-muted-foreground">
                          Endpoint para processar cancelamentos
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={handleSaveConfig}
                        disabled={isSavingConfig}
                      >
                        {isSavingConfig ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Salvando...
                          </>
                        ) : (
                          "Salvar Configurações"
                        )}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={loadCurrentConfig}
                        disabled={isLoadingConfig || isSavingConfig}
                      >
                        {isLoadingConfig ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Carregando...
                          </>
                        ) : (
                          "Carregar Configurações Atuais"
                        )}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => testApiConnection.mutate()}
                        disabled={isTestingConnection}
                      >
                        {isTestingConnection ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Testando...
                          </>
                        ) : (
                          <>
                            <Activity className="h-4 w-4 mr-2" />
                            Testar Conexão
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* API Statistics */}
                  <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                    <h4 className="font-medium flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Estatísticas da API
                    </h4>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">{stats.total}</div>
                        <div className="text-xs text-muted-foreground">Total de Chamadas</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">{stats.success}</div>
                        <div className="text-xs text-muted-foreground">Sucessos</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">{stats.error}</div>
                        <div className="text-xs text-muted-foreground">Erros</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">{stats.successRate}%</div>
                        <div className="text-xs text-muted-foreground">Taxa de Sucesso</div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigate('/api-logs')}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Ver Logs Detalhados
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Vindi API Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Vindi API
                </CardTitle>
                <CardDescription>
                  Configure a integração com a API da Vindi para pagamentos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    A chave da API Vindi está configurada nas variáveis de ambiente do Supabase. 
                    Para alterá-la, acesse as configurações de secrets do projeto.
                  </AlertDescription>
                </Alert>
                
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.open('https://supabase.com/dashboard/project/yhxoihyjtcgulnfipqej/settings/functions', '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Gerenciar Secrets no Supabase
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => navigate('/api-logs')}
                  >
                    <Activity className="h-4 w-4 mr-2" />
                    Ver Logs da Vindi
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Mapbox API Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Mapbox API
                </CardTitle>
                <CardDescription>
                  Configure o token público do Mapbox para funcionalidades de mapas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    O token público do Mapbox está configurado nas variáveis de ambiente do Supabase. 
                    Este token é usado para renderizar mapas no sistema.
                  </AlertDescription>
                </Alert>
                
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.open('https://supabase.com/dashboard/project/yhxoihyjtcgulnfipqej/settings/functions', '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Gerenciar Secrets no Supabase
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.open('https://mapbox.com/account/access-tokens', '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Tokens do Mapbox
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Resend API Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Resend API
                </CardTitle>
                <CardDescription>
                  Configure a API do Resend para envio de emails transacionais
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    A chave da API Resend está configurada nas variáveis de ambiente do Supabase. 
                    Esta API é usada para envio de emails de convites, recuperação de senha e notificações.
                  </AlertDescription>
                </Alert>
                
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.open('https://supabase.com/dashboard/project/yhxoihyjtcgulnfipqej/settings/functions', '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Gerenciar Secrets no Supabase
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => window.open('https://resend.com/api-keys', '_blank')}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    API Keys do Resend
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="webhooks" className="space-y-6 mt-6">
          <div className="grid gap-6">
            {/* Webhook URL */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Webhook className="h-5 w-5" />
                  URL do Webhook
                </CardTitle>
                <CardDescription>
                  Configure esta URL no painel da Vindi para receber eventos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>URL do Webhook</Label>
                  <div className="flex gap-2">
                    <Input 
                      value="https://yhxoihyjtcgulnfipqej.supabase.co/functions/v1/vindi-webhook"
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => {
                        navigator.clipboard.writeText("https://yhxoihyjtcgulnfipqej.supabase.co/functions/v1/vindi-webhook")
                        toast({
                          title: "URL copiada",
                          description: "A URL do webhook foi copiada para a área de transferência",
                        })
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Esta URL deve ser configurada no painel da Vindi em "Webhooks" para receber eventos automaticamente
                  </p>
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Como configurar:</strong> Acesse o painel da Vindi → Configurações → Webhooks → 
                    Adicionar nova URL → Cole a URL acima e selecione os eventos que deseja receber.
                  </AlertDescription>
                </Alert>

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={testWebhook}
                  >
                    <Activity className="h-4 w-4 mr-2" />
                    Enviar Evento de Teste
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      // ✅ SANDBOX SUPPORT: Dynamic URL based on environment
                      const environment = import.meta.env.VITE_VINDI_ENVIRONMENT || 'production';
                      const vindiUrl = environment === 'sandbox' 
                        ? 'https://sandbox-app.vindi.com.br/configuracoes/webhooks'
                        : 'https://app.vindi.com.br/configuracoes/webhooks';
                      console.log(`🔗 Opening Vindi ${environment} dashboard:`, vindiUrl);
                      window.open(vindiUrl, '_blank');
                    }}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Configurar na Vindi
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Webhook Statistics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Estatísticas dos Webhooks
                </CardTitle>
                <CardDescription>
                  Visão geral dos eventos recebidos da Vindi
                </CardDescription>
              </CardHeader>
              <CardContent>
                {webhookLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    <span>Carregando estatísticas...</span>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-4 border rounded-lg">
                        <div className="text-2xl font-bold text-foreground">{webhookStats.total}</div>
                        <div className="text-xs text-muted-foreground">Total de Eventos</div>
                      </div>
                      <div className="text-center p-4 border rounded-lg">
                        <div className="text-2xl font-bold text-green-600">{webhookStats.processed}</div>
                        <div className="text-xs text-muted-foreground">Processados</div>
                      </div>
                      <div className="text-center p-4 border rounded-lg">
                        <div className="text-2xl font-bold text-red-600">{webhookStats.failed}</div>
                        <div className="text-xs text-muted-foreground">Com Erro</div>
                      </div>
                      <div className="text-center p-4 border rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{webhookStats.successRate}%</div>
                        <div className="text-xs text-muted-foreground">Taxa de Sucesso</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">Últimas 24h</span>
                        </div>
                        <Badge variant="secondary">{webhookStats.last24h}</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">Últimos 7 dias</span>
                        </div>
                        <Badge variant="secondary">{webhookStats.last7days}</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">Últimos 30 dias</span>
                        </div>
                        <Badge variant="secondary">{webhookStats.last30days}</Badge>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={fetchWebhookStats}
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Atualizar Estatísticas
                      </Button>
                      {webhookStats.failed > 0 && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={reprocessFailedEvents}
                          disabled={isReprocessing}
                        >
                          {isReprocessing ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Reprocessando...
                            </>
                          ) : (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Reprocessar Erros
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Events */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Eventos Recentes
                </CardTitle>
                <CardDescription>
                  Últimos eventos de webhook recebidos da Vindi
                </CardDescription>
              </CardHeader>
              <CardContent>
                {webhookLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    <span>Carregando eventos...</span>
                  </div>
                ) : recentEvents.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Nenhum evento de webhook recebido ainda</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                     {recentEvents.slice(0, 10).map((event) => (
                       <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg">
                         <div className="flex items-center gap-3">
                           <div className={`w-2 h-2 rounded-full ${
                             event.processed 
                               ? (event.error_message ? 'bg-red-500' : 'bg-green-500')
                               : 'bg-yellow-500'
                           }`} />
                            <div>
                              <p className="font-medium text-sm">{formatWebhookEventName(event.event_type)}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(event.created_at).toLocaleString('pt-BR')}
                              </p>
                            </div>
                         </div>
                         <div className="flex items-center gap-2">
                           <Button
                             variant="ghost"
                             size="sm"
                             onClick={() => {
                               setSelectedEvent(event)
                               setEventModalOpen(true)
                             }}
                           >
                             <Eye className="h-4 w-4" />
                           </Button>
                           <Badge variant={
                             event.processed 
                               ? (event.error_message ? 'destructive' : 'default')
                               : 'secondary'
                           }>
                             {event.processed 
                               ? (event.error_message ? 'Erro' : 'Processado')
                               : 'Pendente'
                             }
                           </Badge>
                           <code className="text-xs bg-muted px-2 py-1 rounded">
                             {event.event_id}
                           </code>
                         </div>
                       </div>
                     ))}
                    
                    {recentEvents.length > 10 && (
                      <div className="text-center pt-4">
                        <p className="text-sm text-muted-foreground">
                          Mostrando 10 de {recentEvents.length} eventos
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        {profile?.user_type === 'matriz' && (
          <TabsContent value="usuarios" className="space-y-6 mt-6">
            <AdminUsersTab />
          </TabsContent>
        )}
        
          </>
        )}
      </Tabs>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-6 border-t">
        <Button variant="outline" onClick={() => navigate('/dashboard')}>
          Voltar ao Dashboard
        </Button>
        
        <Button
          disabled={settingsLoading}
          onClick={() => {
            toast({
              title: "Configurações",
              description: settingsLoading ? "Carregando configurações..." : "Configurações salvas automaticamente",
            })
          }}
        >
          {settingsLoading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Carregando...
            </>
          ) : (
            "Configurações Salvas"
          )}
        </Button>
      </div>

      {/* Event Details Modal */}
      <Dialog open={eventModalOpen} onOpenChange={setEventModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Evento</DialogTitle>
            <DialogDescription>
              {selectedEvent && `${selectedEvent.event_type} - ${selectedEvent.event_id}`}
            </DialogDescription>
          </DialogHeader>
          {selectedEvent && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Status</Label>
                  <Badge variant={
                    selectedEvent.processed 
                      ? (selectedEvent.error_message ? 'destructive' : 'default')
                      : 'secondary'
                  }>
                    {selectedEvent.processed 
                      ? (selectedEvent.error_message ? 'Erro' : 'Processado')
                      : 'Pendente'
                    }
                  </Badge>
                </div>
                <div>
                  <Label>Data</Label>
                  <p className="text-sm">{new Date(selectedEvent.created_at).toLocaleString('pt-BR')}</p>
                </div>
              </div>
              
              {selectedEvent.error_message && (
                <div>
                  <Label>Erro</Label>
                  <Alert className="mt-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{selectedEvent.error_message}</AlertDescription>
                  </Alert>
                </div>
              )}
              
              <div>
                <Label>Dados do Evento</Label>
                <pre className="mt-2 p-4 bg-muted rounded-lg text-xs overflow-x-auto">
                  {JSON.stringify(selectedEvent.event_data, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      <ChangePasswordModal 
        open={passwordModalOpen}
        onOpenChange={setPasswordModalOpen}
      />
    </div>
  )
}