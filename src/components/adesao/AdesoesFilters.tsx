import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Search, X, ChevronDown, ChevronUp } from "lucide-react";
import { usePlanos } from "@/hooks/usePlanos";
import { useUnidades } from "@/hooks/useUnidades";
import { useAuth } from "@/contexts/AuthContext";

export interface AdesoesFilterValues {
  searchTerm: string;
  status: string;
  paymentStatus: string;
  planoId: string;
  unidadeId: string;
  dataInicio: string;
  dataFim: string;
  telefone: string;
  cep: string;
  cidade: string;
  estado: string;
  hasCheckoutLink: string;
  dataNascimentoInicio: string;
  dataNascimentoFim: string;
}

interface AdesoesFiltersProps {
  filters: AdesoesFilterValues;
  onFiltersChange: (filters: AdesoesFilterValues) => void;
  resultCount: number;
}

export function AdesoesFilters({ filters, onFiltersChange, resultCount }: AdesoesFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { planos } = usePlanos();
  const { unidades } = useUnidades();
  const { profile } = useAuth();

  const handleFilterChange = (key: keyof AdesoesFilterValues, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const handleClearFilters = () => {
    onFiltersChange({
      searchTerm: "",
      status: "all",
      paymentStatus: "all",
      planoId: "all",
      unidadeId: "all",
      dataInicio: "",
      dataFim: "",
      telefone: "",
      cep: "",
      cidade: "",
      estado: "all",
      hasCheckoutLink: "all",
      dataNascimentoInicio: "",
      dataNascimentoFim: ""
    });
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== "" && value !== "all");

  // Estados brasileiros
  const estados = [
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
    "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
    "RS", "RO", "RR", "SC", "SP", "SE", "TO"
  ];

  return (
    <Card className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Search className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">Filtros</h3>
          <span className="text-sm text-muted-foreground">
            ({resultCount} {resultCount === 1 ? 'resultado' : 'resultados'})
          </span>
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              className="h-8"
            >
              <X className="h-4 w-4 mr-1" />
              Limpar
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-8"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4 mr-1" />
                Recolher
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4 mr-1" />
                Expandir
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Search Bar - Always visible */}
      <div className="space-y-2">
        <Label htmlFor="search">Buscar por Nome, CPF ou Email</Label>
        <Input
          id="search"
          placeholder="Digite para buscar..."
          value={filters.searchTerm}
          onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
          className="w-full"
        />
      </div>

      {/* Filters Grid - Collapsible */}
      {isExpanded && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pt-2 border-t">
        {/* DADOS PESSOAIS */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">DADOS PESSOAIS</Label>
        </div>

        {/* Telefone */}
        <div className="space-y-2">
          <Label htmlFor="telefone">Telefone</Label>
          <Input
            id="telefone"
            placeholder="Telefone..."
            value={filters.telefone}
            onChange={(e) => handleFilterChange('telefone', e.target.value)}
          />
        </div>

        {/* Data Nascimento Início */}
        <div className="space-y-2">
          <Label htmlFor="dataNascimentoInicio">Nasc. De</Label>
          <Input
            id="dataNascimentoInicio"
            type="date"
            value={filters.dataNascimentoInicio}
            onChange={(e) => handleFilterChange('dataNascimentoInicio', e.target.value)}
          />
        </div>

        {/* Data Nascimento Fim */}
        <div className="space-y-2">
          <Label htmlFor="dataNascimentoFim">Nasc. Até</Label>
          <Input
            id="dataNascimentoFim"
            type="date"
            value={filters.dataNascimentoFim}
            onChange={(e) => handleFilterChange('dataNascimentoFim', e.target.value)}
          />
        </div>

        {/* LOCALIZAÇÃO */}
        <div className="space-y-2 col-span-full">
          <Label className="text-xs text-muted-foreground">LOCALIZAÇÃO</Label>
        </div>

        {/* CEP */}
        <div className="space-y-2">
          <Label htmlFor="cep">CEP</Label>
          <Input
            id="cep"
            placeholder="CEP..."
            value={filters.cep}
            onChange={(e) => handleFilterChange('cep', e.target.value)}
          />
        </div>

        {/* Cidade */}
        <div className="space-y-2">
          <Label htmlFor="cidade">Cidade</Label>
          <Input
            id="cidade"
            placeholder="Cidade..."
            value={filters.cidade}
            onChange={(e) => handleFilterChange('cidade', e.target.value)}
          />
        </div>

        {/* Estado */}
        <div className="space-y-2">
          <Label htmlFor="estado">Estado</Label>
          <Select
            value={filters.estado}
            onValueChange={(value) => handleFilterChange('estado', value)}
          >
            <SelectTrigger id="estado">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {estados.map((uf) => (
                <SelectItem key={uf} value={uf}>
                  {uf}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* COMERCIAL */}
        <div className="space-y-2 col-span-full">
          <Label className="text-xs text-muted-foreground">COMERCIAL</Label>
        </div>

        {/* Plano */}
        <div className="space-y-2">
          <Label htmlFor="plano">Plano</Label>
          <Select
            value={filters.planoId}
            onValueChange={(value) => handleFilterChange('planoId', value)}
          >
            <SelectTrigger id="plano">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {planos.map((plano) => (
                <SelectItem key={plano.id} value={plano.id}>
                  {plano.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Unidade - Only for matriz users */}
        {profile?.user_type === 'matriz' && (
          <div className="space-y-2">
            <Label htmlFor="unidade">Unidade</Label>
            <Select
              value={filters.unidadeId}
              onValueChange={(value) => handleFilterChange('unidadeId', value)}
            >
              <SelectTrigger id="unidade">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {unidades.map((unidade) => (
                  <SelectItem key={unidade.id} value={unidade.id}>
                    {unidade.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Data Adesão Início */}
        <div className="space-y-2">
          <Label htmlFor="dataInicio">Adesão De</Label>
          <Input
            id="dataInicio"
            type="date"
            value={filters.dataInicio}
            onChange={(e) => handleFilterChange('dataInicio', e.target.value)}
          />
        </div>

        {/* Data Adesão Fim */}
        <div className="space-y-2">
          <Label htmlFor="dataFim">Adesão Até</Label>
          <Input
            id="dataFim"
            type="date"
            value={filters.dataFim}
            onChange={(e) => handleFilterChange('dataFim', e.target.value)}
          />
        </div>

        {/* STATUS */}
        <div className="space-y-2 col-span-full">
          <Label className="text-xs text-muted-foreground">STATUS</Label>
        </div>

        {/* Status */}
        <div className="space-y-2">
          <Label htmlFor="status">Status Adesão</Label>
          <Select
            value={filters.status}
            onValueChange={(value) => handleFilterChange('status', value)}
          >
            <SelectTrigger id="status">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="inativo">Inativo</SelectItem>
              <SelectItem value="pendente">Pendente</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Payment Status */}
        <div className="space-y-2">
          <Label htmlFor="paymentStatus">Status Pagamento</Label>
          <Select
            value={filters.paymentStatus}
            onValueChange={(value) => handleFilterChange('paymentStatus', value)}
          >
            <SelectTrigger id="paymentStatus">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="paid">Pago</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="failed">Falhou</SelectItem>
              <SelectItem value="not_requested">Não Solicitado</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Checkout Link */}
        <div className="space-y-2">
          <Label htmlFor="hasCheckoutLink">Link Checkout</Label>
          <Select
            value={filters.hasCheckoutLink}
            onValueChange={(value) => handleFilterChange('hasCheckoutLink', value)}
          >
            <SelectTrigger id="hasCheckoutLink">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="yes">Com Link</SelectItem>
              <SelectItem value="no">Sem Link</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      )}
    </Card>
  );
}
