import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  Play, 
  CheckCircle, 
  Clock, 
  BookOpen, 
  Download,
  MessageCircle,
  FileText,
  Award,
  ChevronRight,
  ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { VideoPlayer } from "@/components/courses/VideoPlayer";
import { useCourse, useCourseProgress, useCompleteLesson } from "@/hooks/useCourses";
import { useCourseModules } from "@/hooks/useCourseModules";
import { useWatchLesson } from "@/hooks/useCourseLessons";
import { cn } from "@/lib/utils";

export function CourseViewer() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [selectedLessonId, setSelectedLessonId] = useState<string>("");
  const [openModules, setOpenModules] = useState<string[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [notes, setNotes] = useState("");

  const { data: course } = useCourse(courseId || "");
  const { data: modules } = useCourseModules(courseId || "");
  const { data: progress } = useCourseProgress(courseId || "");
  const completeLesson = useCompleteLesson();
  const watchLesson = useWatchLesson();

  // Get first lesson when course loads
  useEffect(() => {
    if (modules && modules.length > 0 && !selectedLessonId) {
      const firstModule = modules[0];
      if (firstModule.lessons && firstModule.lessons.length > 0) {
        setSelectedLessonId(firstModule.lessons[0].id);
        setOpenModules([firstModule.id]);
      }
    }
  }, [modules, selectedLessonId]);

  const selectedLesson = modules
    ?.flatMap(module => module.lessons || [])
    .find(lesson => lesson.id === selectedLessonId);

  const allLessons = modules?.flatMap(module => module.lessons || []) || [];
  const completedLessons = progress?.lesson_progress?.filter(lp => lp.completed) || [];
  const progressPercentage = allLessons.length > 0 
    ? (completedLessons.length / allLessons.length) * 100 
    : 0;

  const handleLessonSelect = (lessonId: string) => {
    setSelectedLessonId(lessonId);
    setCurrentTime(0);
  };

  const handleVideoTimeUpdate = (currentTime: number, duration: number) => {
    setCurrentTime(currentTime);
    
    // Save progress every 30 seconds
    if (Math.floor(currentTime) % 30 === 0) {
      watchLesson.mutate({
        lessonId: selectedLessonId,
        timeWatched: currentTime,
      });
    }
  };

  const handleVideoComplete = () => {
    if (selectedLessonId && courseId) {
      completeLesson.mutate({
        courseId,
        lessonId: selectedLessonId,
        timeSpent: currentTime,
      });

      // Auto-advance to next lesson
      const currentIndex = allLessons.findIndex(lesson => lesson.id === selectedLessonId);
      if (currentIndex < allLessons.length - 1) {
        const nextLesson = allLessons[currentIndex + 1];
        setSelectedLessonId(nextLesson.id);
      }
    }
  };

  const toggleModule = (moduleId: string) => {
    setOpenModules(prev => 
      prev.includes(moduleId) 
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  const isLessonCompleted = (lessonId: string) => {
    return completedLessons.some(lp => lp.lesson_id === lessonId);
  };

  const getLessonIcon = (type: string) => {
    switch (type) {
      case "video":
        return <Play className="w-4 h-4" />;
      case "text":
        return <FileText className="w-4 h-4" />;
      case "quiz":
        return <Award className="w-4 h-4" />;
      default:
        return <BookOpen className="w-4 h-4" />;
    }
  };

  if (!course) {
    return (
      <div className="max-w-7xl mx-auto text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Curso não encontrado</h2>
        <Button onClick={() => navigate("/learn")}>Voltar para Biblioteca</Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate("/learn")}>
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{course.title}</h1>
              <p className="text-sm text-gray-600">
                {completedLessons.length} de {allLessons.length} lições concluídas
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm font-medium">{Math.round(progressPercentage)}%</div>
              <Progress value={progressPercentage} className="w-32" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-180px)]">
        {/* Sidebar - Course Content */}
        <div className="w-80 bg-white border-r overflow-y-auto">
          <div className="p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Conteúdo do Curso</h3>
            
            <div className="space-y-2">
              {modules?.map((module, moduleIndex) => (
                <Collapsible 
                  key={module.id}
                  open={openModules.includes(module.id)}
                  onOpenChange={() => toggleModule(module.id)}
                >
                  <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold text-xs">
                        {moduleIndex + 1}
                      </div>
                      <span className="font-medium text-sm">{module.title}</span>
                    </div>
                    {openModules.includes(module.id) ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent className="mt-2 space-y-1">
                    {module.lessons?.map((lesson) => {
                      const isCompleted = isLessonCompleted(lesson.id);
                      const isSelected = lesson.id === selectedLessonId;
                      
                      return (
                        <button
                          key={lesson.id}
                          onClick={() => handleLessonSelect(lesson.id)}
                          className={cn(
                            "flex items-center gap-3 w-full p-3 rounded-lg text-left transition-colors",
                            isSelected 
                              ? "bg-blue-50 border border-blue-200" 
                              : "hover:bg-gray-50",
                            isCompleted && "bg-green-50"
                          )}
                        >
                          <div className={cn(
                            "w-5 h-5 rounded-full flex items-center justify-center",
                            isCompleted 
                              ? "bg-green-100 text-green-600" 
                              : "bg-gray-100 text-gray-400"
                          )}>
                            {isCompleted ? (
                              <CheckCircle className="w-3 h-3" />
                            ) : (
                              getLessonIcon(lesson.type)
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={cn(
                              "text-sm font-medium truncate",
                              isSelected ? "text-blue-900" : "text-gray-900"
                            )}>
                              {lesson.title}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              {lesson.duration_minutes && (
                                <div className="flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  <span>{lesson.duration_minutes}min</span>
                                </div>
                              )}
                              <span className="capitalize">{lesson.type}</span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-hidden">
          {selectedLesson ? (
            <div className="h-full flex flex-col">
              {/* Video Player or Content */}
              <div className="flex-1">
                {selectedLesson.type === "video" && selectedLesson.video_url ? (
                  <VideoPlayer
                    src={selectedLesson.video_url}
                    title={selectedLesson.title}
                    onTimeUpdate={handleVideoTimeUpdate}
                    onComplete={handleVideoComplete}
                    className="h-full"
                  />
                ) : (
                  <div className="h-full p-6 overflow-y-auto">
                    <div className="max-w-4xl mx-auto">
                      <h2 className="text-2xl font-bold text-gray-900 mb-4">
                        {selectedLesson.title}
                      </h2>
                      {selectedLesson.description && (
                        <p className="text-gray-600 mb-6">{selectedLesson.description}</p>
                      )}
                      {selectedLesson.content && (
                        <div 
                          className="prose prose-lg max-w-none"
                          dangerouslySetInnerHTML={{ __html: selectedLesson.content }}
                        />
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom Panel */}
              <div className="border-t bg-white">
                <Tabs defaultValue="info" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="info">Informações</TabsTrigger>
                    <TabsTrigger value="materials">Materiais</TabsTrigger>
                    <TabsTrigger value="notes">Anotações</TabsTrigger>
                  </TabsList>
                  
                  <div className="h-48 overflow-y-auto">
                    <TabsContent value="info" className="p-4">
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-2">
                            {selectedLesson.title}
                          </h4>
                          <p className="text-gray-600 text-sm">
                            {selectedLesson.description}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-gray-500">
                          {selectedLesson.duration_minutes && (
                            <div className="flex items-center gap-1">
                              <Clock className="w-4 h-4" />
                              <span>{selectedLesson.duration_minutes} minutos</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <BookOpen className="w-4 h-4" />
                            <span className="capitalize">{selectedLesson.type}</span>
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="materials" className="p-4">
                      <div className="space-y-3">
                        {selectedLesson.materials && selectedLesson.materials.length > 0 ? (
                          selectedLesson.materials.map((material) => (
                            <div 
                              key={material.id}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                <FileText className="w-4 h-4 text-gray-400" />
                                <div>
                                  <p className="font-medium text-sm">{material.title}</p>
                                  <p className="text-xs text-gray-500">
                                    {material.file_type?.toUpperCase()}
                                    {material.file_size && ` • ${(material.file_size / 1024 / 1024).toFixed(1)}MB`}
                                  </p>
                                </div>
                              </div>
                              <Button size="sm" variant="outline">
                                <Download className="w-4 h-4" />
                              </Button>
                            </div>
                          ))
                        ) : (
                          <p className="text-gray-500 text-sm">
                            Nenhum material complementar disponível para esta lição.
                          </p>
                        )}
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="notes" className="p-4">
                      <div className="space-y-3">
                        <Textarea
                          placeholder="Faça suas anotações sobre esta lição..."
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          rows={4}
                        />
                        <Button size="sm">Salvar Anotação</Button>
                      </div>
                    </TabsContent>
                  </div>
                </Tabs>
              </div>
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <BookOpen className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Selecione uma lição
                </h3>
                <p className="text-gray-600">
                  Escolha uma lição no menu lateral para começar a estudar.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
