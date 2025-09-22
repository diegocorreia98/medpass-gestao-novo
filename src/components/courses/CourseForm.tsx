import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { Upload, X, Save, ArrowLeft, Plus, Trash2 } from "lucide-react";
import { useCreateCourse, useUpdateCourse, useCourse } from "@/hooks/useCourses";
import { useCourseCategories } from "@/hooks/useCourseCategories";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { CreateCategoryDialog } from "./CreateCategoryDialog";
import { CourseModuleManager } from "./CourseModuleManager";
import { supabase } from "@/integrations/supabase/client";

const courseSchema = z.object({
  title: z.string().min(1, "Título é obrigatório").max(200, "Título muito longo"),
  description: z.string().optional(),
  category_id: z.string().optional(),
  instructor_name: z.string().optional(),
  instructor_bio: z.string().optional(),
  level: z.enum(["beginner", "intermediate", "advanced"]).default("beginner"),
  duration_hours: z.number().min(0, "Duração deve ser positiva").default(0),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  cover_image_url: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

type CourseFormData = z.infer<typeof courseSchema>;

interface CourseFormProps {
  courseId?: string;
  mode: "create" | "edit";
}

export function CourseForm({ courseId, mode }: CourseFormProps) {
  const navigate = useNavigate();
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isCreateCategoryOpen, setIsCreateCategoryOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const { data: course, isLoading: courseLoading, error: courseError } = useCourse(courseId || "");
  const { data: categories } = useCourseCategories();
  const createCourse = useCreateCourse();
  const updateCourse = useUpdateCourse();

  const form = useForm<CourseFormData>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      title: "",
      description: "",
      category_id: "",
      instructor_name: "",
      instructor_bio: "",
      level: "beginner",
      duration_hours: 0,
      status: "draft",
      cover_image_url: "",
      tags: [],
    },
  });

  useEffect(() => {
    if (course && mode === "edit" && !courseLoading) {
      const formData = {
        title: course.title || "",
        description: course.description || "",
        category_id: course.category_id || "",
        instructor_name: course.instructor_name || "",
        instructor_bio: course.instructor_bio || "",
        level: (course.level as "beginner" | "intermediate" | "advanced") || "beginner",
        duration_hours: course.duration_hours || 0,
        status: (course.status as "draft" | "published" | "archived") || "draft",
        cover_image_url: course.cover_image_url || "",
        tags: course.tags || [],
      };

      form.reset(formData);
      setTags(course.tags || []);
      setImagePreview(course.cover_image_url || null);
    }
  }, [course, mode, courseId, courseLoading, form]);

  const onSubmit = async (data: CourseFormData) => {
    try {
      const courseData = {
        ...data,
        tags,
      };

      if (mode === "create") {
        const newCourse = await createCourse.mutateAsync(courseData);
        toast.success("Curso criado! Agora você pode adicionar módulos e aulas.");
        navigate(`/courses/${newCourse.id}/edit`);
      } else if (courseId) {
        await updateCourse.mutateAsync({ id: courseId, ...courseData });
        toast.success("Curso atualizado com sucesso!");
      }
    } catch (error) {
      console.error("Erro ao salvar curso:", error);
    }
  };

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      const updatedTags = [...tags, newTag.trim()];
      setTags(updatedTags);
      setNewTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast.error("Por favor, selecione um arquivo de imagem válido");
      return;
    }

    // Validar tamanho (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB");
      return;
    }

    setIsUploading(true);
    try {
      // Criar preview local primeiro
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setImagePreview(result);
      };
      reader.readAsDataURL(file);

      // Gerar nome único para o arquivo
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `covers/${fileName}`;

      // Upload para Supabase Storage
      const { data, error } = await supabase.storage
        .from('course-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        throw error;
      }

      // Obter URL pública da imagem
      const { data: publicUrlData } = supabase.storage
        .from('course-images')
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData.publicUrl;

      // Atualizar o formulário com a URL pública
      form.setValue("cover_image_url", publicUrl);

      toast.success("Imagem carregada com sucesso!");
    } catch (error) {
      toast.error("Erro ao carregar imagem");
      console.error("Erro no upload:", error);
      // Limpar preview em caso de erro
      setImagePreview(null);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    const currentImageUrl = form.getValues("cover_image_url");

    // Se a imagem atual for do Supabase Storage, deletar
    if (currentImageUrl && currentImageUrl.includes('course-images')) {
      try {
        // Extrair o caminho do arquivo da URL
        const url = new URL(currentImageUrl);
        const pathParts = url.pathname.split('/');
        const filePath = pathParts.slice(-2).join('/'); // Pega "covers/filename.ext"

        await supabase.storage
          .from('course-images')
          .remove([filePath]);
      } catch (error) {
        console.error("Erro ao deletar imagem do storage:", error);
        // Continua mesmo se der erro na exclusão
      }
    }

    setImagePreview(null);
    form.setValue("cover_image_url", "");
    // Reset do input file
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = "";
    }
  };

  const handleCategoryCreated = (categoryId: string) => {
    // Selecionar automaticamente a nova categoria criada
    form.setValue("category_id", categoryId);
  };

  const getLevelLabel = (level: string) => {
    switch (level) {
      case "beginner":
        return "Iniciante";
      case "intermediate":
        return "Intermediário";
      case "advanced":
        return "Avançado";
      default:
        return level;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "draft":
        return "Rascunho";
      case "published":
        return "Publicado";
      case "archived":
        return "Arquivado";
      default:
        return status;
    }
  };

  // Loading state para edição
  if (mode === "edit" && courseLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-4">
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  // Error state para edição
  if (mode === "edit" && courseError) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center p-8">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Erro ao carregar curso</h2>
          <p className="text-gray-600 mb-4">Não foi possível carregar os dados do curso.</p>
          <Button onClick={() => navigate("/courses")} variant="outline">
            Voltar para lista de cursos
          </Button>
        </div>
      </div>
    );
  }

  // Se em modo edit mas não tem course, e não está carregando, então não encontrou
  if (mode === "edit" && !course && !courseLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center p-8">
          <h2 className="text-xl font-semibold text-gray-600 mb-2">Curso não encontrado</h2>
          <p className="text-gray-600 mb-4">O curso que você está tentando editar não foi encontrado.</p>
          <Button onClick={() => navigate("/courses")} variant="outline">
            Voltar para lista de cursos
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate("/courses")}>
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            {mode === "create" ? "Novo Curso" : "Editar Curso"}
          </h1>
          <p className="text-muted-foreground">
            {mode === "create" 
              ? "Crie um novo curso para suas unidades" 
              : "Edite as informações do curso"
            }
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>Informações Básicas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título do Curso</FormLabel>
                    <FormControl>
                      <Input placeholder="Digite o título do curso" {...field} />
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
                        placeholder="Descreva o curso e seus objetivos"
                        rows={4}
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
                  name="category_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma categoria" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories?.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
                          <div className="border-t border-border mt-1 pt-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start text-primary hover:text-primary hover:bg-primary/10"
                              onClick={() => setIsCreateCategoryOpen(true)}
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Nova Categoria
                            </Button>
                          </div>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="level"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nível</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="beginner">Iniciante</SelectItem>
                          <SelectItem value="intermediate">Intermediário</SelectItem>
                          <SelectItem value="advanced">Avançado</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="duration_hours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duração (horas)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min={0}
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="draft">Rascunho</SelectItem>
                          <SelectItem value="published">Publicado</SelectItem>
                          <SelectItem value="archived">Arquivado</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Instructor Information */}
          <Card>
            <CardHeader>
              <CardTitle>Informações do Instrutor</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="instructor_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Instrutor</FormLabel>
                    <FormControl>
                      <Input placeholder="Digite o nome do instrutor" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="instructor_bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Biografia do Instrutor</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Biografia e experiência do instrutor"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Cover Image */}
          <Card>
            <CardHeader>
              <CardTitle>Imagem de Capa</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {imagePreview ? (
                  /* Mostrar imagem carregada */
                  <div className="relative">
                    <div className="w-full h-64 border rounded-lg overflow-hidden bg-muted/5">
                      <img
                        src={imagePreview}
                        alt="Preview da capa do curso"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="absolute top-2 right-2 flex gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => document.querySelector<HTMLInputElement>('input[type="file"]')?.click()}
                        disabled={isUploading}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Alterar
                      </Button>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={handleRemoveImage}
                        disabled={isUploading}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remover
                      </Button>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={isUploading}
                    />
                  </div>
                ) : (
                  /* Área de upload */
                  <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer border-muted-foreground/25 bg-muted/5 hover:border-primary/50 hover:bg-muted/10 transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        {isUploading ? (
                          <>
                            <div className="w-8 h-8 mb-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            <p className="text-sm text-foreground">Carregando imagem...</p>
                          </>
                        ) : (
                          <>
                            <Upload className="w-8 h-8 mb-4 text-muted-foreground" />
                            <p className="mb-2 text-sm text-foreground">
                              <span className="font-semibold">Clique para carregar</span> ou arraste
                            </p>
                            <p className="text-xs text-muted-foreground">PNG, JPG ou JPEG (MAX. 5MB)</p>
                          </>
                        )}
                      </div>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={isUploading}
                      />
                    </label>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tags */}
          <Card>
            <CardHeader>
              <CardTitle>Tags</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Digite uma tag"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTag())}
                />
                <Button type="button" onClick={handleAddTag} variant="outline">
                  Adicionar
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                    {tag}
                    <X 
                      className="w-3 h-3 cursor-pointer" 
                      onClick={() => handleRemoveTag(tag)}
                    />
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Módulos e Aulas - Só mostrar no modo de edição */}
          {mode === "edit" && courseId && (
            <Card>
              <CardHeader>
                <CardTitle>Conteúdo do Curso</CardTitle>
              </CardHeader>
              <CardContent>
                <CourseModuleManager courseId={courseId} />
              </CardContent>
            </Card>
          )}

          {/* Informação sobre módulos no modo de criação */}
          {mode === "create" && (
            <Card className="border-dashed">
              <CardContent className="pt-6">
                <div className="text-center p-6">
                  <div className="w-16 h-16 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                    <Plus className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Próximo Passo: Adicionar Conteúdo</h3>
                  <p className="text-muted-foreground">
                    Após criar o curso, você poderá organizar o conteúdo em módulos e adicionar aulas com vídeos do Vimeo.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => navigate("/courses")}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={createCourse.isPending || updateCourse.isPending}
              className="flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {mode === "create" ? "Criar Curso" : "Salvar Alterações"}
            </Button>
          </div>
        </form>
      </Form>

      {/* Dialog para criar nova categoria */}
      <CreateCategoryDialog
        open={isCreateCategoryOpen}
        onOpenChange={setIsCreateCategoryOpen}
        onCategoryCreated={handleCategoryCreated}
      />
    </div>
  );
}
