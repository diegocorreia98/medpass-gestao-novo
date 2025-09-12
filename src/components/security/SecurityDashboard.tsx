// Comprehensive security dashboard for monitoring data protection status
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Shield, 
  ShieldCheck, 
  Database, 
  Eye, 
  Lock, 
  AlertTriangle,
  CheckCircle,
  Activity,
  Users,
  FileText
} from "lucide-react";
import { SecurityMigrationGuide } from "./SecurityMigrationGuide";
import { DataSecurityAlert } from "./DataSecurityAlert";
import { useBeneficiariosSecure } from "@/hooks/useBeneficiarios";

export function SecurityDashboard() {
  const { 
    beneficiarios = [], 
    auditLogs = [],
    hasMaskedData,
    isMatriz,
    totalAuditLogs 
  } = useBeneficiariosSecure();

  // Calculate security metrics
  const totalBeneficiarios = beneficiarios.length;
  const encryptedRecords = beneficiarios.filter(b => !b.is_sensitive_data_masked || isMatriz).length;
  const securityScore = totalBeneficiarios > 0 ? Math.round((encryptedRecords / totalBeneficiarios) * 100) : 100;
  
  const recentAuditLogs = auditLogs.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Security Status Alert */}
      <DataSecurityAlert 
        hasSecureData={totalBeneficiarios > 0}
        hasMaskedData={hasMaskedData}
        isMatrizUser={isMatriz}
        totalAuditLogs={totalAuditLogs}
      />

      {/* Security Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Score</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{securityScore}%</div>
            <Progress value={securityScore} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              Data protection active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Protected Records</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBeneficiarios}</div>
            <p className="text-xs text-muted-foreground">
              Beneficiários com dados criptografados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Audit Events</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAuditLogs}</div>
            <p className="text-xs text-muted-foreground">
              Eventos de segurança registrados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Access Level</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              {isMatriz ? (
                <Badge variant="default">
                  <ShieldCheck className="h-3 w-3 mr-1" />
                  Matriz
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <Eye className="h-3 w-3 mr-1" />
                  Unidade
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {isMatriz ? "Acesso total autorizado" : "Dados próprios visíveis"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Security Information */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="audit">Logs de Auditoria</TabsTrigger>
          <TabsTrigger value="migration">Status da Migração</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Recursos de Segurança Ativos
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Criptografia AES para dados sensíveis</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Mascaramento automático de dados</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Políticas RLS aprimoradas</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Log de auditoria completo</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Controle de acesso baseado em função</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  Ações Recomendadas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Habilitar Proteção contra Senhas Vazadas</p>
                    <p className="text-xs text-muted-foreground">
                      Configure no painel do Supabase Authentication
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Migrar Componentes Legados</p>
                    <p className="text-xs text-muted-foreground">
                      Atualizar páginas que ainda usam acesso direto
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Implementar Monitoramento</p>
                    <p className="text-xs text-muted-foreground">
                      Configurar alertas de segurança automáticos
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          {isMatriz ? (
            <Card>
              <CardHeader>
                <CardTitle>Eventos de Auditoria Recentes</CardTitle>
                <CardDescription>
                  Últimas {recentAuditLogs.length} atividades de segurança
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {recentAuditLogs.length > 0 ? (
                    recentAuditLogs.map((log: any, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <p className="text-sm font-medium">{log.action}</p>
                          <p className="text-xs text-muted-foreground">
                            {log.table_name} - {new Date(log.created_at).toLocaleString()}
                          </p>
                        </div>
                        <Badge variant="outline">
                          {log.sensitive_fields?.length || 0} campos
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-4">
                      Nenhum evento de auditoria registrado ainda
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Logs de Auditoria</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Lock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Acesso aos logs de auditoria restrito a usuários Matriz
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="migration" className="space-y-4">
          <SecurityMigrationGuide />
        </TabsContent>
      </Tabs>
    </div>
  );
}