// Utilitários de segurança para APIs externas

interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
}

// Função segura para buscar CEP com timeout e validação
export const buscarCEPSeguro = async (cep: string): Promise<ApiResponse> => {
  // Validar formato do CEP
  if (!/^\d{8}$/.test(cep)) {
    return { success: false, error: "CEP deve conter exatamente 8 dígitos" };
  }

  try {
    // Configurar timeout de 5 segundos
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return { success: false, error: `Erro HTTP: ${response.status}` };
    }

    const data = await response.json();

    // Validar resposta
    if (data.erro) {
      return { success: false, error: "CEP não encontrado" };
    }

    // Validar campos obrigatórios
    if (!data.cep || !data.localidade || !data.uf) {
      return { success: false, error: "Resposta da API incompleta" };
    }

    // Sanitizar dados de resposta
    const sanitizedData = {
      cep: data.cep.replace(/\D/g, ''),
      logradouro: String(data.logradouro || '').trim(),
      bairro: String(data.bairro || '').trim(),
      localidade: String(data.localidade || '').trim(),
      uf: String(data.uf || '').trim().toUpperCase(),
      complemento: String(data.complemento || '').trim()
    };

    return { success: true, data: sanitizedData };

  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return { success: false, error: "Timeout: API demorou muito para responder" };
      }
      return { success: false, error: `Erro de rede: ${error.message}` };
    }
    return { success: false, error: "Erro desconhecido ao buscar CEP" };
  }
};

// Função para validar URLs externas (Google Sheets, etc.)
export const validateExternalUrl = (url: string): boolean => {
  try {
    const parsedUrl = new URL(url);
    
    // Lista de domínios permitidos
    const allowedDomains = [
      'docs.google.com',
      'sheets.googleapis.com',
      'drive.google.com'
    ];

    return allowedDomains.includes(parsedUrl.hostname.toLowerCase());
  } catch {
    return false;
  }
};

// Função para sanitizar strings de entrada
export const sanitizeString = (input: string, maxLength: number = 255): string => {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove caracteres perigosos básicos
    .substring(0, maxLength);
};

// Função para validar CPF
export const validateCPF = (cpf: string): boolean => {
  const cleanCPF = cpf.replace(/\D/g, '');
  
  if (cleanCPF.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false; // CPFs com todos os dígitos iguais
  
  // Validação dos dígitos verificadores
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF[i]) * (10 - i);
  }
  let digit1 = (sum * 10) % 11;
  if (digit1 === 10) digit1 = 0;
  
  if (digit1 !== parseInt(cleanCPF[9])) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF[i]) * (11 - i);
  }
  let digit2 = (sum * 10) % 11;
  if (digit2 === 10) digit2 = 0;
  
  return digit2 === parseInt(cleanCPF[10]);
};