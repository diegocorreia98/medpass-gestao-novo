#!/usr/bin/env node

// Script para testar criação de checkout links
// Simula o processo que acontece no AdesaoModal

console.log('🧪 [TEST] Iniciando teste de criação de checkout link...');

// URL da aplicação local
const APP_URL = 'http://localhost:8081';
const API_BASE = 'http://localhost:54321';

// Dados de teste para beneficiário
const testBeneficiario = {
  nome: 'Diego Teste Checkout',
  cpf: '12345678901',
  email: 'diego.teste@example.com',
  telefone: '11999999999',
  data_nascimento: '1990-01-01',
  endereco: 'Rua Teste, 123',
  numero_endereco: '123',
  bairro: 'Centro',
  cidade: 'São Paulo',
  estado: 'SP',
  cep: '01310-100',
  unidade_id: null, // Será preenchido
  plano_id: null,   // Será preenchido
  valor_plano: 100.00,
  id_beneficiario_tipo: 1,
  empresa_id: null,
  status: 'ativo'
};

console.log('📝 [TEST] Dados do beneficiário de teste:', testBeneficiario.nome);
console.log('🌐 [TEST] URL da aplicação:', APP_URL);

// Simular o processo
console.log('');
console.log('🔄 [TEST] Este script simula o processo que acontece no modal de adesão:');
console.log('  1. Criação do beneficiário no banco');
console.log('  2. Chamada da função create-vindi-customer');
console.log('  3. Atualização do beneficiário com checkout_link');
console.log('  4. Verificação se o link aparece na tabela');
console.log('');

console.log('🎯 [TEST] Para verificar se está funcionando:');
console.log('  1. Acesse:', APP_URL);
console.log('  2. Faça login como usuário matriz');
console.log('  3. Vá para "Adesões de Beneficiários"');
console.log('  4. Clique em "Nova Adesão"');
console.log('  5. Preencha os dados de um beneficiário');
console.log('  6. Clique em "Salvar"');
console.log('  7. Verifique os logs no console do navegador');
console.log('  8. Verifique se aparece o checkout link na tabela');
console.log('');

console.log('🔍 [TEST] Logs esperados no console do navegador:');
console.log('  [MATRIZ-ADESAO] Beneficiário criado com sucesso');
console.log('  [MATRIZ-ADESAO] Chamando create-vindi-customer');
console.log('  [MATRIZ-ADESAO] Checkout URL gerada');
console.log('  [MATRIZ-ADESAO] Link de checkout salvo');
console.log('  [MATRIZ-ADESAO] Verificação pós-save no banco');
console.log('');

console.log('🔍 [TEST] Logs esperados no console do Supabase Edge Functions:');
console.log('  [CREATE-VINDI-CUSTOMER] CREATE-VINDI-CUSTOMER - Iniciado');
console.log('  [CREATE-VINDI-CUSTOMER] Beneficiário encontrado');
console.log('  [CREATE-VINDI-CUSTOMER] Checkout URL gerada');
console.log('  [CREATE-VINDI-CUSTOMER] Create Vindi customer completed successfully');
console.log('');

console.log('📊 [TEST] Se o checkout link não aparecer na tabela, verificar:');
console.log('  1. Se os logs mostram erro na criação do cliente Vindi');
console.log('  2. Se a função create-vindi-customer está retornando checkout_url');
console.log('  3. Se o update do campo checkout_link está funcionando');
console.log('  4. Se a query da tabela está incluindo o campo checkout_link');
console.log('  5. Se o real-time subscription está detectando a mudança');
console.log('');

console.log('✅ [TEST] Script de orientação concluído!');
console.log('💡 [TEST] Agora execute o teste manual na aplicação conforme as instruções acima.');