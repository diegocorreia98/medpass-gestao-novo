import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Tipos temporários até regenerar os tipos do Supabase
type Course = any;
type CourseInsert = any;
type CourseUpdate = any;

// Hook para buscar todos os cursos
export const useCourses = () => {
  return useQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("courses")
          .select(`
            *,
            category:course_categories(name, color, icon)
          `)
          .eq("is_active", true)
          .order("created_at", { ascending: false });

        if (error) {
          // Se a tabela não existe ainda (migrações não executadas)
          if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
            console.warn('Tabela courses ainda não existe. Execute as migrações primeiro.');
            return [];
          }
          throw error;
        }

        return data || [];
      } catch (error) {
        console.error('Erro ao buscar cursos:', error);
        // Retornar array vazio em caso de erro para não quebrar a interface
        return [];
      }
    },
  });
};

// Hook para buscar um curso específico
export const useCourse = (courseId: string) => {
  return useQuery({
    queryKey: ["course", courseId],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from("courses")
          .select(`
            *,
            category:course_categories(name, color, icon),
            modules:course_modules(
              id, title, description, display_order, is_active,
              lessons:course_lessons(
                id, title, description, display_order, content,
                video_url, video_duration, attachments, is_active, is_preview
              )
            )
          `)
          .eq("id", courseId)
          .single();

        if (error) {
          if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
            throw new Error("Sistema de cursos ainda não está configurado. Execute as migrações primeiro.");
          }
          throw error;
        }

        return data;
      } catch (error) {
        console.error('Erro ao buscar curso:', error);
        throw error;
      }
    },
    enabled: !!courseId,
  });
};

// Hook para criar curso (apenas matriz)
export const useCreateCourse = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (courseData: CourseInsert) => {
      const { data, error } = await supabase
        .from("courses")
        .insert(courseData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      toast.success("Curso criado com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao criar curso:", error);
      toast.error("Erro ao criar curso");
    },
  });
};

// Hook para atualizar curso (apenas matriz)
export const useUpdateCourse = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updateData }: CourseUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("courses")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      toast.success("Curso atualizado com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao atualizar curso:", error);
      toast.error("Erro ao atualizar curso");
    },
  });
};

// Hook para deletar curso (apenas matriz)
export const useDeleteCourse = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (courseId: string) => {
      const { error } = await supabase
        .from("courses")
        .delete()
        .eq("id", courseId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      toast.success("Curso deletado com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao deletar curso:", error);
      toast.error("Erro ao deletar curso");
    },
  });
};

// Hook para buscar progresso do usuário em um curso
export const useCourseProgress = (courseId: string) => {
  return useQuery({
    queryKey: ["course-progress", courseId],
    queryFn: async () => {
      try {
        const { data: user } = await supabase.auth.getUser();
        if (!user.user?.id) throw new Error("Usuário não autenticado");

        const { data, error } = await supabase
          .from("course_enrollments")
          .select(`
            *,
            lesson_progress:lesson_progress(
              lesson_id, status, completed_at, time_spent
            )
          `)
          .eq("course_id", courseId)
          .eq("user_id", user.user.id)
          .single();

        if (error && error.code !== "PGRST116") {
          if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
            console.warn('Tabela course_enrollments ainda não existe. Execute as migrações primeiro.');
            return null;
          }
          throw error;
        }

        return data;
      } catch (error) {
        console.error('Erro ao buscar progresso do curso:', error);
        return null;
      }
    },
    enabled: !!courseId,
  });
};

// Hook para marcar lição como completa
export const useCompleteLesson = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      courseId,
      lessonId,
      timeSpent = 0
    }: {
      courseId: string;
      lessonId: string;
      timeSpent?: number;
    }) => {
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error("Usuário não autenticado");

      // Primeiro, buscar ou criar enrollment
      const { data: enrollment, error: enrollmentError } = await supabase
        .from("course_enrollments")
        .select("id")
        .eq("course_id", courseId)
        .eq("user_id", user.data.user.id)
        .single();

      if (enrollmentError && enrollmentError.code !== "PGRST116") {
        // Se não existe enrollment, criar um
        const { data: newEnrollment, error: createError } = await supabase
          .from("course_enrollments")
          .insert({
            course_id: courseId,
            user_id: user.data.user.id,
            status: "active",
            enrolled_at: new Date().toISOString(),
            started_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (createError) throw createError;
      }

      // Marcar lição como completa
      const { error: lessonError } = await supabase
        .from("lesson_progress")
        .upsert({
          user_id: user.data.user.id,
          lesson_id: lessonId,
          enrollment_id: enrollment?.id,
          status: "completed",
          completed_at: new Date().toISOString(),
          time_spent: timeSpent,
        });

      if (lessonError) throw lessonError;

      // Atualizar o progresso geral do curso usando a função do banco
      try {
        await supabase.rpc("update_enrollment_progress", {
          p_enrollment_id: enrollment?.id,
        });
      } catch (rpcError) {
        console.warn("Função update_enrollment_progress não disponível, progresso não atualizado automaticamente");
      }
    },
    onSuccess: (_, { courseId }) => {
      queryClient.invalidateQueries({ queryKey: ["course-progress", courseId] });
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      toast.success("Lição concluída!");
    },
    onError: (error) => {
      console.error("Erro ao completar lição:", error);
      toast.error("Erro ao completar lição");
    },
  });
};
