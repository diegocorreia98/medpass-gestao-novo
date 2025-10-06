import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Search, AlertCircle, FileSearch, ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { useRMSBeneficiarios } from "@/hooks/useRMSBeneficiarios";
import type { ConsultaBeneficiariosFilters, RMSBeneficiario } from "@/types/rms";
import {
  formatarCPF,
  formatarTelefone,
  getStatusColor,
} from "@/services/rms-consulta-beneficiarios";

export default function RMSConsultaBeneficiarios() {
  // Estado dos filtros
  const [filters, setFilters] = useState<ConsultaBeneficiariosFilters>({
    cpf: "",
    dataInicial: "",
    dataFinal: "",
  });

  // Estado de paginação
  const [currentOffset, setCurrentOffset] = useState(0);
  const ITEMS_PER_PAGE = 100;

  // Estado para controlar se deve fazer a busca
  const [shouldFetch, setShouldFetch] = useState(false);

  // Hook de consulta
  const { data, isLoading, error, isFetching } = useRMSBeneficiarios({
    filters,
    offset: currentOffset,
    enabled: shouldFetch && !!filters.dataInicial && !!filters.dataFinal,
  });

  // Beneficiário selecionado para detalhes
  const [selectedBeneficiario, setSelectedBeneficiario] = useState<RMSBeneficiario | null>(null);

  // Handlers
  const handleFilterChange = (field: keyof ConsultaBeneficiariosFilters, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleBuscar = () => {
    setCurrentOffset(0);
    setShouldFetch(true);
  };

  const handleLimparFiltros = () => {
    setFilters({
      cpf: "",
      dataInicial: "",
      dataFinal: "",
    });
    setCurrentOffset(0);
    setShouldFetch(false);
  };

  const handleProximaPagina = () => {
    if (data && currentOffset + ITEMS_PER_PAGE < data.count) {
      setCurrentOffset(prev => prev + ITEMS_PER_PAGE);
    }
  };

  const handlePaginaAnterior = () => {
    if (currentOffset > 0) {
      setCurrentOffset(prev => Math.max(0, prev - ITEMS_PER_PAGE));
    }
  };

  // Validação de formulário
  const isFormValid = filters.dataInicial && filters.dataFinal;
  const hasResults = data && data.beneficiarios.length > 0;
  const totalPages = data ? Math.ceil(data.count / ITEMS_PER_PAGE) : 0;
  const currentPage = Math.floor(currentOffset / ITEMS_PER_PAGE) + 1;

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Consulta de Beneficiários RMS</h1>
        <p className="text-muted-foreground">
          Consulte beneficiários cadastrados na Rede Mais Saúde
        </p>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros de Busca</CardTitle>
          <CardDescription>
            Preencha os campos abaixo para consultar beneficiários
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Data Inicial */}
              <div className="space-y-2">
                <Label htmlFor="dataInicial">
                  Data Inicial <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="dataInicial"
                  type="date"
                  value={filters.dataInicial}
                  onChange={(e) => handleFilterChange('dataInicial', e.target.value)}
                  required
                />
              </div>

              {/* Data Final */}
              <div className="space-y-2">
                <Label htmlFor="dataFinal">
                  Data Final <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="dataFinal"
                  type="date"
                  value={filters.dataFinal}
                  onChange={(e) => handleFilterChange('dataFinal', e.target.value)}
                  required
                />
              </div>

              {/* CPF (Opcional) */}
              <div className="space-y-2">
                <Label htmlFor="cpf">CPF (Opcional)</Label>
                <Input
                  id="cpf"
                  value={filters.cpf}
                  onChange={(e) => handleFilterChange('cpf', e.target.value)}
                  placeholder="000.000.000-00"
                  maxLength={14}
                />
              </div>
            </div>

            {/* Botões */}
            <div className="flex gap-2">
              <Button
                onClick={handleBuscar}
                disabled={!isFormValid || isLoading || isFetching}
              >
                <Search className="h-4 w-4 mr-2" />
                {isLoading || isFetching ? 'Buscando...' : 'Buscar'}
              </Button>
              <Button
                variant="outline"
                onClick={handleLimparFiltros}
                disabled={isLoading || isFetching}
              >
                Limpar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Erro */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="whitespace-pre-line">
            {error instanceof Error ? error.message : 'Erro ao consultar beneficiários'}
          </AlertDescription>
        </Alert>
      )}

      {/* Resultados */}
      {shouldFetch && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Resultados</CardTitle>
                {data && (
                  <CardDescription>
                    {data.count} beneficiário(s) encontrado(s)
                  </CardDescription>
                )}
              </div>

              {/* Paginação */}
              {data && data.count > ITEMS_PER_PAGE && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    Página {currentPage} de {totalPages}
                  </span>
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePaginaAnterior}
                      disabled={currentOffset === 0 || isFetching}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleProximaPagina}
                      disabled={currentOffset + ITEMS_PER_PAGE >= data.count || isFetching}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {/* Loading */}
            {isLoading && (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            )}

            {/* Empty State */}
            {!isLoading && !hasResults && !error && (
              <div className="text-center py-12">
                <FileSearch className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Nenhum beneficiário encontrado para os filtros selecionados
                </p>
              </div>
            )}

            {/* Tabela */}
            {hasResults && (
              <div className="relative">
                {isFetching && (
                  <div className="absolute inset-0 bg-background/50 flex items-center justify-center z-10">
                    <div className="text-sm text-muted-foreground">Carregando...</div>
                  </div>
                )}
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>CPF</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Plano</TableHead>
                        <TableHead>Data Adesão</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Celular</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.beneficiarios.map((beneficiario, index) => (
                        <TableRow key={`${beneficiario.cpf}-${index}`}>
                          <TableCell className="font-medium">
                            {beneficiario.beneficiario}
                          </TableCell>
                          <TableCell>{formatarCPF(beneficiario.cpf)}</TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(beneficiario.status)}>
                              {beneficiario.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {beneficiario.plano}
                          </TableCell>
                          <TableCell>{beneficiario.dataAdesao}</TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {beneficiario.email}
                          </TableCell>
                          <TableCell>{formatarTelefone(beneficiario.celular)}</TableCell>
                          <TableCell className="text-right">
                            <Sheet>
                              <SheetTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSelectedBeneficiario(beneficiario)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </SheetTrigger>
                              <SheetContent className="overflow-y-auto">
                                <SheetHeader>
                                  <SheetTitle>Detalhes do Beneficiário</SheetTitle>
                                  <SheetDescription>
                                    Informações completas do cadastro
                                  </SheetDescription>
                                </SheetHeader>

                                {selectedBeneficiario && (
                                  <div className="mt-6 space-y-6">
                                    {/* Dados Pessoais */}
                                    <div className="space-y-3">
                                      <h3 className="font-semibold text-sm">Dados Pessoais</h3>
                                      <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div>
                                          <span className="text-muted-foreground">Nome:</span>
                                          <p className="font-medium">{selectedBeneficiario.beneficiario}</p>
                                        </div>
                                        {selectedBeneficiario.nomeSocial && (
                                          <div>
                                            <span className="text-muted-foreground">Nome Social:</span>
                                            <p className="font-medium">{selectedBeneficiario.nomeSocial}</p>
                                          </div>
                                        )}
                                        <div>
                                          <span className="text-muted-foreground">CPF:</span>
                                          <p className="font-medium">{formatarCPF(selectedBeneficiario.cpf)}</p>
                                        </div>
                                        <div>
                                          <span className="text-muted-foreground">Data Nascimento:</span>
                                          <p className="font-medium">{selectedBeneficiario.dataNascimento}</p>
                                        </div>
                                        {selectedBeneficiario.sexo && (
                                          <div>
                                            <span className="text-muted-foreground">Sexo:</span>
                                            <p className="font-medium">
                                              {selectedBeneficiario.sexo === 'M' ? 'Masculino' : 'Feminino'}
                                            </p>
                                          </div>
                                        )}
                                        {selectedBeneficiario.estadoCivil && (
                                          <div>
                                            <span className="text-muted-foreground">Estado Civil:</span>
                                            <p className="font-medium">{selectedBeneficiario.estadoCivil}</p>
                                          </div>
                                        )}
                                        <div>
                                          <span className="text-muted-foreground">Código Externo:</span>
                                          <p className="font-medium">{selectedBeneficiario.codigoExterno}</p>
                                        </div>
                                        <div>
                                          <span className="text-muted-foreground">Tipo:</span>
                                          <p className="font-medium">
                                            {selectedBeneficiario.idBeneficiarioTipo === 1
                                              ? 'Titular'
                                              : selectedBeneficiario.idBeneficiarioTipo === 3
                                              ? 'Dependente'
                                              : 'Responsável Financeiro'}
                                          </p>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Contato */}
                                    <div className="space-y-3">
                                      <h3 className="font-semibold text-sm">Contato</h3>
                                      <div className="grid grid-cols-1 gap-3 text-sm">
                                        <div>
                                          <span className="text-muted-foreground">Email:</span>
                                          <p className="font-medium break-all">{selectedBeneficiario.email}</p>
                                        </div>
                                        <div>
                                          <span className="text-muted-foreground">Celular:</span>
                                          <p className="font-medium">{formatarTelefone(selectedBeneficiario.celular)}</p>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Endereço */}
                                    <div className="space-y-3">
                                      <h3 className="font-semibold text-sm">Endereço</h3>
                                      <div className="grid grid-cols-2 gap-3 text-sm">
                                        <div>
                                          <span className="text-muted-foreground">CEP:</span>
                                          <p className="font-medium">{selectedBeneficiario.cep}</p>
                                        </div>
                                        {selectedBeneficiario.logradouro && (
                                          <div className="col-span-2">
                                            <span className="text-muted-foreground">Logradouro:</span>
                                            <p className="font-medium">{selectedBeneficiario.logradouro}</p>
                                          </div>
                                        )}
                                        <div>
                                          <span className="text-muted-foreground">Número:</span>
                                          <p className="font-medium">{selectedBeneficiario.numero}</p>
                                        </div>
                                        {selectedBeneficiario.complemento && (
                                          <div>
                                            <span className="text-muted-foreground">Complemento:</span>
                                            <p className="font-medium">{selectedBeneficiario.complemento}</p>
                                          </div>
                                        )}
                                        {selectedBeneficiario.bairro && (
                                          <div>
                                            <span className="text-muted-foreground">Bairro:</span>
                                            <p className="font-medium">{selectedBeneficiario.bairro}</p>
                                          </div>
                                        )}
                                        {selectedBeneficiario.cidade && (
                                          <div>
                                            <span className="text-muted-foreground">Cidade:</span>
                                            <p className="font-medium">{selectedBeneficiario.cidade}</p>
                                          </div>
                                        )}
                                        <div>
                                          <span className="text-muted-foreground">UF:</span>
                                          <p className="font-medium">{selectedBeneficiario.uf}</p>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Plano */}
                                    <div className="space-y-3">
                                      <h3 className="font-semibold text-sm">Plano e Status</h3>
                                      <div className="grid grid-cols-1 gap-3 text-sm">
                                        <div>
                                          <span className="text-muted-foreground">Plano:</span>
                                          <p className="font-medium">{selectedBeneficiario.plano}</p>
                                        </div>
                                        <div>
                                          <span className="text-muted-foreground">Tipo de Plano:</span>
                                          <p className="font-medium">{selectedBeneficiario.tipoPlano}</p>
                                        </div>
                                        <div>
                                          <span className="text-muted-foreground">Status:</span>
                                          <div className="mt-1">
                                            <Badge className={getStatusColor(selectedBeneficiario.status)}>
                                              {selectedBeneficiario.status}
                                            </Badge>
                                          </div>
                                        </div>
                                        <div>
                                          <span className="text-muted-foreground">Data de Adesão:</span>
                                          <p className="font-medium">{selectedBeneficiario.dataAdesao}</p>
                                        </div>
                                        {selectedBeneficiario.dataCancelamento && (
                                          <div>
                                            <span className="text-muted-foreground">Data de Cancelamento:</span>
                                            <p className="font-medium">{selectedBeneficiario.dataCancelamento}</p>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {/* Vínculos */}
                                    {selectedBeneficiario.cpfTitular && (
                                      <div className="space-y-3">
                                        <h3 className="font-semibold text-sm">Vínculos</h3>
                                        <div className="text-sm">
                                          <span className="text-muted-foreground">CPF do Titular:</span>
                                          <p className="font-medium">{formatarCPF(selectedBeneficiario.cpfTitular)}</p>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </SheetContent>
                            </Sheet>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
