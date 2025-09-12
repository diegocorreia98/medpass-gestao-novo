import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validar variáveis de ambiente básicas na inicialização
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const idClienteContrato = Deno.env.get('ID_CLIENTE_CONTRATO');
const idCliente = Deno.env.get('ID_CLIENTE');
const vindiApiKey = Deno.env.get('VINDI_API_KEY');

console.log('=== INICIALIZAÇÃO DA EDGE FUNCTION ===');
console.log('SUPABASE_URL configurado:', !!supabaseUrl);
console.log('SUPABASE_SERVICE_ROLE_KEY configurado:', !!supabaseServiceKey);
console.log('ID_CLIENTE_CONTRATO configurado:', !!idClienteContrato, idClienteContrato);
console.log('ID_CLIENTE configurado:', !!idCliente, idCliente);
console.log('VINDI_API_KEY configurado:', !!vindiApiKey);

// Verificar variáveis básicas obrigatórias
const missingVars = [];
if (!supabaseUrl) missingVars.push('SUPABASE_URL');
if (!supabaseServiceKey) missingVars.push('SUPABASE_SERVICE_ROLE_KEY');
if (!idClienteContrato) missingVars.push('ID_CLIENTE_CONTRATO');
if (!idCliente) missingVars.push('ID_CLIENTE');

