/**
 * Valida um CPF brasileiro
 * @param cpf - CPF com ou sem formatação
 * @returns true se o CPF for válido, false caso contrário
 */
export function isValidCPF(cpf: string): boolean {
  // Remove caracteres não numéricos
  const cleanCPF = cpf.replace(/\D/g, '');

  // Verifica se tem 11 dígitos
  if (cleanCPF.length !== 11) {
    return false;
  }

  // Verifica se todos os dígitos são iguais (ex: 111.111.111-11)
  if (/^(\d)\1{10}$/.test(cleanCPF)) {
    return false;
  }

  // Validação do primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (10 - i);
  }
  let digit1 = 11 - (sum % 11);
  if (digit1 >= 10) digit1 = 0;

  if (digit1 !== parseInt(cleanCPF.charAt(9))) {
    return false;
  }

  // Validação do segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCPF.charAt(i)) * (11 - i);
  }
  let digit2 = 11 - (sum % 11);
  if (digit2 >= 10) digit2 = 0;

  if (digit2 !== parseInt(cleanCPF.charAt(10))) {
    return false;
  }

  return true;
}

/**
 * Formata um CPF para o padrão XXX.XXX.XXX-XX
 * @param cpf - CPF sem formatação
 * @returns CPF formatado ou string vazia se inválido
 */
export function formatCPF(cpf: string): string {
  const cleanCPF = cpf.replace(/\D/g, '');

  if (cleanCPF.length !== 11) {
    return cpf;
  }

  return cleanCPF.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

/**
 * Remove formatação do CPF
 * @param cpf - CPF com formatação
 * @returns CPF apenas com números
 */
export function cleanCPF(cpf: string): string {
  return cpf.replace(/\D/g, '');
}

/**
 * Valida e retorna mensagem de erro se inválido
 * @param cpf - CPF a ser validado
 * @returns null se válido, string com mensagem de erro caso contrário
 */
export function validateCPFWithMessage(cpf: string): string | null {
  const cleanCPF = cpf.replace(/\D/g, '');

  if (!cleanCPF) {
    return 'CPF é obrigatório';
  }

  if (cleanCPF.length !== 11) {
    return 'CPF deve ter 11 dígitos';
  }

  if (/^(\d)\1{10}$/.test(cleanCPF)) {
    return 'CPF não pode ter todos os dígitos iguais';
  }

  if (!isValidCPF(cleanCPF)) {
    return 'CPF inválido';
  }

  return null;
}