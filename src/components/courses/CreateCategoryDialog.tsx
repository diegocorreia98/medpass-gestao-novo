import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCreateCourseCategory } from "@/hooks/useCourseCategories";
import { Loader2 } from "lucide-react";

const categorySchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(100, "Nome muito longo"),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
});

type CategoryFormData = z.infer<typeof categorySchema>;

interface CreateCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCategoryCreated?: (categoryId: string) => void;
}

// Ícones disponíveis para categorias
const iconOptions = [
  { value: "DollarSign", label: "💰 Vendas" },
  { value: "Headphones", label: "🎧 Atendimento" },
  { value: "Shield", label: "🛡️ Compliance" },
  { value: "Package", label: "📦 Produtos" },
  { value: "Users", label: "👥 Gestão" },
  { value: "Monitor", label: "💻 Tecnologia" },
  { value: "BookOpen", label: "📚 Educação" },
  { value: "Heart", label: "❤️ Saúde" },
  { value: "Zap", label: "⚡ Performance" },
  { value: "Trophy", label: "🏆 Certificação" },
];

// Cores disponíveis para categorias
const colorOptions = [
  { value: "#10b981", label: "Verde", preview: "bg-emerald-500" },
  { value: "#3b82f6", label: "Azul", preview: "bg-blue-500" },
  { value: "#f59e0b", label: "Amarelo", preview: "bg-amber-500" },
  { value: "#8b5cf6", label: "Roxo", preview: "bg-violet-500" },
  { value: "#ef4444", label: "Vermelho", preview: "bg-red-500" },
  { value: "#06b6d4", label: "Ciano", preview: "bg-cyan-500" },
  { value: "#ec4899", label: "Rosa", preview: "bg-pink-500" },
  { value: "#84cc16", label: "Lima", preview: "bg-lime-500" },
  { value: "#f97316", label: "Laranja", preview: "bg-orange-500" },
  { value: "#6b7280", label: "Cinza", preview: "bg-gray-500" },
];

export function CreateCategoryDialog({ 
  open, 
  onOpenChange, 
  onCategoryCreated 
}: CreateCategoryDialogProps) {
  const createCategory = useCreateCourseCategory();

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      description: "",
      icon: "BookOpen",
      color: "#3b82f6",
    },
  });

  const onSubmit = async (data: CategoryFormData) => {
    try {
      // Gerar slug automaticamente baseado no nome
      const slug = data.name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove acentos
        .replace(/[^a-z0-9\s]/g, "") // Remove caracteres especiais
        .replace(/\s+/g, "-") // Substitui espaços por hífens
        .trim();

      const categoryData = {
        ...data,
        slug,
        active: true,
      };

      const newCategory = await createCategory.mutateAsync(categoryData);
      
      // Notificar o componente pai sobre a nova categoria criada
      onCategoryCreated?.(newCategory.id);
      
      // Resetar formulário e fechar dialog
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error("Erro ao criar categoria:", error);
    }
  };

  const handleCancel = () => {
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Nova Categoria</DialogTitle>
          <DialogDescription>
            Crie uma nova categoria para organizar seus cursos
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da Categoria *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Vendas, Atendimento, Compliance..." {...field} />
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
                        placeholder="Descreva o propósito desta categoria..."
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
                  name="icon"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ícone</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um ícone" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {iconOptions.map((icon) => (
                            <SelectItem key={icon.value} value={icon.value}>
                              {icon.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cor</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma cor" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {colorOptions.map((color) => (
                            <SelectItem key={color.value} value={color.value}>
                              <div className="flex items-center gap-2">
                                <div className={`w-4 h-4 rounded-full ${color.preview}`} />
                                {color.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleCancel}
                disabled={createCategory.isPending}
              >
                Cancelar
              </Button>
              <Button 
                type="submit" 
                disabled={createCategory.isPending}
              >
                {createCategory.isPending && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                Criar Categoria
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
