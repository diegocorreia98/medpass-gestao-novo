// Types para integração com API RMS
// Baseado na documentação: RMSAPI-CONSULTA-BENEFICIARIOS-V3.md

/**
 * Dados de um beneficiário retornado pela API RMS
 */
export interface RMSBeneficiario {
  idClienteContrato: number;
  idCliente: number;
  idBeneficiarioTipo: number;
  beneficiario: string;
  nomeSocial: string;
  codigoExterno: string;
  status: 'ATIVO' | 'CANCELADO' | 'SUSPENSO';
  tipoPlano: string;
  plano: string;
  dataAdesao: string;
  dataCancelamento: string | null;
  email: string;
  cpf: string;
  cpfTitular: string | null;
  celular: string;
  dataNascimento: string;
  sexo: 'M' | 'F' | '';
  estadoCivil: string;
  cep: string;
  logradouro: string | null;
  complemento: string | null;
  numero: string;
  bairro: string | null;
  cidade: string | null;
  uf: string;
}

/**
 * Resposta paginada da API RMS - Consulta de Beneficiários
 */
export interface RMSBeneficiarioResponse {
  offset: number;
  limit: number;
  count: number;
  beneficiarios: RMSBeneficiario[];
}

/**
 * Parâmetros para consulta de beneficiários
 */
export interface RMSBeneficiarioConsultaParams {
  idCliente: number;
  idClienteContrato: number;
  cpf?: string;
  dataInicial: string; // Formato: DD/MM/YYYY
  dataFinal: string;   // Formato: DD/MM/YYYY
  offset?: number;
}

/**
 * Códigos de erro retornados pela API RMS
 */
export enum RMSErrorCode {
  CAMPO_OBRIGATORIO = 1000,
  CLIENTE_INATIVO = 1003,
  CONTRATO_INATIVO = 1005,
  CPF_INVALIDO = 1010,
  DATA_INVALIDA = 1034,
}

/**
 * Resposta de erro da API RMS
 */
export interface RMSErrorResponse {
  codigo: RMSErrorCode;
  mensagem: string;
}

/**
 * Filtros para a interface de consulta
 */
export interface ConsultaBeneficiariosFilters {
  cpf: string;
  dataInicial: string; // Formato: YYYY-MM-DD (input date)
  dataFinal: string;   // Formato: YYYY-MM-DD (input date)
}
