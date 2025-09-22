import { useState } from "react";
import { Plus, Edit, Trash2, GripVertical, ChevronDown, ChevronRight, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useCourseModules, useDeleteCourseModule } from "@/hooks/useCourseModules";
import { useCourseLessons } from "@/hooks/useCourseLessons";
import { ModuleFormDialog } from "./ModuleFormDialog";
import { LessonFormDialog } from "./LessonFormDialog";

interface CourseModuleManagerProps {
  courseId: string;
}

export function CourseModuleManager({ courseId }: CourseModuleManagerProps) {
  const [openModules, setOpenModules] = useState<Set<string>>(new Set());
  const [editingModule, setEditingModule] = useState<any>(null);
  const [editingLesson, setEditingLesson] = useState<any>(null);
  const [selectedModuleForLesson, setSelectedModuleForLesson] = useState<string>("");
  const [isModuleDialogOpen, setIsModuleDialogOpen] = useState(false);
  const [isLessonDialogOpen, setIsLessonDialogOpen] = useState(false);

  const { data: modules, isLoading } = useCourseModules(courseId);
  const deleteModule = useDeleteCourseModule();

  const toggleModule = (moduleId: string) => {
    const newOpenModules = new Set(openModules);
    if (newOpenModules.has(moduleId)) {
      newOpenModules.delete(moduleId);
    } else {
      newOpenModules.add(moduleId);
    }
    setOpenModules(newOpenModules);
  };

  const handleEditModule = (module: any) => {
    setEditingModule(module);
    setIsModuleDialogOpen(true);
  };

  const handleDeleteModule = async (moduleId: string, title: string) => {
    if (window.confirm(`Tem certeza que deseja deletar o módulo "${title}"? Todas as aulas serão removidas também.`)) {
      await deleteModule.mutateAsync(moduleId);
    }
  };

  const handleCreateLesson = (moduleId: string) => {
    setSelectedModuleForLesson(moduleId);
    setEditingLesson(null);
    setIsLessonDialogOpen(true);
  };

  const handleEditLesson = (lesson: any) => {
    setEditingLesson(lesson);
    setSelectedModuleForLesson(lesson.module_id);
    setIsLessonDialogOpen(true);
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes}min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes > 0 ? `${remainingMinutes}min` : ''}`;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Módulos e Aulas</h3>
          <p className="text-sm text-muted-foreground">
            Organize o conteúdo do curso em módulos e aulas
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingModule(null);
            setIsModuleDialogOpen(true);
          }}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Novo Módulo
        </Button>
      </div>

      {/* Modules List */}
      <div className="space-y-4">
        {modules?.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <Plus className="w-8 h-8 text-gray-400" />
              </div>
              <h4 className="text-lg font-semibold text-foreground mb-2">
                Nenhum módulo criado
              </h4>
              <p className="text-muted-foreground mb-4">
                Crie o primeiro módulo para começar a adicionar aulas ao curso.
              </p>
              <Button
                onClick={() => {
                  setEditingModule(null);
                  setIsModuleDialogOpen(true);
                }}
              >
                Criar Primeiro Módulo
              </Button>
            </CardContent>
          </Card>
        ) : (
          modules?.map((module, index) => (
            <ModuleCard
              key={module.id}
              module={module}
              index={index}
              isOpen={openModules.has(module.id)}
              onToggle={() => toggleModule(module.id)}
              onEdit={() => handleEditModule(module)}
              onDelete={() => handleDeleteModule(module.id, module.title)}
              onCreateLesson={() => handleCreateLesson(module.id)}
              onEditLesson={handleEditLesson}
              formatDuration={formatDuration}
            />
          ))
        )}
      </div>

      {/* Dialogs */}
      <ModuleFormDialog
        open={isModuleDialogOpen}
        onOpenChange={setIsModuleDialogOpen}
        module={editingModule}
        courseId={courseId}
        nextOrderIndex={(modules?.length || 0) + 1}
      />

      <LessonFormDialog
        open={isLessonDialogOpen}
        onOpenChange={setIsLessonDialogOpen}
        lesson={editingLesson}
        moduleId={selectedModuleForLesson}
      />
    </div>
  );
}

interface ModuleCardProps {
  module: any;
  index: number;
  isOpen: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onCreateLesson: () => void;
  onEditLesson: (lesson: any) => void;
  formatDuration: (minutes: number) => string;
}

function ModuleCard({
  module,
  index,
  isOpen,
  onToggle,
  onEdit,
  onDelete,
  onCreateLesson,
  onEditLesson,
  formatDuration,
}: ModuleCardProps) {
  const { data: lessons } = useCourseLessons(module.id);
  const totalLessons = lessons?.length || 0;
  const totalDuration = lessons?.reduce((acc, lesson) => acc + (lesson.duration_minutes || 0), 0) || 0;

  return (
    <Card>
      <Collapsible open={isOpen} onOpenChange={onToggle}>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <GripVertical className="w-4 h-4 text-gray-400" />
              <Badge variant="outline" className="text-xs">
                {index + 1}
              </Badge>
            </div>

            <CollapsibleTrigger className="flex-1 flex items-center gap-2 text-left">
              {isOpen ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
              <div className="flex-1">
                <h4 className="font-medium">{module.title}</h4>
                {module.description && (
                  <p className="text-sm text-muted-foreground">{module.description}</p>
                )}
              </div>
            </CollapsibleTrigger>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>{totalLessons} aulas</span>
              <span>•</span>
              <span>{formatDuration(totalDuration)}</span>
            </div>

            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={onEdit}>
                <Edit className="w-4 h-4" />
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Deletar módulo</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja deletar o módulo "{module.title}"?
                      Todas as aulas deste módulo serão removidas permanentemente.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={onDelete}>
                      Deletar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="space-y-3">
              {lessons?.length === 0 ? (
                <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
                  <Play className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm text-muted-foreground mb-3">
                    Nenhuma aula neste módulo
                  </p>
                  <Button variant="outline" size="sm" onClick={onCreateLesson}>
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Primeira Aula
                  </Button>
                </div>
              ) : (
                <>
                  {lessons?.map((lesson, lessonIndex) => (
                    <div
                      key={lesson.id}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <GripVertical className="w-4 h-4 text-gray-400" />
                        <Badge variant="secondary" className="text-xs">
                          {lessonIndex + 1}
                        </Badge>
                      </div>

                      <Play className="w-4 h-4 text-primary" />

                      <div className="flex-1">
                        <h5 className="font-medium text-sm">{lesson.title}</h5>
                        {lesson.description && (
                          <p className="text-xs text-muted-foreground">{lesson.description}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {lesson.content_type === 'video' && (
                          <Badge variant="outline" className="text-xs">
                            Vídeo
                          </Badge>
                        )}
                        <span>{formatDuration(lesson.duration_minutes || 0)}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onEditLesson(lesson)}
                        >
                          <Edit className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onCreateLesson}
                    className="w-full mt-3"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Adicionar Aula
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}