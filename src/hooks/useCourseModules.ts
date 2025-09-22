import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Tipos temporários até regenerar os tipos do Supabase
type CourseModule = any;
type CourseModuleInsert = any;
type CourseModuleUpdate = any;

// Hook para buscar módulos de um curso
export const useCourseModules = (courseId: string) => {
  return useQuery({
    queryKey: ["course-modules", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_modules")
        .select(`
          *,
          lessons:course_lessons(
            id, title, description, order_index, content_type,
            content_url, duration_minutes, active
          )
        `)
        .eq("course_id", courseId)
        .eq("active", true)
        .order("order_index");

      if (error) throw error;
      return data;
    },
    enabled: !!courseId,
  });
};

// Hook para buscar um módulo específico
export const useCourseModule = (moduleId: string) => {
  return useQuery({
    queryKey: ["course-module", moduleId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_modules")
        .select(`
          *,
          course:courses(id, title),
          lessons:course_lessons(
            id, title, description, order_index, content_type,
            content_url, content_html, duration_minutes, active
          )
        `)
        .eq("id", moduleId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!moduleId,
  });
};

// Hook para criar módulo (apenas matriz)
export const useCreateCourseModule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (moduleData: CourseModuleInsert) => {
      const { data, error } = await supabase
        .from("course_modules")
        .insert(moduleData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["course-modules", variables.course_id] });
      toast.success("Módulo criado com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao criar módulo:", error);
      toast.error("Erro ao criar módulo");
    },
  });
};

// Hook para atualizar módulo (apenas matriz)
export const useUpdateCourseModule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updateData }: CourseModuleUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("course_modules")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["course-modules", data.course_id] });
      queryClient.invalidateQueries({ queryKey: ["course-module", data.id] });
      toast.success("Módulo atualizado com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao atualizar módulo:", error);
      toast.error("Erro ao atualizar módulo");
    },
  });
};

// Hook para deletar módulo (apenas matriz)
export const useDeleteCourseModule = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (moduleId: string) => {
      const { error } = await supabase
        .from("course_modules")
        .delete()
        .eq("id", moduleId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["course-modules"] });
      toast.success("Módulo deletado com sucesso!");
    },
    onError: (error) => {
      console.error("Erro ao deletar módulo:", error);
      toast.error("Erro ao deletar módulo");
    },
  });
};

// Hook para reordenar módulos (apenas matriz)
export const useReorderCourseModules = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      courseId, 
      moduleIds 
    }: { 
      courseId: string; 
      moduleIds: string[];
    }) => {
      const updates = moduleIds.map((moduleId, index) => ({
        id: moduleId,
        order_index: index + 1,
      }));

      const { error } = await supabase
        .from("course_modules")
        .upsert(updates);

      if (error) throw error;
    },
    onSuccess: (_, { courseId }) => {
      queryClient.invalidateQueries({ queryKey: ["course-modules", courseId] });
      toast.success("Ordem dos módulos atualizada!");
    },
    onError: (error) => {
      console.error("Erro ao reordenar módulos:", error);
      toast.error("Erro ao reordenar módulos");
    },
  });
};
