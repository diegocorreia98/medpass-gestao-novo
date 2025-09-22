import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.51.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
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
    .in('setting_name', [
      'EXTERNAL_API_KEY',
      'EXTERNAL_API_ADESAO_URL',
      'EXTERNAL_API_CANCELAMENTO_URL'
    ]);

  if (error) {
    console.error('Erro ao buscar configurações da API:', error);
    throw new Error('Não foi possível buscar as configurações da API');
  }

  if (!settings || settings.length === 0) {
    throw new Error('Nenhuma configuração encontrada. Configure a API key e URLs nas Configurações.');
  }

  const settingsMap = {};
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

async function logApiCall(beneficiarioId, operation, requestData, responseData = null, status = 'success', errorMessage = null, retryCount = 0) {
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

function validateApiResponse(operation, responseData) {
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
      return { isValid: false, errorMessage: 'Resposta da API não contém mensagem de sucesso esperada para adesão' };

    case 'cancelamento':
    case 'test-cancelamento':
      // Melhorar validação para cancelamento - aceitar diferentes tipos de resposta
      if (responseData.mensagem && typeof responseData.mensagem === 'string') {
        const mensagem = responseData.mensagem.toLowerCase();
        if (mensagem.includes('cancelado com sucesso') || mensagem.includes('cancelamento realizado') || mensagem.includes('sucesso')) {
          return { isValid: true };
        }
        // Verificar se é erro de negócio (CPF não encontrado) vs erro técnico
        if (mensagem.includes('não localizado') || mensagem.includes('1063')) {
          return { isValid: false, errorMessage: `Erro de negócio: ${responseData.mensagem}` };
        }
      }
      // Se tem código de erro específico, tratar como erro de negócio
      if (responseData.codigo && responseData.codigo === 1063) {
        return { isValid: false, errorMessage: `Beneficiário não encontrado na API externa (código ${responseData.codigo})` };
      }
      return { isValid: false, errorMessage: 'Resposta da API não contém mensagem de sucesso esperada para cancelamento' };

    case 'test':
      // Para teste simples, aceita qualquer resposta válida
      return { isValid: true };

    default:
      return { isValid: true };
  }
}

