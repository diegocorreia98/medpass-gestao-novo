import { Database } from '@/integrations/supabase/types';

// Tipos baseados no schema do Supabase
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type InsertTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type UpdateTables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];

// Tipos específicos das entidades
export type Profile = Tables<'profiles'>;
export type Plano = Tables<'planos'>;
export type Unidade = Tables<'unidades'>;
export type Empresa = Tables<'empresas'>;
export type Beneficiario = Tables<'beneficiarios'>;
export type Cancelamento = Tables<'cancelamentos'>;
export type Comissao = Tables<'comissoes'>;
export type LogAtividade = Tables<'logs_atividades'>;
export type Orcamento = Tables<'orcamentos'>;
export type OrcamentoItem = Tables<'orcamentos_itens'>;
export type Franquia = Tables<'franquias'>;

// Tipos para inserção
export type PlanoInsert = InsertTables<'planos'>;
export type UnidadeInsert = InsertTables<'unidades'>;
export type EmpresaInsert = InsertTables<'empresas'>;
export type BeneficiarioInsert = InsertTables<'beneficiarios'>;
export type CancelamentoInsert = InsertTables<'cancelamentos'>;
export type ComissaoInsert = InsertTables<'comissoes'>;
export type LogAtividadeInsert = InsertTables<'logs_atividades'>;
export type OrcamentoInsert = InsertTables<'orcamentos'>;
export type OrcamentoItemInsert = InsertTables<'orcamentos_itens'>;
export type FranquiaInsert = InsertTables<'franquias'>;

// Tipos para atualização
export type PlanoUpdate = UpdateTables<'planos'>;
export type UnidadeUpdate = UpdateTables<'unidades'>;
export type BeneficiarioUpdate = UpdateTables<'beneficiarios'>;
export type ComissaoUpdate = UpdateTables<'comissoes'>;
export type FranquiaUpdate = UpdateTables<'franquias'>;

// Enums
export type StatusAtivo = 'ativo' | 'inativo' | 'pendente' | 'pending_payment' | 'payment_confirmed' | 'rms_sent' | 'rms_failed';
export type UserType = 'matriz' | 'unidade';

// Tipos extendidos com relacionamentos
export type BeneficiarioCompleto = Beneficiario & {
  plano?: Plano;
  unidade?: Unidade;
  empresa?: Empresa;
};

export type ComissaoCompleta = Comissao & {
  beneficiario?: Beneficiario;
  unidade?: Unidade;
};

// Tipos para métricas do dashboard
export type DashboardMetrics = {
  totalBeneficiarios: number;
  totalComissoes: number;
  beneficiariosAtivos: number;
  cancelamentosMes: number;
  comissoesPendentes: number;
  valorTotalComissoes: number;
};

// Enums para comissões
export type TipoComissao = 'adesao' | 'recorrente';

// Tipos para filtros
export type BeneficiarioFilters = {
  status?: StatusAtivo;
  planoId?: string;
  dataInicio?: string;
  dataFim?: string;
  cidade?: string;
  estado?: string;
  empresaId?: string;
};

export type ComissaoFilters = {
  mesReferencia?: string;
  pago?: boolean;
  unidadeId?: string;
  tipoComissao?: TipoComissao;
};