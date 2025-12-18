import { useState } from "react";
import { FileSignature, FileCheck, Clock, FileX, Files, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ContratosFilters, ContratosDataTable } from "@/components/contratos";
import { useContratos, ContratosFilters as FilterType } from "@/hooks/useContratos";

export default function Contratos() {
  const [filters, setFilters] = useState<FilterType>({});
  
  const {
    contratos,
    stats,
    isLoading,
    refetch,
    resendContract,
    isResending,
    openSignatureLink,
    downloadPdf,
  } = useContratos(filters);

  const statsCards = [
    {
      title: "Total de Contratos",
      value: stats.total,
      icon: Files,
      description: "Contratos gerados",
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Pendentes",
      value: stats.pending,
      icon: Clock,
      description: "Aguardando assinatura",
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
    },
    {
      title: "Assinados",
      value: stats.signed,
      icon: FileCheck,
      description: "Contratos finalizados",
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: "Recusados",
      value: stats.refused,
      icon: FileX,
      description: "Contratos rejeitados",
      color: "text-red-500",
      bgColor: "bg-red-500/10",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <FileSignature className="h-8 w-8 text-primary" />
            Gestão de Contratos
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie todos os contratos de adesão gerados via Autentique
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => refetch()}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters & Table */}
      <Card>
        <CardHeader>
          <CardTitle>Contratos</CardTitle>
          <CardDescription>
            Lista de todos os contratos gerados no sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ContratosFilters
            filters={filters}
            onFiltersChange={setFilters}
          />
          
          <ContratosDataTable
            contratos={contratos}
            isLoading={isLoading}
            onOpenSignatureLink={openSignatureLink}
            onResend={resendContract}
            onDownloadPdf={downloadPdf}
            isResending={isResending}
          />
        </CardContent>
      </Card>
    </div>
  );
}

