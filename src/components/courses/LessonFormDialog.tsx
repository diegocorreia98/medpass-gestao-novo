import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useCreateCourseLesson, useUpdateCourseLesson, extractVimeoId, isValidVimeoUrl } from "@/hooks/useCourseLessons";
import { useCourseLessons } from "@/hooks/useCourseLessons";
import { Loader2, ExternalLink, Play, AlertCircle } from "lucide-react";

const lessonSchema = z.object({
  title: z.string().min(1, "Título é obrigatório").max(200, "Título muito longo"),
  description: z.string().optional(),
  content_type: z.enum(["video", "text", "pdf", "audio", "quiz"]).default("video"),
  content_url: z.string().optional(),
  content_html: z.string().optional(),
  duration_minutes: z.number().min(0, "Duração deve ser positiva").default(0),
});

type LessonFormData = z.infer<typeof lessonSchema>;

interface LessonFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lesson?: any;
  moduleId: string;
}

export function LessonFormDialog({
  open,
  onOpenChange,
  lesson,
  moduleId,
}: LessonFormDialogProps) {
  const [vimeoPreview, setVimeoPreview] = useState<string | null>(null);
  const [vimeoError, setVimeoError] = useState<string | null>(null);

  const createLesson = useCreateCourseLesson();
  const updateLesson = useUpdateCourseLesson();
  const { data: lessons } = useCourseLessons(moduleId);

  const form = useForm<LessonFormData>({
    resolver: zodResolver(lessonSchema),
    defaultValues: {
      title: "",
      description: "",
      content_type: "video",
      content_url: "",
      content_html: "",
      duration_minutes: 0,
    },
  });

  const watchContentUrl = form.watch("content_url");
  const watchContentType = form.watch("content_type");

  useEffect(() => {
    if (lesson) {
      form.reset({
        title: lesson.title || "",
        description: lesson.description || "",
        content_type: lesson.content_type || "video",
        content_url: lesson.content_url || "",
        content_html: lesson.content_html || "",
        duration_minutes: lesson.duration_minutes || 0,
      });
    } else {
      form.reset({
        title: "",
        description: "",
        content_type: "video",
        content_url: "",
        content_html: "",
        duration_minutes: 0,
      });
    }
  }, [lesson, form]);

  // Validar URL do Vimeo em tempo real
  useEffect(() => {
    if (watchContentType === "video" && watchContentUrl) {
      const vimeoId = extractVimeoId(watchContentUrl);
      if (vimeoId) {
        setVimeoPreview(`https://player.vimeo.com/video/${vimeoId}`);
        setVimeoError(null);
      } else if (watchContentUrl.trim()) {
        setVimeoPreview(null);
        setVimeoError("URL do Vimeo inválida. Use uma URL como: https://vimeo.com/123456789");
      } else {
        setVimeoPreview(null);
        setVimeoError(null);
      }
    } else {
      setVimeoPreview(null);
      setVimeoError(null);
    }
  }, [watchContentUrl, watchContentType]);

  const onSubmit = async (data: LessonFormData) => {
    try {
      // Validar URL do Vimeo se for vídeo
      if (data.content_type === "video" && data.content_url && !isValidVimeoUrl(data.content_url)) {
        setVimeoError("URL do Vimeo inválida");
        return;
      }

      const nextOrderIndex = lesson ? lesson.order_index : (lessons?.length || 0) + 1;

      if (lesson) {
        await updateLesson.mutateAsync({
          id: lesson.id,
          ...data,
        });
      } else {
        await createLesson.mutateAsync({
          module_id: moduleId,
          order_index: nextOrderIndex,
          active: true,
          ...data,
        });
      }

      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao salvar aula:", error);
    }
  };

  const handleCancel = () => {
    form.reset();
    setVimeoPreview(null);
    setVimeoError(null);
    onOpenChange(false);
  };

  const getContentTypeLabel = (type: string) => {
    switch (type) {
      case "video":
        return "Vídeo";
      case "text":
        return "Texto";
      case "pdf":
        return "PDF";
      case "audio":
        return "Áudio";
      case "quiz":
        return "Quiz";
      default:
        return type;
    }
  };

  const isLoading = createLesson.isPending || updateLesson.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {lesson ? "Editar Aula" : "Nova Aula"}
          </DialogTitle>
          <DialogDescription>
            {lesson
              ? "Edite as informações da aula"
              : "Crie uma nova aula para o módulo"
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 gap-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título da Aula *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Introdução ao Atendimento Telefônico"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descrição opcional da aula..."
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="content_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Conteúdo</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="video">
                            <div className="flex items-center gap-2">
                              <Play className="w-4 h-4" />
                              Vídeo
                            </div>
                          </SelectItem>
                          <SelectItem value="text">Texto</SelectItem>
                          <SelectItem value="pdf">PDF</SelectItem>
                          <SelectItem value="audio">Áudio</SelectItem>
                          <SelectItem value="quiz">Quiz</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="duration_minutes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duração (minutos)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          placeholder="0"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {watchContentType === "video" && (
                <FormField
                  control={form.control}
                  name="content_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL do Vimeo</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="https://vimeo.com/123456789"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Cole a URL do vídeo do Vimeo. Suportamos URLs como:
                        vimeo.com/123456789 ou player.vimeo.com/video/123456789
                      </FormDescription>
                      <FormMessage />
                      {vimeoError && (
                        <div className="flex items-center gap-2 text-sm text-red-600">
                          <AlertCircle className="w-4 h-4" />
                          {vimeoError}
                        </div>
                      )}
                    </FormItem>
                  )}
                />
              )}

              {watchContentType === "text" && (
                <FormField
                  control={form.control}
                  name="content_html"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Conteúdo</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Digite o conteúdo da aula..."
                          rows={8}
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Conteúdo em texto da aula
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {/* Preview do Vimeo */}
              {vimeoPreview && (
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Play className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">Preview do Vídeo</span>
                      <Badge variant="outline">Vimeo</Badge>
                    </div>
                    <div className="aspect-video bg-black rounded-lg overflow-hidden">
                      <iframe
                        src={vimeoPreview}
                        className="w-full h-full"
                        frameBorder="0"
                        allow="autoplay; fullscreen; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <ExternalLink className="w-3 h-3" />
                      <span>Vídeo carregado do Vimeo</span>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading || !!vimeoError}>
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {lesson ? "Salvar Alterações" : "Criar Aula"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}