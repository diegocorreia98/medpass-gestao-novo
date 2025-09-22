import React from 'react';
import { useCertificateTemplates } from '@/hooks/useCertificateTemplates';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

const TestCertificates: React.FC = () => {
  const { data: templates, isLoading, error } = useCertificateTemplates();

  const getStatusIcon = () => {
    if (isLoading) return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    if (error) return <XCircle className="w-5 h-5 text-red-500" />;
    return <CheckCircle className="w-5 h-5 text-green-500" />;
  };

  const getStatusText = () => {
    if (isLoading) return 'Carregando...';
    if (error) return 'Erro na conexão';
    return 'Sistema funcionando';
  };

  const getStatusColor = () => {
    if (isLoading) return 'yellow';
    if (error) return 'red';
    return 'green';
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Teste do Sistema de Certificados</h1>
          <p className="text-muted-foreground">
            Verificação da integração entre frontend e backend após aplicação das migrações.
          </p>
        </div>

        {/* Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon()}
              Status da Conexão com o Banco
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-4">
              <Badge variant={getStatusColor() as any}>{getStatusText()}</Badge>
              {!isLoading && !error && (
                <span className="text-sm text-muted-foreground">
                  {templates?.length || 0} template(s) encontrado(s)
                </span>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-medium text-red-800 mb-2">Detalhes do Erro:</h4>
                <p className="text-sm text-red-700">
                  {error instanceof Error ? error.message : 'Erro desconhecido'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Templates List */}
        {!isLoading && !error && (
          <Card>
            <CardHeader>
              <CardTitle>Templates Disponíveis</CardTitle>
            </CardHeader>
            <CardContent>
              {templates && templates.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-medium">{template.name}</h3>
                        <Badge variant={template.is_active ? 'default' : 'secondary'}>
                          {template.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>

                      {template.description && (
                        <p className="text-sm text-muted-foreground mb-3">
                          {template.description}
                        </p>
                      )}

                      <div className="space-y-1 text-xs text-muted-foreground">
                        <div>Categoria: {template.category}</div>
                        <div>Dimensões: {template.image_width}x{template.image_height}px</div>
                        <div>Campos: {(template as any).field_count || 0}</div>
                        {template.is_default && (
                          <Badge variant="outline" className="text-xs">
                            Template Padrão
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">
                    Nenhum template encontrado. O sistema está funcionando, mas ainda não há templates criados.
                  </p>
                  <Badge variant="outline">Sistema pronto para uso</Badge>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* System Info */}
        <Card>
          <CardHeader>
            <CardTitle>Informações do Sistema</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="font-medium mb-2">Tabelas Criadas:</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>✅ certificate_templates</li>
                  <li>✅ template_fields</li>
                  <li>✅ certificate_generations</li>
                  <li>✅ courses (atualizada)</li>
                  <li>✅ course_categories</li>
                  <li>✅ course_modules</li>
                  <li>✅ course_lessons</li>
                  <li>✅ course_enrollments</li>
                  <li>✅ lesson_progress</li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium mb-2">Storage Buckets:</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>✅ certificate-templates (público)</li>
                  <li>✅ generated-certificates (privado)</li>
                </ul>

                <h4 className="font-medium mb-2 mt-4">Funcionalidades:</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>✅ Upload de templates</li>
                  <li>✅ Editor drag & drop</li>
                  <li>✅ Geração de certificados</li>
                  <li>✅ Sistema de cursos integrado</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Next Steps */}
        <Card>
          <CardHeader>
            <CardTitle>Próximos Passos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <p>🎯 <strong>Sistema pronto para uso!</strong> Você pode agora:</p>
              <ul className="space-y-1 ml-4">
                <li>• Acessar <code>/admin/certificate-templates</code> para criar templates</li>
                <li>• Upload de imagens .jpg como templates de fundo</li>
                <li>• Configurar campos dinâmicos com posicionamento drag & drop</li>
                <li>• Gerar certificados individuais ou em lote</li>
                <li>• Integrar com o sistema de cursos</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TestCertificates;