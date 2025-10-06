import { supabase } from "@/integrations/supabase/client";
import type {
  RMSBeneficiarioResponse,
  RMSBeneficiarioConsultaParams,
  RMSErrorResponse
} from "@/types/rms";

/**
 * Erro customizado para erros da API RMS
 */
export class RMSApiError extends Error {
  constructor(
    message: string,
    public code?: number,
    public statusCode?: number
  ) {
    super(message);
    this.name = 'RMSApiError';
  }
}

/**
 * Formatar data de YYYY-MM-DD para DD/MM/YYYY
 */
const formatarDataParaAPI = (data: string): string => {
  const [ano, mes, dia] = data.split('-');
  return `${dia}/${mes}/${ano}`;
};

/**
 * Buscar configurações da API RMS do banco de dados
 */
const buscarConfiguracoesRMS = async () => {
  const { data: settings, error } = await supabase
    .from('api_settings')
    .select('setting_name, setting_value')
    .in('setting_name', [
      'EXTERNAL_API_KEY',
      'EXTERNAL_API_CONSULTA_BENEFICIARIOS_URL',
      'ID_CLIENTE',
      'ID_CLIENTE_CONTRATO'
    ]);

  if (error) {
    throw new RMSApiError(
      'Erro ao buscar configurações da API RMS.',
      undefined,
      500
    );
  }

  const settingsMap = Object.fromEntries(
    (settings || []).map(s => [s.setting_name, s.setting_value])
  );

  const apiKey = settingsMap['EXTERNAL_API_KEY'];
  const apiUrl = settingsMap['EXTERNAL_API_CONSULTA_BENEFICIARIOS_URL'];
  const idCliente = settingsMap['ID_CLIENTE'];
  const idClienteContrato = settingsMap['ID_CLIENTE_CONTRATO'];

  if (!apiKey || !apiUrl) {
    throw new RMSApiError(
      'API Key ou URL de Consulta não configuradas.',
      undefined,
      500
    );
  }

  if (!idCliente || !idClienteContrato) {
    throw new RMSApiError(
      'ID Cliente ou ID Cliente Contrato não configurados.',
      undefined,
      500
    );
  }

  return {
    apiKey,
    apiUrl,
    idCliente: parseInt(idCliente),
    idClienteContrato: parseInt(idClienteContrato),
  };
};

/**
 * Traduzir mensagens de erro da API RMS
 */
const traduzirErroRMS = (error: RMSErrorResponse): string => {
  const mensagensErro: Record<number, string> = {
    1000: 'Campo obrigatório não foi preenchido',
    1003: 'Cliente inativo ou não existe na base RMS',
    1005: 'Contrato inativo ou não existe na base RMS',
    1010: 'CPF inválido',
    1034: 'Data inválida. Formato esperado: DD/MM/YYYY',
  };

  return mensagensErro[error.codigo] || error.mensagem || 'Erro desconhecido';
};

/**
 * Consultar beneficiários na API RMS
 *
 * @param params - Parâmetros de consulta (cpf, dataInicial, dataFinal, offset)
 * @returns Resposta paginada com lista de beneficiários
 */
export const consultarBeneficiarios = async (
  params: Omit<RMSBeneficiarioConsultaParams, 'idCliente' | 'idClienteContrato'>
): Promise<RMSBeneficiarioResponse> => {
  try {
    // Buscar configurações
    const config = await buscarConfiguracoesRMS();

    // Preparar parâmetros
    const queryParams: RMSBeneficiarioConsultaParams = {
      idCliente: config.idCliente,
      idClienteContrato: config.idClienteContrato,
      dataInicial: formatarDataParaAPI(params.dataInicial),
      dataFinal: formatarDataParaAPI(params.dataFinal),
      offset: params.offset || 0,
    };

    // Adicionar CPF se fornecido
    if (params.cpf && params.cpf.trim()) {
      queryParams.cpf = params.cpf.replace(/\D/g, ''); // Remover formatação
    }

    console.log('Consultando beneficiários RMS:', queryParams);
    console.log('API Key (primeiros 10 chars):', config.apiKey?.substring(0, 10) + '...');

    // Construir URL com query parameters
    const url = new URL(config.apiUrl);
    url.searchParams.append('idCliente', queryParams.idCliente.toString());
    url.searchParams.append('idClienteContrato', queryParams.idClienteContrato.toString());
    url.searchParams.append('dataInicial', queryParams.dataInicial);
    url.searchParams.append('dataFinal', queryParams.dataFinal);
    url.searchParams.append('offset', queryParams.offset.toString());

    if (queryParams.cpf) {
      url.searchParams.append('cpf', queryParams.cpf);
    }

    console.log('URL completa:', url.toString());

    // Fazer requisição à API RMS
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey,
      },
    });

    console.log('Response status:', response.status);

    const responseData = await response.json();

    // Tratamento de erros
    if (!response.ok) {
      let errorMessage = '';

      // Tratamento específico para erro 401 (Unauthorized)
      if (response.status === 401) {
        errorMessage = `Acesso negado (401): API Key inválida ou não autorizada para este ambiente.\n\nVerifique:\n• API Key está correta na tabela api_settings\n• API Key é para o ambiente correto (homologação/produção)\n• ID_CLIENTE (${queryParams.idCliente}) e ID_CLIENTE_CONTRATO (${queryParams.idClienteContrato}) estão corretos\n• Entre em contato com a RMS se o problema persistir`;
      } else if (responseData?.codigo) {
        errorMessage = traduzirErroRMS(responseData);
      } else {
        errorMessage = responseData?.mensagem || `Erro ${response.status}: ${response.statusText}`;
      }

      // Logar erro
      await supabase.functions.invoke('log-api-call', {
        body: {
          operation: 'consulta_beneficiarios',
          requestData: queryParams,
          responseData,
          status: 'error',
          errorMessage,
          httpStatus: response.status,
        }
      }).catch(console.error);

      throw new RMSApiError(
        errorMessage,
        responseData?.codigo,
        response.status
      );
    }

    // Logar sucesso
    await supabase.functions.invoke('log-api-call', {
      body: {
        operation: 'consulta_beneficiarios',
        requestData: queryParams,
        responseData: {
          offset: responseData.offset,
          limit: responseData.limit,
          count: responseData.count,
        },
        status: 'success',
      }
    }).catch(console.error);

    return responseData as RMSBeneficiarioResponse;

  } catch (error) {
    // Re-throw RMSApiError
    if (error instanceof RMSApiError) {
      throw error;
    }

    // Tratar outros erros
    const errorMessage = error instanceof Error
      ? error.message
      : 'Erro desconhecido ao consultar beneficiários';

    console.error('Erro ao consultar beneficiários RMS:', error);

    throw new RMSApiError(
      errorMessage.includes('Failed to fetch')
        ? 'Erro de conexão com a API RMS. Verifique a URL nas configurações.'
        : errorMessage,
      undefined,
      500
    );
  }
};

/**
 * Formatar CPF para exibição (000.000.000-00)
 */
export const formatarCPF = (cpf: string): string => {
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length !== 11) return cpf;
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

/**
 * Formatar telefone para exibição
 */
export const formatarTelefone = (telefone: string): string => {
  const cleaned = telefone.replace(/\D/g, '');
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  return telefone;
};

/**
 * Obter cor do badge baseado no status
 */
export const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    'ATIVO': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
    'CANCELADO': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    'SUSPENSO': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
  };
  return colors[status] || 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
};
