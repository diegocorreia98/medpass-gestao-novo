import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Tipos temporários até regenerar os tipos do Supabase
type CourseLesson = any;
type CourseLessonInsert = any;
type CourseLessonUpdate = any;

// Hook para buscar lições de um módulo
export const useCourseLessons = (moduleId: string) => {
  return useQuery({
    queryKey: ["course-lessons", moduleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_lessons")
        .select(`
          *,
          module:course_modules(id, title, course_id)
        `)
        .eq("module_id", moduleId)
        .eq("active", true)
        .order("order_index");

      if (error) throw error;
      return data;
    },
    enabled: !!moduleId,
  });
};

// Hook para buscar uma lição específica
export const useCourseLesson = (lessonId: string) => {
  return useQuery({
    queryKey: ["course-lesson", lessonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_lessons")
        .select(`
          *,
          module:course_modules(
            id, title, course_id,
            course:courses(id, title)
          )
        `)
        .eq("id", lessonId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!lessonId,
  });
};

// Hook para criar lição (apenas matriz)
export const useCreateCourseLesson = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (lessonData: CourseLessonInsert) => {
      const { data, error } = await supabase
        .from("course_lessons")
        .insert(lessonData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["course-lessons", variables.module_id] });
      toast.success("Lição criada com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao criar lição:", error);
      toast.error("Erro ao criar lição");
    },
  });
};

// Hook para atualizar lição (apenas matriz)
export const useUpdateCourseLesson = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updateData }: CourseLessonUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("course_lessons")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["course-lessons", data.module_id] });
      queryClient.invalidateQueries({ queryKey: ["course-lesson", data.id] });
      toast.success("Lição atualizada com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao atualizar lição:", error);
      toast.error("Erro ao atualizar lição");
    },
  });
};

// Hook para deletar lição (apenas matriz)
export const useDeleteCourseLesson = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (lessonId: string) => {
      const { error } = await supabase
        .from("course_lessons")
        .delete()
        .eq("id", lessonId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["course-lessons"] });
      toast.success("Lição deletada com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao deletar lição:", error);
      toast.error("Erro ao deletar lição");
    },
  });
};

// Hook para reordenar lições (apenas matriz)
export const useReorderCourseLessons = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      moduleId, 
      lessonIds 
    }: { 
      moduleId: string; 
      lessonIds: string[];
    }) => {
      const updates = lessonIds.map((lessonId, index) => ({
        id: lessonId,
        order_index: index + 1,
      }));

      const { error } = await supabase
        .from("course_lessons")
        .upsert(updates);

      if (error) throw error;
    },
    onSuccess: (_, { moduleId }) => {
      queryClient.invalidateQueries({ queryKey: ["course-lessons", moduleId] });
      toast.success("Ordem das lições atualizada!");
    },
    onError: (error) => {
      console.error("Erro ao reordenar lições:", error);
      toast.error("Erro ao reordenar lições");
    },
  });
};

// Hook para marcar lição como assistida
export const useWatchLesson = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      lessonId, 
      timeWatched = 0,
      completed = false 
    }: { 
      lessonId: string; 
      timeWatched?: number;
      completed?: boolean;
    }) => {
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from("lesson_progress")
        .upsert({
          user_id: user.data.user.id,
          lesson_id: lessonId,
          time_spent: timeWatched,
          completed,
          completed_at: completed ? new Date().toISOString() : null,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["course-progress"] });
    },
    onError: (error) => {
      console.error("Erro ao atualizar progresso:", error);
    },
  });
};

// Função helper para extrair ID do Vimeo de uma URL
export const extractVimeoId = (url: string): string | null => {
  if (!url) return null;

  // Padrões de URL do Vimeo suportados
  const patterns = [
    /vimeo\.com\/(\d+)/,
    /player\.vimeo\.com\/video\/(\d+)/,
    /vimeo\.com\/channels\/\w+\/(\d+)/,
    /vimeo\.com\/groups\/\w+\/videos\/(\d+)/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return null;
};

// Função helper para gerar URL de embed do Vimeo
export const getVimeoEmbedUrl = (vimeoId: string): string => {
  return `https://player.vimeo.com/video/${vimeoId}`;
};

// Função helper para gerar URL de thumbnail do Vimeo
export const getVimeoThumbnail = async (vimeoId: string): Promise<string | null> => {
  try {
    const response = await fetch(`https://vimeo.com/api/v2/video/${vimeoId}.json`);
    const data = await response.json();
    return data[0]?.thumbnail_large || null;
  } catch (error) {
    console.error("Erro ao buscar thumbnail do Vimeo:", error);
    return null;
  }
};

// Função helper para validar URL do Vimeo
export const isValidVimeoUrl = (url: string): boolean => {
  return extractVimeoId(url) !== null;
};
