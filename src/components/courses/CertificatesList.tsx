import { useState } from "react";
import { Download, Award, Calendar, Clock, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUserCertificates, useDownloadCertificate } from "@/hooks/useCertificates";

export function CertificatesList() {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState("newest");

  const { data: certificates, isLoading } = useUserCertificates();
  const downloadCertificate = useDownloadCertificate();

  const filteredCertificates = certificates?.filter((cert) =>
    cert.course_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cert.certificate_number.toLowerCase().includes(searchTerm.toLowerCase())
  )?.sort((a, b) => {
    switch (sortBy) {
      case "newest":
        return new Date(b.issued_at).getTime() - new Date(a.issued_at).getTime();
      case "oldest":
        return new Date(a.issued_at).getTime() - new Date(b.issued_at).getTime();
      case "course":
        return a.course_title.localeCompare(b.course_title);
      default:
        return 0;
    }
  });

  const handleDownload = (certificate: any) => {
    downloadCertificate.mutate(certificate);
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
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Meus Certificados</h1>
          <p className="text-muted-foreground">Visualize e baixe seus certificados de conclusão</p>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Buscar certificados..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full lg:w-48">
                  <SelectValue placeholder="Ordenar por" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Mais recentes</SelectItem>
                  <SelectItem value="oldest">Mais antigos</SelectItem>
                  <SelectItem value="course">Nome do curso</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Certificates Grid */}
      {filteredCertificates && filteredCertificates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCertificates.map((certificate) => (
            <Card 
              key={certificate.certificate_id} 
              className="group hover:shadow-lg transition-all duration-200"
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center">
                    <Award className="w-6 h-6 text-white" />
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {certificate.course_category || "Curso"}
                  </Badge>
                </div>
                <CardTitle className="text-lg line-clamp-2">
                  {certificate.course_title}
                </CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>Emitido em {new Date(certificate.issued_at).toLocaleDateString("pt-BR")}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    <span>{certificate.course_duration}h de duração</span>
                  </div>
                </div>

                <div className="border-t pt-3">
                  <p className="text-xs text-muted-foreground mb-3">
                    Certificado Nº: {certificate.certificate_number}
                  </p>
                  
                  <Button 
                    onClick={() => handleDownload(certificate)}
                    disabled={downloadCertificate.isPending}
                    className="w-full flex items-center gap-2"
                    variant="outline"
                  >
                    <Download className="w-4 h-4" />
                    Baixar Certificado
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* Empty State */
        <Card>
          <CardContent className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <Award className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {searchTerm ? "Nenhum certificado encontrado" : "Nenhum certificado ainda"}
            </h3>
            <p className="text-muted-foreground">
              {searchTerm 
                ? "Tente ajustar sua busca para encontrar certificados."
                : "Complete cursos para ganhar certificados de conclusão."
              }
            </p>
          </CardContent>
        </Card>
      )}

      {/* Summary */}
      {filteredCertificates && filteredCertificates.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {filteredCertificates.length} certificado{filteredCertificates.length !== 1 ? 's' : ''}
              </span>
              <span>
                Total: {filteredCertificates.reduce((acc, cert) => acc + cert.course_duration, 0)}h de cursos concluídos
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