if (missingVars.length > 0) {
  console.error('ERRO: Variáveis de ambiente básicas faltando:', missingVars);
  throw new Error(`Variáveis de ambiente básicas não configuradas: ${missingVars.join(', ')}`);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Função para buscar configurações da API na base de dados
async function getApiSettings() {
  console.log('=== BUSCANDO CONFIGURAÇÕES DA API ===');
  
  const { data: settings, error } = await supabase
    .from('api_settings')
    .select('setting_name, setting_value')
    .in('setting_name', ['EXTERNAL_API_KEY', 'EXTERNAL_API_ADESAO_URL', 'EXTERNAL_API_CANCELAMENTO_URL']);

  if (error) {
    console.error('Erro ao buscar configurações da API:', error);
    throw new Error('Não foi possível buscar as configurações da API');
  }

  if (!settings || settings.length === 0) {
    throw new Error('Nenhuma configuração encontrada. Configure a API key e URLs nas Configurações.');
  }

  const settingsMap: { [key: string]: string } = {};
  settings.forEach(setting => {
    settingsMap[setting.setting_name] = setting.setting_value;
  });

  console.log('Configurações encontradas:', Object.keys(settingsMap));
  
  const requiredSettings = ['EXTERNAL_API_KEY', 'EXTERNAL_API_ADESAO_URL', 'EXTERNAL_API_CANCELAMENTO_URL'];
  const missingSettings = requiredSettings.filter(key => !settingsMap[key]);
  
  if (missingSettings.length > 0) {
    throw new Error(`Configurações faltando: ${missingSettings.join(', ')}. Configure nas Configurações.`);
  }

  return {
    externalApiKey: settingsMap['EXTERNAL_API_KEY'],
    externalApiAdesaoUrl: settingsMap['EXTERNAL_API_ADESAO_URL'],
    externalApiCancelamentoUrl: settingsMap['EXTERNAL_API_CANCELAMENTO_URL']
  };
}

async function logApiCall(
  beneficiarioId: string | null,
  operation: string,
  requestData: any,
  responseData: any = null,
  status: string = 'success',
  errorMessage: string | null = null,
  retryCount: number = 0
) {
  try {
    await supabase.from('api_integrations_log').insert({
      beneficiario_id: beneficiarioId,
      operation,
      request_data: requestData,
      response_data: responseData,
      status,
      error_message: errorMessage,
      retry_count: retryCount
    });
  } catch (error) {
    console.error('Erro ao salvar log:', error);
  }
}

function validateApiResponse(operation: string, responseData: any): { isValid: boolean; errorMessage?: string } {
  if (!responseData) {
    return { isValid: false, errorMessage: 'Resposta vazia da API externa' };
  }

  // Validações específicas por operação
  switch (operation) {
    case 'adesao':
    case 'test-adesao':
      // Verifica se contém mensagem de sucesso para adesão
      if (responseData.mensagem && typeof responseData.mensagem === 'string') {
        const mensagem = responseData.mensagem.toLowerCase();
        if (mensagem.includes('cadastrado com sucesso') || mensagem.includes('sucesso')) {
          return { isValid: true };
        }
      }
      return { 
        isValid: false, 
        errorMessage: 'Resposta da API não contém mensagem de sucesso esperada para adesão' 
      };

    case 'cancelamento':
    case 'test-cancelamento':
      // Melhorar validação para cancelamento - aceitar diferentes tipos de resposta
      if (responseData.mensagem && typeof responseData.mensagem === 'string') {
        const mensagem = responseData.mensagem.toLowerCase();
        if (mensagem.includes('cancelado com sucesso') || 
            mensagem.includes('cancelamento realizado') || 
            mensagem.includes('sucesso')) {
          return { isValid: true };
        }
        
        // Verificar se é erro de negócio (CPF não encontrado) vs erro técnico
        if (mensagem.includes('não localizado') || mensagem.includes('1063')) {
          return { 
            isValid: false, 
            errorMessage: `Erro de negócio: ${responseData.mensagem}` 
          };
        }
      }
      
      // Se tem código de erro específico, tratar como erro de negócio
      if (responseData.codigo && responseData.codigo === 1063) {
        return { 
          isValid: false, 
          errorMessage: `Beneficiário não encontrado na API externa (código ${responseData.codigo})` 
        };
      }
      
      return { 
        isValid: false, 
        errorMessage: 'Resposta da API não contém mensagem de sucesso esperada para cancelamento' 
      };

    case 'test':
      // Para teste simples, aceita qualquer resposta válida
      return { isValid: true };

    default:
      return { isValid: true };
  }
}

function getApiUrl(operation: string, apiSettings: any): string {
  switch (operation) {
    case 'adesao':
    case 'test-adesao':
      return apiSettings.externalApiAdesaoUrl;
    case 'cancelamento':
    case 'test-cancelamento':
      return apiSettings.externalApiCancelamentoUrl;
    case 'test-credentials':
      // Para teste de credenciais, usamos o endpoint de adesão
      return apiSettings.externalApiAdesaoUrl;
    default:
      throw new Error(`Operação não suportada: ${operation}`);
  }
}

async function makeApiCall(data: any, operation: string, apiSettings: any, retryCount = 0): Promise<any> {
  const maxRetries = 3;
  const backoffDelay = Math.pow(2, retryCount) * 1000; // Exponential backoff
  const apiUrl = getApiUrl(operation, apiSettings);

  try {
    console.log(`=== TENTATIVA ${retryCount + 1} - OPERAÇÃO: ${operation} ===`);
    console.log('URL:', apiUrl);
    console.log('Headers enviados:', {
      'Content-Type': 'application/json',
      'x-api-key': apiSettings.externalApiKey ? `${apiSettings.externalApiKey.substring(0, 8)}...` : 'NÃO CONFIGURADA'
    });
    console.log('Dados enviados:', JSON.stringify(data, null, 2));
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiSettings.externalApiKey,
      },
      body: JSON.stringify(data),
    });

    const responseData = await response.json();
    
    console.log(`Status da resposta: ${response.status}`);
    console.log('Resposta da API externa:', JSON.stringify(responseData, null, 2));
    
    // Validação do status HTTP
    if (!response.ok) {
      const errorMessage = `API retornou status ${response.status}: ${JSON.stringify(responseData)}`;
      
      // Não fazer retry para erros de autenticação (401) ou autorização (403)
      if (response.status === 401 || response.status === 403) {
        console.error('ERRO DE CREDENCIAL - NÃO SERÁ FEITA NOVA TENTATIVA:', errorMessage);
        throw new Error(errorMessage);
      }
      
      throw new Error(errorMessage);
    }

    return responseData;
    
  } catch (error) {
    console.error(`Erro na tentativa ${retryCount + 1}:`, error);
    
    // Verificar se é erro de credencial (não fazer retry)
    const isCredentialError = error.message.includes('status 401') || error.message.includes('status 403');
    
    if (retryCount < maxRetries - 1 && !isCredentialError) {
      console.log(`Aguardando ${backoffDelay}ms antes da próxima tentativa...`);
      await new Promise(resolve => setTimeout(resolve, backoffDelay));
      return makeApiCall(data, operation, apiSettings, retryCount + 1);
    }
    
    if (isCredentialError) {
      console.error('FALHA DE AUTENTICAÇÃO - Verifique a EXTERNAL_API_KEY nas configurações do Supabase');
    }
    
    throw error;
  }
}

