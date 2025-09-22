import { useState } from "react";
import { Plus, Search, Filter, Edit, Trash2, Eye, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCourses, useDeleteCourse } from "@/hooks/useCourses";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export function CourseList() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  
  const { data: courses, isLoading } = useCourses();
  const deleteCourse = useDeleteCourse();

  const filteredCourses = courses?.filter((course) => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || course.category_id === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleDeleteCourse = async (courseId: string, title: string) => {
    if (window.confirm(`Tem certeza que deseja deletar o curso "${title}"?`)) {
      try {
        await deleteCourse.mutateAsync(courseId);
      } catch (error) {
        console.error("Erro ao deletar curso:", error);
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "published":
        return "bg-green-100 text-green-800";
      case "draft":
        return "bg-yellow-100 text-yellow-800";
      case "archived":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "published":
        return "Publicado";
      case "draft":
        return "Rascunho";
      case "archived":
        return "Arquivado";
      default:
        return status;
    }
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cursos</h1>
          <p className="text-muted-foreground">Gerencie os cursos disponíveis para as unidades</p>
        </div>
        <Button onClick={() => navigate("/courses/new")} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Novo Curso
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar cursos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  Filtros
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => setSelectedCategory("")}>
                  Todas as categorias
                </DropdownMenuItem>
                {/* TODO: Add categories filter */}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* Course List */}
      <div className="grid gap-6">
        {filteredCourses?.map((course) => (
          <Card key={course.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row gap-6">
                {/* Course Image */}
                <div className="lg:w-48 h-32 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                  {course.cover_image_url ? (
                    <img
                      src={course.cover_image_url}
                      alt={course.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <div className="text-center">
                        <div className="w-8 h-8 mx-auto mb-2 rounded bg-gray-200"></div>
                        <span className="text-xs">Sem imagem</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Course Info */}
                <div className="flex-1 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground mb-1">
                        {course.title}
                      </h3>
                      <p className="text-muted-foreground text-sm line-clamp-2">
                        {course.description}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => navigate(`/courses/${course.id}`)}>
                          <Eye className="w-4 h-4 mr-2" />
                          Visualizar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate(`/courses/${course.id}/edit`)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDeleteCourse(course.id, course.title)}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Deletar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      <span>0 estudantes</span>
                    </div>
                    <span>•</span>
                    <span>{course.duration_hours}h de duração</span>
                    <span>•</span>
                    <span>Nível {course.level}</span>
                    {course.instructor_name && (
                      <>
                        <span>•</span>
                        <span>Por {course.instructor_name}</span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(course.status)}>
                        {getStatusLabel(course.status)}
                      </Badge>
                      {course.category && (
                        <Badge 
                          variant="outline" 
                          style={{ borderColor: course.category.color, color: course.category.color }}
                        >
                          {course.category.name}
                        </Badge>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Criado em {new Date(course.created_at).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredCourses?.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <Plus className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Nenhum curso encontrado
            </h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || selectedCategory 
                ? "Tente ajustar os filtros para encontrar cursos."
                : "Comece criando seu primeiro curso."
              }
            </p>
            {!searchTerm && !selectedCategory && (
              <Button onClick={() => navigate("/courses/new")}>
                Criar Primeiro Curso
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
