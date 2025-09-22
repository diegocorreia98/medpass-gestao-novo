import { useState } from "react";
import { Search, BookOpen, Play, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCourses } from "@/hooks/useCourses";
import { useNavigate } from "react-router-dom";

export function SimpleCourseLibrary() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: courses, isLoading } = useCourses();

  const filteredCourses = courses?.filter((course) => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const isPublished = course.status === "published";
    
    return matchesSearch && isPublished;
  });

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-48 bg-gray-200"></div>
              <CardContent className="p-4">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Biblioteca de Cursos</h1>
          <p className="text-muted-foreground">Explore e comece novos cursos de capacitação</p>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Buscar cursos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Course Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCourses?.map((course) => (
          <Card 
            key={course.id} 
            className="group hover:shadow-lg transition-all duration-200 cursor-pointer"
            onClick={() => navigate(`/learn/courses/${course.id}`)}
          >
            {/* Course Image */}
            <div className="relative h-48 bg-gray-100 overflow-hidden rounded-t-lg">
              {course.cover_image_url ? (
                <img
                  src={course.cover_image_url}
                  alt={course.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
                  <BookOpen className="w-12 h-12 text-blue-400" />
                </div>
              )}
              
              {/* Play Button Overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200 flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <div className="w-16 h-16 bg-white/90 rounded-full flex items-center justify-center">
                    <Play className="w-8 h-8 text-blue-600 ml-1" />
                  </div>
                </div>
              </div>

              {/* Duration */}
              <div className="absolute top-3 right-3 bg-black/70 text-white text-xs px-2 py-1 rounded">
                {course.duration_hours}h
              </div>
            </div>

            {/* Course Content */}
            <CardContent className="p-4">
              <div className="space-y-3">
                {/* Category */}
                {course.category && (
                  <Badge variant="outline" className="text-xs">
                    {course.category.name}
                  </Badge>
                )}

                {/* Title */}
                <h3 className="font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                  {course.title}
                </h3>

                {/* Description */}
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {course.description}
                </p>

                {/* Instructor */}
                {course.instructor_name && (
                  <p className="text-xs text-muted-foreground">
                    Por {course.instructor_name}
                  </p>
                )}

                {/* Stats */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{course.duration_hours}h</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <BookOpen className="w-3 h-3" />
                      <span>{course.modules?.length || 0} módulos</span>
                    </div>
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
              <BookOpen className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {searchTerm ? "Nenhum curso encontrado" : "Nenhum curso disponível"}
            </h3>
            <p className="text-muted-foreground">
              {searchTerm 
                ? "Tente ajustar sua busca para encontrar cursos."
                : "Não há cursos disponíveis no momento."
              }
            </p>
          </CardContent>
        </Card>
      )}

      {/* Course Stats Summary */}
      {filteredCourses && filteredCourses.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Mostrando {filteredCourses.length} de {courses?.length || 0} cursos
              </span>
              <span>
                Total: {courses?.reduce((acc, course) => acc + (course.duration_hours || 0), 0)}h de conteúdo
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