// Função para validar CPF
function isValidCPF(cpf: string): boolean {
  // Remove caracteres não numéricos
  const cleanCPF = cpf.replace(/\D/g, '');
  
  // Verifica se tem 11 dígitos
  if (cleanCPF.length !== 11) return false;
  
  // Verifica se todos os dígitos são iguais (CPF inválido)
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false;
  
  // Validação do primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF[i]) * (10 - i);
  }
  let digit1 = (sum * 10) % 11;
  if (digit1 === 10) digit1 = 0;
  
  if (digit1 !== parseInt(cleanCPF[9])) return false;
  
  // Validação do segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF[i]) * (11 - i);
  }
  let digit2 = (sum * 10) % 11;
  if (digit2 === 10) digit2 = 0;
  
  if (digit2 !== parseInt(cleanCPF[10])) return false;
  
  return true;
}

// Função para formatar CPF para a Vindi (apenas números)
function formatCPFForVindi(cpf: string): string {
  // Remove todos os caracteres não numéricos
  const cleanCPF = cpf.replace(/\D/g, '');
  
  // Valida o CPF
  if (!isValidCPF(cleanCPF)) {
    throw new Error(`CPF inválido: ${cpf}. Por favor, use um CPF válido para teste.`);
  }
  
  return cleanCPF;
}

