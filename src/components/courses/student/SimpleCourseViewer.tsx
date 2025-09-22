import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen, Play, ChevronRight, ChevronLeft, CheckCircle, Download, FileText, File, Video, Star, StarIcon, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useCourse } from "@/hooks/useCourses";
import { useCourseModules } from "@/hooks/useCourseModules";
import { useCourseLessons, useWatchLesson } from "@/hooks/useCourseLessons";
import { extractVimeoId } from "@/hooks/useCourseLessons";
import { toast } from "sonner";

export function SimpleCourseViewer() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [currentLessonId, setCurrentLessonId] = useState<string | null>(null);
  const [allLessons, setAllLessons] = useState<any[]>([]);
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const [rating, setRating] = useState<number>(0);
  const [isRatingOpen, setIsRatingOpen] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());

  const { data: course, isLoading: courseLoading } = useCourse(courseId || "");
  const { data: modules, isLoading: modulesLoading } = useCourseModules(courseId || "");
  const watchLesson = useWatchLesson();

  // Carregar aulas concluídas do localStorage
  useEffect(() => {
    if (courseId) {
      const storageKey = `completed-lessons-${courseId}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        try {
          const completedIds = JSON.parse(saved);
          setCompletedLessons(new Set(completedIds));
        } catch (error) {
          console.error("Erro ao carregar progresso salvo:", error);
        }
      }
    }
  }, [courseId]);

  // Expandir todos os módulos por padrão quando carregarem
  useEffect(() => {
    if (modules && modules.length > 0) {
      const allModuleIds = modules.map((module: any) => module.id);
      setExpandedModules(new Set(allModuleIds));
    }
  }, [modules]);

  // Flatmap todas as lições de todos os módulos
  useEffect(() => {
    if (modules) {
      const lessons: any[] = [];
      modules.forEach((module: any) => {
        if (module.lessons) {
          module.lessons.forEach((lesson: any) => {
            lessons.push({
              ...lesson,
              moduleTitle: module.title,
              moduleId: module.id
            });
          });
        }
      });

      // Ordenar por módulo e depois por order_index
      lessons.sort((a, b) => {
        const moduleComparison = a.moduleId.localeCompare(b.moduleId);
        if (moduleComparison !== 0) return moduleComparison;
        return (a.order_index || 0) - (b.order_index || 0);
      });

      setAllLessons(lessons);

      // Selecionar primeira lição se não há nenhuma selecionada
      if (lessons.length > 0 && !currentLessonId) {
        setCurrentLessonId(lessons[0].id);
      }
    }
  }, [modules, currentLessonId]);

  const currentLesson = allLessons.find(lesson => lesson.id === currentLessonId);
  const currentLessonIndex = allLessons.findIndex(lesson => lesson.id === currentLessonId);
  const hasNextLesson = currentLessonIndex < allLessons.length - 1;
  const hasPrevLesson = currentLessonIndex > 0;

  const goToNextLesson = () => {
    if (hasNextLesson) {
      setCurrentLessonId(allLessons[currentLessonIndex + 1].id);
    }
  };

  const goToPrevLesson = () => {
    if (hasPrevLesson) {
      setCurrentLessonId(allLessons[currentLessonIndex - 1].id);
    }
  };

  const handleCompleteLesson = async () => {
    if (!currentLessonId || !currentLesson) {
      toast.error("Nenhuma aula selecionada");
      return;
    }

    try {
      console.log("Marcando aula como concluída:", {
        lessonId: currentLessonId,
        lessonTitle: currentLesson.title
      });

      // Atualizar estado local e localStorage
      const newCompletedLessons = new Set([...completedLessons, currentLessonId]);
      setCompletedLessons(newCompletedLessons);

      // Salvar no localStorage
      if (courseId) {
        const storageKey = `completed-lessons-${courseId}`;
        localStorage.setItem(storageKey, JSON.stringify([...newCompletedLessons]));
      }

      toast.success("Aula marcada como concluída!");

      // Tentar salvar no banco (pode falhar se tabela não existir)
      try {
        await watchLesson.mutateAsync({
          lessonId: currentLessonId,
          completed: true,
          timeWatched: currentLesson.duration_minutes || 0
        });
        console.log("Progresso salvo no banco com sucesso");
      } catch (dbError) {
        console.warn("Erro ao salvar no banco (tabela pode não existir):", dbError);
        // Não mostra erro para usuário pois funciona localmente
      }

      // Avançar automaticamente para próxima aula
      if (hasNextLesson) {
        setTimeout(() => {
          goToNextLesson();
        }, 1000);
      }
    } catch (error: any) {
      console.error("Erro ao completar aula:", error);
      toast.error("Erro inesperado ao marcar aula como concluída");
    }
  };

  const handleRateLesson = async (selectedRating: number) => {
    if (!currentLessonId) return;

    setRating(selectedRating);
    setIsRatingOpen(false);

    // Aqui você pode adicionar lógica para salvar a avaliação no banco
    toast.success(`Aula avaliada com ${selectedRating} estrela${selectedRating > 1 ? 's' : ''}!`);

    console.log("Avaliação da aula:", {
      lessonId: currentLessonId,
      rating: selectedRating
    });
  };

  const toggleModule = (moduleId: string) => {
    setExpandedModules(prev => {
      const newSet = new Set(prev);
      if (newSet.has(moduleId)) {
        newSet.delete(moduleId);
      } else {
        newSet.add(moduleId);
      }
      return newSet;
    });
  };

  const getVimeoEmbedUrl = (lesson: any) => {
    if (lesson?.content_type === 'video' && lesson?.content_url) {
      const vimeoId = extractVimeoId(lesson.content_url);
      if (vimeoId) {
        return `https://player.vimeo.com/video/${vimeoId}?autoplay=1&title=0&byline=0&portrait=0`;
      }
    }
    return null;
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes > 0 ? `${remainingMinutes}min` : ''}`;
  };

  const getLevelLabel = (level: string) => {
    switch (level) {
      case "beginner": return "Iniciante";
      case "intermediate": return "Intermediário";
      case "advanced": return "Avançado";
      default: return level;
    }
  };

  if (courseLoading || modulesLoading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-8"></div>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="max-w-7xl mx-auto text-center py-12">
        <h2 className="text-2xl font-bold text-foreground mb-4">Curso não encontrado</h2>
        <Button onClick={() => navigate("/learn")}>Voltar para Biblioteca</Button>
      </div>
    );
  }

  const progressPercentage = allLessons.length > 0 ? Math.round(completedLessons.size / allLessons.length * 100) : 0;

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/learn")}>
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{course.title}</h1>
            <p className="text-muted-foreground">
              {currentLesson ? `${currentLesson.moduleTitle} - ${currentLesson.title}` : 'Selecione uma aula'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Badge variant="outline">{getLevelLabel(course.level)}</Badge>
          <div className="text-sm text-muted-foreground">
            {completedLessons.size} de {allLessons.length} aulas concluídas
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm mb-2">
          <span>Progresso do curso ({completedLessons.size}/{allLessons.length} aulas)</span>
          <span>{progressPercentage}%</span>
        </div>
        <Progress value={progressPercentage} className="h-2" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Video Player */}
        <div className="lg:col-span-2 space-y-4">
          {currentLesson ? (
            <>
              {/* Video */}
              {currentLesson.content_type === 'video' && currentLesson.content_url && (
                <Card>
                  <CardContent className="p-0">
                    <div className="aspect-video bg-black rounded-lg overflow-hidden">
                      {getVimeoEmbedUrl(currentLesson) ? (
                        <iframe
                          src={getVimeoEmbedUrl(currentLesson)}
                          className="w-full h-full"
                          frameBorder="0"
                          allow="autoplay; fullscreen; picture-in-picture"
                          allowFullScreen
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white">
                          <div className="text-center">
                            <Play className="w-16 h-16 mx-auto mb-4 opacity-50" />
                            <p>Vídeo não disponível</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Text Content */}
              {currentLesson.content_type === 'text' && currentLesson.content_html && (
                <Card>
                  <CardContent className="p-6">
                    <div className="prose max-w-none">
                      <div dangerouslySetInnerHTML={{ __html: currentLesson.content_html }} />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Navigation and Actions - Below video */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={goToPrevLesson}
                    disabled={!hasPrevLesson}
                    className="flex items-center gap-2"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    Anterior
                  </Button>

                  <Button
                    onClick={goToNextLesson}
                    disabled={!hasNextLesson}
                    className="flex items-center gap-2"
                  >
                    Próxima
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  {/* Rating Button */}
                  <Button
                    variant="outline"
                    onClick={() => setIsRatingOpen(!isRatingOpen)}
                    className="flex items-center gap-2"
                  >
                    <Star className="w-4 h-4" />
                    Avaliar
                  </Button>

                  {/* Complete Lesson Button */}
                  <Button
                    onClick={handleCompleteLesson}
                    disabled={!currentLessonId || completedLessons.has(currentLessonId || '') || watchLesson.isPending}
                    className="flex items-center gap-2"
                    variant={completedLessons.has(currentLessonId || '') ? "secondary" : "default"}
                  >
                    <CheckCircle className="w-4 h-4" />
                    {completedLessons.has(currentLessonId || '') ? 'Concluída' : 'Marcar como Concluída'}
                  </Button>
                </div>
              </div>

              {/* Rating Stars */}
              {isRatingOpen && (
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <h3 className="text-sm font-medium mb-3">Como você avalia esta aula?</h3>
                      <div className="flex items-center justify-center gap-1 mb-3">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => handleRateLesson(star)}
                            className={`p-1 transition-colors ${
                              star <= rating ? 'text-yellow-500' : 'text-gray-300 hover:text-yellow-400'
                            }`}
                          >
                            <Star className="w-6 h-6 fill-current" />
                          </button>
                        ))}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsRatingOpen(false)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Lesson Info */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{currentLesson.title}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {currentLesson.moduleTitle} • {formatDuration(currentLesson.duration_minutes || 0)}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {currentLesson.content_type === 'video' ? 'Vídeo' :
                       currentLesson.content_type === 'text' ? 'Texto' :
                       currentLesson.content_type}
                    </Badge>
                  </div>
                </CardHeader>
                {currentLesson.description && (
                  <CardContent>
                    <p className="text-muted-foreground">{currentLesson.description}</p>
                  </CardContent>
                )}
              </Card>

              {/* Course Info */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Sobre o Curso</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-3 text-sm">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {course.instructor_name && (
                      <div>
                        <span className="font-medium">Instrutor:</span>
                        <p className="text-muted-foreground">{course.instructor_name}</p>
                      </div>
                    )}

                    <div>
                      <span className="font-medium">Duração:</span>
                      <p className="text-muted-foreground">{course.duration_hours}h</p>
                    </div>

                    <div>
                      <span className="font-medium">Total de aulas:</span>
                      <p className="text-muted-foreground">{allLessons.length}</p>
                    </div>
                  </div>

                  {course.description && (
                    <div>
                      <span className="font-medium">Descrição:</span>
                      <p className="text-muted-foreground">{course.description}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Lesson Materials */}
              {currentLesson && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Download className="w-4 h-4" />
                      Materiais da Aula
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      {/* Placeholder para materiais - aqui virão os materiais reais da aula */}
                      <div className="text-sm text-muted-foreground mb-3">
                        Materiais relacionados a esta aula:
                      </div>

                      {/* Exemplo de materiais (substituir por dados reais) */}
                      <div className="space-y-2">
                        <Button
                          variant="outline"
                          className="w-full justify-start h-auto p-3"
                          disabled
                        >
                          <FileText className="w-4 h-4 mr-3 text-blue-600" />
                          <div className="text-left">
                            <div className="font-medium text-sm">Slides da Aula</div>
                            <div className="text-xs text-muted-foreground">PDF • Em breve</div>
                          </div>
                        </Button>

                        <Button
                          variant="outline"
                          className="w-full justify-start h-auto p-3"
                          disabled
                        >
                          <File className="w-4 h-4 mr-3 text-green-600" />
                          <div className="text-left">
                            <div className="font-medium text-sm">Material Complementar</div>
                            <div className="text-xs text-muted-foreground">DOCX • Em breve</div>
                          </div>
                        </Button>

                        <Button
                          variant="outline"
                          className="w-full justify-start h-auto p-3"
                          disabled
                        >
                          <Video className="w-4 h-4 mr-3 text-purple-600" />
                          <div className="text-left">
                            <div className="font-medium text-sm">Exercícios Práticos</div>
                            <div className="text-xs text-muted-foreground">ZIP • Em breve</div>
                          </div>
                        </Button>

                        <div className="text-xs text-muted-foreground text-center mt-3 p-2 bg-muted/50 rounded">
                          Os materiais de download estarão disponíveis em breve
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <BookOpen className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma aula encontrada</h3>
                <p className="text-muted-foreground">Este curso ainda não possui aulas disponíveis.</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar - Course Modules */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Conteúdo do Curso</CardTitle>
              <div className="border-t border-border pt-3 mt-3"></div>
            </CardHeader>
            <CardContent className="pt-0 max-h-96 overflow-y-auto">
              {modules?.map((module: any, moduleIndex: number) => (
                <div key={module.id} className="mb-4 last:mb-0">
                  {/* Module Header - Collapsible */}
                  <button
                    onClick={() => toggleModule(module.id)}
                    className="w-full flex items-center justify-between p-2 rounded hover:bg-muted/50 transition-colors"
                  >
                    <h4 className="font-medium text-sm text-foreground text-left">
                      Módulo {moduleIndex + 1}: {module.title}
                    </h4>
                    {expandedModules.has(module.id) ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>

                  {/* Module Divider */}
                  <div className="border-t border-border my-2"></div>

                  {/* Lessons - Only show if module is expanded */}
                  {expandedModules.has(module.id) && (
                    <div className="space-y-1 ml-2">
                      {module.lessons?.map((lesson: any, lessonIndex: number) => (
                        <button
                          key={lesson.id}
                          onClick={() => setCurrentLessonId(lesson.id)}
                          className={`w-full text-left p-2 rounded text-xs transition-colors ${
                            currentLessonId === lesson.id
                              ? 'bg-gray-100 text-gray-900 border border-gray-200'
                              : 'hover:bg-muted text-muted-foreground'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div className="flex-shrink-0">
                              {completedLessons.has(lesson.id) ? (
                                <CheckCircle className="w-3 h-3 text-green-600" />
                              ) : lesson.content_type === 'video' ? (
                                <Play className="w-3 h-3" />
                              ) : (
                                <BookOpen className="w-3 h-3" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className="truncate">
                                  {lesson.title}
                                  {completedLessons.has(lesson.id) && (
                                    <span className="ml-2 text-green-600">✓</span>
                                  )}
                                </p>
                                <span className="opacity-70 text-sm ml-2 flex-shrink-0">
                                  {formatDuration(lesson.duration_minutes || 0)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Divider between modules */}
                  {moduleIndex < (modules?.length || 0) - 1 && (
                    <div className="border-t border-border mt-4"></div>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