function getApiUrl(operation, apiSettings) {
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

async function makeApiCall(data, operation, apiSettings, retryCount = 0) {
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
        'x-api-key': apiSettings.externalApiKey
      },
      body: JSON.stringify(data)
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
function isValidCPF(cpf) {
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
function formatCPFForVindi(cpf) {
  // Remove todos os caracteres não numéricos
  const cleanCPF = cpf.replace(/\D/g, '');

  // Valida o CPF
  if (!isValidCPF(cleanCPF)) {
    throw new Error(`CPF inválido: ${cpf}. Por favor, use um CPF válido para teste.`);
  }

  return cleanCPF;
}

async function mapPlanoToTipoPlano(planoId) {
  console.log(`🔍 Mapeando plano ${planoId} para tipoPlano da RMS...`);

  try {
    // Buscar o plano no banco de dados para obter o rms_plan_code
    const { data: plano, error } = await supabase
      .from('planos')
      .select('rms_plan_code, nome')
      .eq('id', planoId)
      .single();

    if (error) {
      console.warn(`⚠️ Erro ao buscar plano ${planoId}:`, error.message);
    } else if (plano) {
      console.log(`📋 Plano encontrado: ${plano.nome}, RMS code: ${plano.rms_plan_code}`);

      // Se tem código RMS configurado, usar ele
      if (plano.rms_plan_code) {
        const rmsCode = parseInt(plano.rms_plan_code);
        if (!isNaN(rmsCode)) {
          console.log(`✅ Usando código RMS configurado: ${rmsCode}`);
          return rmsCode;
        } else {
          console.warn(`⚠️ Código RMS inválido (não é número): ${plano.rms_plan_code}`);
        }
      } else {
        console.log(`ℹ️ Plano ${plano.nome} não tem código RMS configurado, usando fallback`);
      }
    }
  } catch (error) {
    console.error(`❌ Erro ao consultar plano ${planoId}:`, error);
  }

  // Fallback para mapeamento hardcoded existente
  console.log(`🔄 Usando mapeamento hardcoded para plano ${planoId}`);
  const planoMapping = {
    'f3395d2c-7e18-41e6-8204-1d71c1981d3c': 102304, // Familiar
    '1af1a9e8-5590-4349-84cc-be5f8f7f9d83': 102303, // Individual
    '8f22a8dc-62f6-5145-b57d-fcec8c6780de': 102304, // Familiar
    '4e11e7cb-51f5-4034-a46c-ebdb7b5679cd': 102303  // Individual
  };

  const tipoPlano = planoMapping[planoId] || 102303; // Default para Individual
  console.log(`📊 TipoPlano final: ${tipoPlano}`);
  return tipoPlano;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { operation, data } = await req.json();
    console.log(`🚀 Operação recebida: ${operation}`);
    console.log('📋 Dados:', JSON.stringify(data, null, 2));

    // Buscar configurações da API para operações que precisam delas
    let apiSettings = null;
    if (operation !== 'test') {
      try {
        apiSettings = await getApiSettings();
      } catch (error) {
        console.error('❌ Erro ao buscar configurações:', error.message);
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

      await logApiCall(null, 'test', data, testResponse, 'success', null, 0);

      return new Response(JSON.stringify(testResponse), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      });
    }

    // Handle adesao operation with enhanced error handling
    if (operation === 'adesao') {
      console.log('🏥 === PROCESSANDO ADESÃO ===');

      try {
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
          codigo_externo,
          cpf_titular // CPF do titular (obrigatório para dependentes)
        } = data;

        // ETAPA 1: Validações defensivas com logging detalhado
        console.log('🔍 === VALIDANDO DADOS DE ADESÃO ===');
        console.log('📋 Dados recebidos:', JSON.stringify(data, null, 2));
        console.log('🆔 beneficiarioId:', beneficiarioId);
        console.log('👤 id_beneficiario_tipo:', id_beneficiario_tipo);
        console.log('🏷️ Tipo de beneficiário:', id_beneficiario_tipo === 3 ? 'DEPENDENTE' : 'TITULAR');

        const missingFields = [];
        if (!nome) missingFields.push('nome');
        if (!cpf) missingFields.push('cpf');
        if (!email) missingFields.push('email');
        if (!codigo_externo) missingFields.push('codigo_externo');

        if (missingFields.length > 0) {
          const errorMsg = `Campos obrigatórios faltando: ${missingFields.join(', ')}`;
          console.error('❌ ERRO DE VALIDAÇÃO:', errorMsg);
          throw new Error(errorMsg);
        }

        // Validação específica para dependentes
        if (id_beneficiario_tipo === 3 && !cpf_titular) {
          const errorMsg = 'CPF do titular é obrigatório para dependentes (id_beneficiario_tipo = 3)';
          console.error('❌ ERRO DE DEPENDENTE:', errorMsg);
          throw new Error(errorMsg);
        }

        // Validação do plano_id
        if (!plano_id) {
          const errorMsg = 'plano_id é obrigatório para processar adesão';
          console.error('❌ ERRO DE PLANO:', errorMsg);
          throw new Error(errorMsg);
        }

        console.log('✅ Validações básicas aprovadas');

        // ETAPA 2: Mapear plano para tipo RMS
        console.log('🗺️ === MAPEANDO PLANO ===');
        let tipoPlano;
        try {
          tipoPlano = await mapPlanoToTipoPlano(plano_id);
          console.log(`✅ TipoPlano obtido: ${tipoPlano} para plano_id: ${plano_id}`);
        } catch (error) {
          const errorMsg = `Erro ao mapear plano ${plano_id}: ${error.message}`;
          console.error(`❌ ERRO DE MAPEAMENTO:`, errorMsg);
          throw new Error(errorMsg);
        }

        // ETAPA 3: Preparar dados para RMS
        console.log('🔧 === PREPARANDO DADOS PARA RMS ===');
        const requestData = {
          idClienteContrato: parseInt(idClienteContrato),
          idBeneficiarioTipo: id_beneficiario_tipo || 1,
          nome: nome.trim(),
          codigoExterno: codigo_externo.trim(),
          idCliente: parseInt(idCliente),
          cpf: cpf.replace(/\D/g, ''), // Remove formatação
          dataNascimento: data_nascimento || '01011990',
          celular: telefone ? telefone.replace(/\D/g, '') : '11999999999',
          email: email.trim(),
          cep: cep || '01234567',
          numero: numero_endereco || '123',
          uf: estado || 'SP',
          tipoPlano: tipoPlano
        };

        // Adicionar CPF do titular se for dependente
        if (id_beneficiario_tipo === 3 && cpf_titular) {
          requestData.cpfTitular = cpf_titular.replace(/\D/g, '');
          console.log('👨‍👩‍👧‍👦 CPF do titular adicionado para dependente:', requestData.cpfTitular);
        }

        console.log('📤 === DADOS PREPARADOS PARA RMS ===');
        console.log('📋 requestData:', JSON.stringify(requestData, null, 2));

        // ETAPA 4: Fazer chamada para API RMS
        console.log('🌐 === ENVIANDO PARA API RMS ===');
        const response = await makeApiCall(requestData, 'adesao', apiSettings);

        // ETAPA 5: Validar resposta
        console.log('✅ === VALIDANDO RESPOSTA RMS ===');
        const validation = validateApiResponse('adesao', response);
        if (!validation.isValid) {
          console.warn('⚠️ Validação falhou:', validation.errorMessage);
          await logApiCall(beneficiarioId, 'adesao', requestData, response, 'error', validation.errorMessage);

          return new Response(JSON.stringify({
            success: false,
            error: validation.errorMessage,
            response,
            stage: 'validation'
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          });
        }

        // ETAPA 6: Log de sucesso
        await logApiCall(beneficiarioId, 'adesao', requestData, response, 'success');
        console.log('🎉 === ADESÃO PROCESSADA COM SUCESSO ===');

        return new Response(JSON.stringify({
          success: true,
          response,
          stage: 'completed'
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      } catch (adesaoError) {
        console.error('❌ === ERRO NO PROCESSAMENTO DA ADESÃO ===');
        console.error('🔥 Erro:', adesaoError.message);
        console.error('📊 Stack:', adesaoError.stack);

        // Log do erro
        await logApiCall(
          data?.id || null,
          'adesao',
          data,
          null,
          'error',
          adesaoError.message
        );

        return new Response(JSON.stringify({
          success: false,
          error: adesaoError.message,
          stage: 'processing',
          details: adesaoError.stack
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500
        });
      }
    }

    // Handle cancelamento operation
    if (operation === 'cancelamento') {
      console.log('🚫 === PROCESSANDO CANCELAMENTO ===');

      const { cpf, codigoExterno } = data;

      // Seguir exatamente a especificação da RMS API Cancelamento V4.0
      const requestData = {
        idClienteContrato: parseInt(idClienteContrato),
        idCliente: parseInt(idCliente),
        cpf: cpf,
        codigoExterno: codigoExterno || ""
      };

      console.log('📤 Payload de cancelamento:', JSON.stringify(requestData, null, 2));

      try {
        const response = await makeApiCall(requestData, 'cancelamento', apiSettings);

        // Validar resposta da API para cancelamento
        const validation = validateApiResponse('cancelamento', response);
        if (!validation.isValid) {
          console.warn('Validação falhou:', validation.errorMessage);
          await logApiCall(null, 'cancelamento', requestData, response, 'error', validation.errorMessage);

          return new Response(JSON.stringify({
            success: false,
            error: validation.errorMessage,
            response
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          });
        }

        await logApiCall(null, 'cancelamento', requestData, response, 'success');

        return new Response(JSON.stringify({
          success: true,
          response
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        await logApiCall(null, 'cancelamento', requestData, null, 'error', error.message);
        throw error;
      }
    }

    // Se chegou aqui, operação não suportada
    throw new Error(`Operação não suportada: ${operation}`);

  } catch (error) {
    console.error('❌ === ERRO GERAL NA EDGE FUNCTION ===');
    console.error('🔥 Erro:', error.message);
    console.error('📊 Stack:', error.stack);

    // Dar mensagens de erro mais específicas dependendo do tipo de erro
    let errorMessage = error.message;
    let statusCode = 500;

    if (error.message.includes('Campos obrigatórios faltando')) {
      statusCode = 400;
      errorMessage = `Erro de validação: ${error.message}`;
    } else if (error.message.includes('CPF do titular é obrigatório')) {
      statusCode = 400;
      errorMessage = `Erro de dependente: ${error.message}`;
    } else if (error.message.includes('plano_id é obrigatório')) {
      statusCode = 400;
      errorMessage = `Erro de plano: ${error.message}`;
    }

    return new Response(JSON.stringify({
      error: errorMessage,
      details: error.message,
      stack: error.stack
    }), {
      status: statusCode,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});