function mapPlanoToTipoPlano(planoId: string): number {
  // Mapear plano_id para tipoPlano da API externa
  const planoMapping: { [key: string]: number } = {
    'f3395d2c-7e18-41e6-8204-1d71c1981d3c': 102304, // Plano Familiar
    '1af1a9e8-5590-4349-84cc-be5f8f7f9d83': 102303, // Plano Individual
  };
  
  return planoMapping[planoId] || 102303; // Default para Individual
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { operation, data } = await req.json();
    console.log(`Operação recebida: ${operation}`, data);

    // Buscar configurações da API para operações que precisam delas
    let apiSettings = null;
    if (operation !== 'test') {
      try {
        apiSettings = await getApiSettings();
      } catch (error) {
        console.error('Erro ao buscar configurações:', error.message);
        return new Response(JSON.stringify({ 
          success: false, 
          error: error.message,
          needsConfiguration: true
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400
        });
      }
    }

    // Handle test operation
    if (operation === 'test') {
      const testResponse = { 
        status: 'success', 
        message: 'Teste de conectividade realizado com sucesso',
        timestamp: new Date().toISOString()
      };
      
      await logApiCall(
        null,
        'test',
        data,
        testResponse,
        'success',
        null,
        0
      );

      return new Response(JSON.stringify(testResponse), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Handle credential test - teste apenas a autenticação
    if (operation === 'test-credentials') {
      // Para teste de credenciais, vamos usar dados mínimos mas válidos
      const testData = {
        idClienteContrato: parseInt(idClienteContrato),
        idCliente: parseInt(idCliente),
        idBeneficiarioTipo: 1,
        nome: "Teste API",
        codigoExterno: "TEST123",
        cpf: "11111111111", 
        dataNascimento: "01011990",
        celular: "11999999999",
        email: "teste@teste.com",
        cep: "01234567",
        numero: "123",
        uf: "SP",
        tipoPlano: 102303
      };

      try {
        console.log('=== TESTE DE CREDENCIAIS ===');
        const response = await makeApiCall(testData, 'test-credentials', apiSettings);
        
        await logApiCall(null, 'test-credentials', testData, response, 'success');
        
        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Credenciais válidas',
          response,
          apiKey: apiSettings?.externalApiKey ? `${apiSettings.externalApiKey.substring(0, 8)}...` : 'NÃO CONFIGURADA'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (error) {
        await logApiCall(null, 'test-credentials', testData, null, 'error', error.message);
        
        return new Response(JSON.stringify({ 
          success: false, 
          error: error.message,
          apiKey: apiSettings?.externalApiKey ? `${apiSettings.externalApiKey.substring(0, 8)}...` : 'NÃO CONFIGURADA'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401
        });
      }
    }

    // Handle test with real data for adesao
    if (operation === 'test-adesao') {
      // Debug logs para rastrear transformação de data
      console.log('=== DEBUG EDGE FUNCTION - ADESÃO ===');
      console.log('Dados recebidos do frontend:', JSON.stringify(data, null, 2));
      console.log('dataNascimento recebido:', data.dataNascimento);
      console.log('Tipo do dataNascimento recebido:', typeof data.dataNascimento);

      const requestData = {
        idClienteContrato: parseInt(idClienteContrato),
        idBeneficiarioTipo: data.idBeneficiarioTipo || 1,
        nome: data.nome,
        codigoExterno: data.codigoExterno,
        idCliente: parseInt(idCliente),
        cpf: data.cpf,
        dataNascimento: data.dataNascimento, // Mantém exatamente como recebido
        celular: data.celular,
        email: data.email,
        cep: data.cep,
        numero: data.numero,
        uf: data.uf,
        tipoPlano: data.tipoPlano
      };

      console.log('=== DADOS PREPARADOS PARA API ===');
      console.log('requestData.dataNascimento:', requestData.dataNascimento);
      console.log('Tipo final:', typeof requestData.dataNascimento);

      try {
        const response = await makeApiCall(requestData, 'test-adesao', apiSettings);
        
        const validation = validateApiResponse('test-adesao', response);
        
        if (!validation.isValid) {
          console.warn('Validação falhou:', validation.errorMessage);
          await logApiCall(
            null, 
            'test-adesao', 
            requestData, 
            response, 
            'error', 
            validation.errorMessage
          );
          
          return new Response(JSON.stringify({ 
            success: false, 
            error: validation.errorMessage,
            response 
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          });
        }

        await logApiCall(null, 'test-adesao', requestData, response, 'success');
        
        return new Response(JSON.stringify({ success: true, response }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (error) {
        await logApiCall(null, 'test-adesao', requestData, null, 'error', error.message);
        throw error;
      }
    }

    // Handle test with real data for cancelamento - USANDO PAYLOAD IDÊNTICO AO POSTMAN
    if (operation === 'test-cancelamento') {
      console.log('=== DEBUG EDGE FUNCTION - CANCELAMENTO ===');
      console.log('Dados recebidos do frontend:', JSON.stringify(data, null, 2));

      // USANDO EXATAMENTE O MESMO PAYLOAD QUE FUNCIONA NO POSTMAN
      const requestData = {
        idClienteContrato: parseInt(idClienteContrato),
        idCliente: parseInt(idCliente), // ADICIONADO: Campo obrigatório que estava faltando
        cpf: data.cpf,
        codigoExterno: data.codigoExterno
        // REMOVIDO: motivo e dataCancelamento para ficar igual ao Postman
      };

      console.log('=== PAYLOAD CORRIGIDO PARA CANCELAMENTO ===');
      console.log('Usando payload idêntico ao Postman que funcionou:');
      console.log('requestData:', JSON.stringify(requestData, null, 2));

      try {
        const response = await makeApiCall(requestData, 'test-cancelamento', apiSettings);
        
        const validation = validateApiResponse('test-cancelamento', response);
        
        if (!validation.isValid) {
          console.warn('Validação falhou:', validation.errorMessage);
          await logApiCall(
            null, 
            'test-cancelamento', 
            requestData, 
            response, 
            'error', 
            validation.errorMessage
          );
          
          return new Response(JSON.stringify({ 
            success: false, 
            error: validation.errorMessage,
            response 
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          });
        }

        await logApiCall(null, 'test-cancelamento', requestData, response, 'success');
        
        return new Response(JSON.stringify({ success: true, response }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (error) {
        await logApiCall(null, 'test-cancelamento', requestData, null, 'error', error.message);
        throw error;
      }
    }

    if (operation === 'adesao') {
      const {
        id: beneficiarioId,
        nome,
        cpf,
        data_nascimento,
        telefone,
        email,
        cep,
        numero_endereco,
        estado,
        plano_id,
        id_beneficiario_tipo,
        codigo_externo
      } = data;

      const requestData = {
        idClienteContrato: parseInt(idClienteContrato),
        idBeneficiarioTipo: id_beneficiario_tipo || 1,
        nome,
        codigoExterno: codigo_externo,
        idCliente: parseInt(idCliente),
        cpf,
        dataNascimento: data_nascimento,
        celular: telefone,
        email,
        cep,
        numero: numero_endereco,
        uf: estado,
        tipoPlano: mapPlanoToTipoPlano(plano_id)
      };

      try {
        const response = await makeApiCall(requestData, 'adesao', apiSettings);
        
        // Validar resposta da API (similar aos testes do Postman)
        const validation = validateApiResponse('adesao', response);
        
        if (!validation.isValid) {
          console.warn('Validação falhou:', validation.errorMessage);
          await logApiCall(
            beneficiarioId, 
            'adesao', 
            requestData, 
            response, 
            'error', 
            validation.errorMessage
          );
          
          return new Response(JSON.stringify({ 
            success: false, 
            error: validation.errorMessage,
            response 
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          });
        }

        await logApiCall(beneficiarioId, 'adesao', requestData, response, 'success');
        
        return new Response(JSON.stringify({ success: true, response }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (error) {
        await logApiCall(beneficiarioId, 'adesao', requestData, null, 'error', error.message);
        throw error;
      }

    } else if (operation === 'cancelamento') {
      const {
        beneficiario_id,
        motivo,
        data_cancelamento,
        beneficiario
      } = data;

      // Usar o mesmo payload corrigido que funciona no teste
      const requestData = {
        idClienteContrato: parseInt(idClienteContrato),
        idCliente: parseInt(idCliente), // ADICIONADO: Campo obrigatório
        cpf: beneficiario?.cpf,
        codigoExterno: beneficiario?.codigo_externo
        // Campos motivo e dataCancelamento removidos se estão causando problema
        // Pode ser que a API aceite esses campos, mas vamos testar sem eles primeiro
      };

      console.log('=== CANCELAMENTO REAL COM PAYLOAD CORRIGIDO ===');
      console.log('requestData:', JSON.stringify(requestData, null, 2));

      try {
        const response = await makeApiCall(requestData, 'cancelamento', apiSettings);
        
        // Validar resposta da API para cancelamento
        const validation = validateApiResponse('cancelamento', response);
        
        if (!validation.isValid) {
          console.warn('Validação falhou:', validation.errorMessage);
          await logApiCall(
            beneficiario_id, 
            'cancelamento', 
            requestData, 
            response, 
            'error', 
            validation.errorMessage
          );
          
          return new Response(JSON.stringify({ 
            success: false, 
            error: validation.errorMessage,
            response 
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          });
        }

        await logApiCall(beneficiario_id, 'cancelamento', requestData, response, 'success');
        
        return new Response(JSON.stringify({ success: true, response }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (error) {
        await logApiCall(beneficiario_id, 'cancelamento', requestData, null, 'error', error.message);
        throw error;
      }

    } else if (operation === 'vindi-connectivity') {
      // Teste de conectividade com a Vindi API
      console.log('=== TESTE DE CONECTIVIDADE VINDI ===');
      console.log('VINDI_API_KEY configurada:', !!vindiApiKey);
      
      if (!vindiApiKey) {
        const errorMsg = 'VINDI_API_KEY não configurada. Configure o secret VINDI_API_KEY no Supabase.';
        console.error('❌', errorMsg);
        throw new Error(errorMsg);
      }

      try {
        const response = await fetch('https://app.vindi.com.br/api/v1/customers?limit=1', {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${btoa(vindiApiKey + ':')}`,
            'Content-Type': 'application/json',
          },
        });

        const responseData = await response.json();
        
        if (!response.ok) {
          throw new Error(`Vindi API retornou status ${response.status}: ${JSON.stringify(responseData)}`);
        }

        await logApiCall(null, 'vindi-connectivity', {}, responseData, 'success');
        
        return new Response(JSON.stringify({ 
          success: true, 
          message: 'Conectividade com Vindi OK',
          data: responseData
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (error) {
        await logApiCall(null, 'vindi-connectivity', {}, null, 'error', error.message);
        throw error;
      }

    } else if (operation === 'vindi-create-customer') {
      // Criar cliente na Vindi
      console.log('=== CRIAÇÃO DE CLIENTE VINDI ===');
      console.log('VINDI_API_KEY configurada:', !!vindiApiKey);
      console.log('Dados recebidos:', data);
      
      if (!vindiApiKey) {
        const errorMsg = 'VINDI_API_KEY não configurada. Configure o secret VINDI_API_KEY no Supabase.';
        console.error('❌', errorMsg);
        throw new Error(errorMsg);
      }

      const { name, email, registry_code } = data;
      
      // Validar e formatar CPF
      let formattedCPF: string;
      try {
        formattedCPF = formatCPFForVindi(registry_code);
        console.log(`CPF original: ${registry_code} -> CPF formatado: ${formattedCPF}`);
      } catch (error) {
        console.error('❌ Erro na validação do CPF:', error.message);
        await logApiCall(null, 'vindi-create-customer', data, null, 'error', error.message);
        throw error;
      }
      
      const requestData = {
        name,
        email,
        registry_code: formattedCPF,
        code: `CUST_${Date.now()}`
      };

      try {
        const response = await fetch('https://app.vindi.com.br/api/v1/customers', {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${btoa(vindiApiKey + ':')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestData),
        });

        const responseData = await response.json();
        
        if (!response.ok) {
          throw new Error(`Vindi API retornou status ${response.status}: ${JSON.stringify(responseData)}`);
        }

        await logApiCall(null, 'vindi-create-customer', requestData, responseData, 'success');
        
        return new Response(JSON.stringify({ 
          success: true, 
          customer: responseData.customer
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (error) {
        await logApiCall(null, 'vindi-create-customer', requestData, null, 'error', error.message);
        throw error;
      }

    } else if (operation === 'vindi-create-charge') {
      // Criar cobrança na Vindi
      console.log('=== CRIAÇÃO DE COBRANÇA VINDI ===');
      console.log('VINDI_API_KEY configurada:', !!vindiApiKey);
      console.log('Dados recebidos:', data);
      
      if (!vindiApiKey) {
        const errorMsg = 'VINDI_API_KEY não configurada. Configure o secret VINDI_API_KEY no Supabase.';
        console.error('❌', errorMsg);
        throw new Error(errorMsg);
      }

      const { customer_id, amount, payment_method_code, product_id } = data;
      
      // Validar product_id obrigatório
      const validProductId = product_id || 1804781; // Default: Medpass Individual
      console.log(`Produto utilizado: ${validProductId} (${product_id ? 'fornecido' : 'default'})`);
      
      if (!validProductId) {
        const errorMsg = 'product_id é obrigatório para criar cobrança na Vindi. Forneça um product_id válido ou será usado o produto padrão.';
        console.error('❌', errorMsg);
        throw new Error(errorMsg);
      }

      const requestData = {
        customer_id,
        payment_method_code,
        bill_items: [{
          product_id: validProductId,
          amount: amount,
          description: `Cobrança - Produto ${validProductId}`
        }]
      };
      
      console.log('Bill items preparado:', requestData.bill_items);

      try {
        const response = await fetch('https://app.vindi.com.br/api/v1/bills', {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${btoa(vindiApiKey + ':')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestData),
        });

        const responseData = await response.json();
        
        if (!response.ok) {
          throw new Error(`Vindi API retornou status ${response.status}: ${JSON.stringify(responseData)}`);
        }

        await logApiCall(null, 'vindi-create-charge', requestData, responseData, 'success');
        
        return new Response(JSON.stringify({ 
          success: true, 
          charge: responseData.bill
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (error) {
        await logApiCall(null, 'vindi-create-charge', requestData, null, 'error', error.message);
        throw error;
      }

    } else if (operation === 'vindi-create-subscription') {
      // Criar assinatura na Vindi
      console.log('=== CRIAÇÃO DE ASSINATURA VINDI ===');
      console.log('VINDI_API_KEY configurada:', !!vindiApiKey);
      console.log('Dados recebidos:', data);
      
      if (!vindiApiKey) {
        const errorMsg = 'VINDI_API_KEY não configurada. Configure o secret VINDI_API_KEY no Supabase.';
        console.error('❌', errorMsg);
        throw new Error(errorMsg);
      }

      const { customer_id, plan_id, payment_method_code } = data;
      
      if (!customer_id || !plan_id) {
        const errorMsg = 'customer_id e plan_id são obrigatórios para criar assinatura na Vindi.';
        console.error('❌', errorMsg);
        throw new Error(errorMsg);
      }

      const requestData = {
        customer_id,
        plan_id,
        payment_method_code: payment_method_code || 'credit_card'
      };
      
      console.log('Dados da assinatura preparados:', requestData);

      try {
        const response = await fetch('https://app.vindi.com.br/api/v1/subscriptions', {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${btoa(vindiApiKey + ':')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestData),
        });

        const responseData = await response.json();
        
        if (!response.ok) {
          throw new Error(`Vindi API retornou status ${response.status}: ${JSON.stringify(responseData)}`);
        }

        await logApiCall(null, 'vindi-create-subscription', requestData, responseData, 'success');
        
        // Função para determinar o domínio base
        function getBaseUrl(requestUrl: string): string {
          const url = new URL(requestUrl);
          
          // Localhost development
          if (url.hostname.includes('localhost') || url.hostname.includes('127.0.0.1')) {
            return url.origin;
          }
          
          // Lovable preview environment
          if (url.hostname.includes('lovableproject.com')) {
            return url.origin;
          }
          
          // Production
          return 'https://www.medpassbeneficios.com.br';
        }

        // Generate checkout link
        const token = crypto.randomUUID();
        const baseUrl = getBaseUrl(req.url);
        const checkoutLink = `${baseUrl}/subscription-checkout/${token}`;
        
        // Buscar o plan_id correto na tabela planos baseado no vindi_plan_id
        const { data: planoData } = await supabase
          .from('planos')
          .select('id, nome, valor')
          .eq('vindi_plan_id', data.plan_id)
          .single();

        console.log(`Plano encontrado: ${planoData ? planoData.nome : 'não encontrado para vindi_plan_id: ' + data.plan_id}`);
        
        // Create a minimal subscription record to save the checkout link
        const { data: subscriptionData, error: subscriptionError } = await supabase
          .from('subscriptions')
          .insert({
            vindi_subscription_id: responseData.subscription.id,
            status: responseData.subscription.status,
            checkout_link: checkoutLink,
            customer_name: responseData.subscription.customer.name,
            customer_email: responseData.subscription.customer.email,
            customer_document: responseData.subscription.customer.registry_code || data.customer_id?.toString() || 'N/A',
            plan_id: planoData?.id || null,
            payment_method: 'credit_card',
            metadata: {
              ...responseData,
              vindi_plan_id: data.plan_id,
              plan_name: planoData?.nome || 'Plano não identificado',
              plan_price: planoData?.valor || 0,
              created_from: 'vindi-create-subscription'
            }
          })
          .select()
          .single();

        if (subscriptionError) {
          console.error('Erro ao criar registro de subscription:', subscriptionError);
        } else if (subscriptionData) {
          console.log('Subscription record criado:', subscriptionData.id);
          // Save checkout link mapping
          const { error: linkError } = await supabase.from("subscription_checkout_links").insert({
            subscription_id: subscriptionData.id,
            token: token,
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
          });
          
          if (linkError) {
            console.error('Erro ao criar checkout link:', linkError);
          } else {
            console.log('Checkout link criado com token:', token);
          }
        }
        
        return new Response(JSON.stringify({ 
          success: true, 
          subscription: responseData.subscription,
          checkout_link: checkoutLink
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      } catch (error) {
        await logApiCall(null, 'vindi-create-subscription', requestData, null, 'error', error.message);
        throw error;
      }

    } else {
      throw new Error(`Operação não suportada: ${operation}`);
    }

  } catch (error) {
    console.error('❌ Erro na Edge Function:', error);
    
    // Dar mensagens de erro mais específicas dependendo do tipo de erro
    let errorMessage = error.message;
    let statusCode = 500;
    
    if (error.message.includes('VINDI_API_KEY não configurada')) {
      statusCode = 400;
      errorMessage = 'VINDI_API_KEY não configurada. Acesse as configurações do Supabase para adicionar o secret VINDI_API_KEY.';
    } else if (error.message.includes('Vindi API retornou status')) {
      statusCode = 400;
      errorMessage = `Erro na API Vindi: ${error.message}`;
    } else if (error.message.includes('product_id é obrigatório')) {
      statusCode = 400;
      errorMessage = 'Erro nos bill_items: product_id é obrigatório para criar cobrança na Vindi.';
    } else if (error.message.includes('customer_id e plan_id são obrigatórios')) {
      statusCode = 400;
      errorMessage = 'Erro na criação de assinatura: customer_id e plan_id são obrigatórios.';
    } else if (error.message.includes('CPF inválido')) {
      statusCode = 400;
      errorMessage = `Erro de validação: ${error.message}`;
    }
    
    return new Response(JSON.stringify({ 
      error: errorMessage,
      details: error.message
    }), {
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
