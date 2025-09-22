import { useEffect } from "react";
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
} from "@/components/ui/form";
import { useCreateCourseModule, useUpdateCourseModule } from "@/hooks/useCourseModules";
import { Loader2 } from "lucide-react";

const moduleSchema = z.object({
  title: z.string().min(1, "Título é obrigatório").max(200, "Título muito longo"),
  description: z.string().optional(),
});

type ModuleFormData = z.infer<typeof moduleSchema>;

interface ModuleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  module?: any;
  courseId: string;
  nextOrderIndex: number;
}

export function ModuleFormDialog({
  open,
  onOpenChange,
  module,
  courseId,
  nextOrderIndex,
}: ModuleFormDialogProps) {
  const createModule = useCreateCourseModule();
  const updateModule = useUpdateCourseModule();

  const form = useForm<ModuleFormData>({
    resolver: zodResolver(moduleSchema),
    defaultValues: {
      title: "",
      description: "",
    },
  });

  useEffect(() => {
    if (module) {
      form.reset({
        title: module.title || "",
        description: module.description || "",
      });
    } else {
      form.reset({
        title: "",
        description: "",
      });
    }
  }, [module, form]);

  const onSubmit = async (data: ModuleFormData) => {
    try {
      if (module) {
        await updateModule.mutateAsync({
          id: module.id,
          ...data,
        });
      } else {
        await createModule.mutateAsync({
          course_id: courseId,
          order_index: nextOrderIndex,
          duration_minutes: 0,
          active: true,
          ...data,
        });
      }

      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao salvar módulo:", error);
    }
  };

  const handleCancel = () => {
    form.reset();
    onOpenChange(false);
  };

  const isLoading = createModule.isPending || updateModule.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {module ? "Editar Módulo" : "Novo Módulo"}
          </DialogTitle>
          <DialogDescription>
            {module
              ? "Edite as informações do módulo"
              : "Crie um novo módulo para organizar as aulas do curso"
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
                    <FormLabel>Título do Módulo *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Introdução ao Atendimento"
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
                        placeholder="Descrição opcional do módulo..."
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {module ? "Salvar Alterações" : "Criar Módulo"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}