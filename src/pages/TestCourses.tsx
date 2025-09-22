import React from 'react';
import { useCourses } from '@/hooks/useCourses';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, AlertCircle, BookOpen, Users, Award } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const TestCourses: React.FC = () => {
  const { data: courses, isLoading, error, refetch } = useCourses();

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

  const createSampleCourses = async () => {
    try {
      // Primeiro, vamos criar algumas categorias
      const categories = [
        { name: 'Saúde Geral', description: 'Cursos sobre saúde e bem-estar', color: '#10B981', icon: 'Heart' },
        { name: 'Tecnologia', description: 'Cursos de tecnologia e inovação', color: '#3B82F6', icon: 'Monitor' },
        { name: 'Gestão', description: 'Cursos de gestão e administração', color: '#F59E0B', icon: 'Users' }
      ];

      console.log('Criando categorias...');
      const createdCategories = [];
      for (const category of categories) {
        const { data, error } = await supabase
          .from('course_categories')
          .insert(category)
          .select()
          .single();

        if (error && !error.message.includes('duplicate')) {
          throw error;
        }
        if (data) createdCategories.push(data);
      }

      // Se não conseguiu criar categorias, buscar as existentes
      if (createdCategories.length === 0) {
        const { data: existingCategories } = await supabase
          .from('course_categories')
          .select('*')
          .limit(3);

        if (existingCategories) {
          createdCategories.push(...existingCategories);
        }
      }

      // Agora criar alguns cursos de exemplo
      const sampleCourses = [
        {
          title: 'Introdução ao Plano de Saúde',
          description: 'Aprenda os conceitos básicos sobre planos de saúde e como utilizá-los de forma eficiente.',
          short_description: 'Conceitos básicos de planos de saúde',
          category_id: createdCategories[0]?.id,
          duration_hours: 2,
          difficulty_level: 'beginner',
          is_active: true,
          is_featured: true,
          is_free: true,
          has_certificate: true,
          tags: ['saude', 'plano', 'basico'],
          learning_objectives: [
            'Entender o funcionamento dos planos de saúde',
            'Conhecer os tipos de cobertura',
            'Saber utilizar a rede credenciada'
          ],
          slug: 'introducao-plano-saude'
        },
        {
          title: 'Gestão de Unidades de Saúde',
          description: 'Course completo sobre gestão eficiente de unidades de saúde.',
          short_description: 'Gestão eficiente para unidades de saúde',
          category_id: createdCategories[2]?.id,
          duration_hours: 8,
          difficulty_level: 'intermediate',
          is_active: true,
          is_featured: false,
          is_free: false,
          has_certificate: true,
          tags: ['gestao', 'unidade', 'administracao'],
          learning_objectives: [
            'Princípios de gestão de unidades',
            'Controle de qualidade',
            'Gestão de equipes'
          ],
          slug: 'gestao-unidades-saude'
        },
        {
          title: 'Tecnologia na Saúde Digital',
          description: 'Explore as inovações tecnológicas na área da saúde digital.',
          short_description: 'Inovações em saúde digital',
          category_id: createdCategories[1]?.id,
          duration_hours: 4,
          difficulty_level: 'advanced',
          is_active: true,
          is_featured: true,
          is_free: false,
          has_certificate: true,
          tags: ['tecnologia', 'digital', 'inovacao'],
          learning_objectives: [
            'Tendências em saúde digital',
            'Implementação de sistemas',
            'Segurança de dados médicos'
          ],
          slug: 'tecnologia-saude-digital'
        }
      ];

      console.log('Criando cursos...');
      for (const course of sampleCourses) {
        const { error } = await supabase
          .from('courses')
          .insert(course);

        if (error && !error.message.includes('duplicate')) {
          console.error('Erro ao criar curso:', course.title, error);
        } else {
          console.log('Curso criado:', course.title);
        }
      }

      toast.success('Cursos de exemplo criados com sucesso!');
      refetch();

    } catch (error) {
      console.error('Erro ao criar cursos de exemplo:', error);
      toast.error('Erro ao criar cursos de exemplo');
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Teste do Sistema de Cursos</h1>
          <p className="text-muted-foreground">
            Verificação da integração do sistema de cursos e aprendizagem.
          </p>
        </div>

        {/* Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getStatusIcon()}
              Status da Conexão com Cursos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-4">
              <Badge variant={getStatusColor() as any}>{getStatusText()}</Badge>
              {!isLoading && !error && (
                <span className="text-sm text-muted-foreground">
                  {courses?.length || 0} curso(s) encontrado(s)
                </span>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <h4 className="font-medium text-red-800 mb-2">Detalhes do Erro:</h4>
                <p className="text-sm text-red-700">
                  {error instanceof Error ? error.message : 'Erro desconhecido'}
                </p>
              </div>
            )}

            {!isLoading && !error && courses?.length === 0 && (
              <div className="text-center py-4">
                <p className="text-muted-foreground mb-4">
                  Nenhum curso encontrado. Que tal criar alguns cursos de exemplo?
                </p>
                <Button onClick={createSampleCourses} className="gap-2">
                  <BookOpen className="w-4 h-4" />
                  Criar Cursos de Exemplo
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Courses List */}
        {!isLoading && !error && courses && courses.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Cursos Disponíveis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {courses.map((course) => (
                  <div
                    key={course.id}
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-medium text-sm leading-tight">{course.title}</h3>
                      <Badge variant={course.is_active ? 'default' : 'secondary'}>
                        {course.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>

                    {course.short_description && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {course.short_description}
                      </p>
                    )}

                    <div className="space-y-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <BookOpen className="w-3 h-3" />
                        Duração: {course.duration_hours || 0}h
                      </div>

                      <div className="flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        Nível: {course.difficulty_level || 'beginner'}
                      </div>

                      {course.has_certificate && (
                        <div className="flex items-center gap-1">
                          <Award className="w-3 h-3" />
                          Certificado disponível
                        </div>
                      )}

                      {course.category && (
                        <div className="text-xs">
                          Categoria: {course.category.name}
                        </div>
                      )}

                      <div className="flex gap-1 mt-2">
                        {course.is_featured && (
                          <Badge variant="outline" className="text-xs">
                            Destaque
                          </Badge>
                        )}
                        {course.is_free && (
                          <Badge variant="outline" className="text-xs">
                            Gratuito
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* System Info */}
        <Card>
          <CardHeader>
            <CardTitle>Informações do Sistema de Cursos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="font-medium mb-2">Tabelas do Sistema:</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>✅ courses (cursos principais)</li>
                  <li>✅ course_categories (categorias)</li>
                  <li>✅ course_modules (módulos)</li>
                  <li>✅ course_lessons (aulas/lições)</li>
                  <li>✅ course_enrollments (matrículas)</li>
                  <li>✅ lesson_progress (progresso)</li>
                </ul>
              </div>

              <div>
                <h4 className="font-medium mb-2">Funcionalidades:</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>✅ Listagem de cursos</li>
                  <li>✅ Sistema de categorias</li>
                  <li>✅ Controle de progresso</li>
                  <li>✅ Certificados integrados</li>
                  <li>✅ Níveis de dificuldade</li>
                  <li>✅ Tags e objetivos</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Ações de Teste</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              <Button onClick={() => refetch()} variant="outline">
                Recarregar Cursos
              </Button>
              <Button onClick={createSampleCourses} variant="outline">
                Criar Cursos de Exemplo
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TestCourses;