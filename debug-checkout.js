#!/usr/bin/env node

// Script para debug específico do problema de checkout links
console.log('🔍 [DEBUG] Iniciando diagnóstico do problema de checkout links...\n');

// Verificações a serem feitas
const checks = [
  '1. Verificar se edge function create-vindi-customer está sendo chamada',
  '2. Verificar se a função está retornando dados corretos',
  '3. Verificar se o campo checkout_link está sendo salvo no banco',
  '4. Verificar se a tabela está lendo o campo corretamente',
  '5. Verificar se real-time está funcionando'
];

console.log('📋 [DEBUG] Verificações necessárias:');
checks.forEach(check => console.log(`   ${check}`));

console.log('\n🎯 [DEBUG] Passos para identificar o problema:');

console.log('\n   PASSO 1 - Verificar logs no console do navegador:');
console.log('   • Abra http://localhost:8081');
console.log('   • Abra DevTools (F12)');
console.log('   • Vá para a aba Console');
console.log('   • Crie um novo beneficiário');
console.log('   • Procure por logs que começam com [MATRIZ-ADESAO] ou [UNIDADE-ADESAO]');

console.log('\n   PASSO 2 - Se não há logs no console:');
console.log('   • O modal não está sendo executado corretamente');
console.log('   • Verificar se o usuário está logado');
console.log('   • Verificar se há erros JavaScript na página');

console.log('\n   PASSO 3 - Se há logs mas sem sucesso:');
console.log('   • Verificar se aparece erro na chamada create-vindi-customer');
console.log('   • Verificar se VINDI_PRIVATE_KEY está configurada');
console.log('   • Verificar se o beneficiário tem plano válido');

console.log('\n   PASSO 4 - Se função retorna sucesso mas sem checkout_url:');
console.log('   • Problema na edge function create-vindi-customer');
console.log('   • Verificar logs da edge function no Supabase Dashboard');

console.log('\n   PASSO 5 - Se há checkout_url mas campo não é salvo:');
console.log('   • Problema no update do banco de dados');
console.log('   • Verificar permissões de RLS no Supabase');
console.log('   • Verificar se user_id está correto');

console.log('\n   PASSO 6 - Se campo é salvo mas não aparece na tabela:');
console.log('   • Problema na query da tabela ou real-time');
console.log('   • Recarregar a página manualmente');
console.log('   • Verificar se query inclui campo checkout_link');

console.log('\n🔧 [DEBUG] Ferramentas para investigação:');
console.log('   • Console do navegador (F12)');
console.log('   • Supabase Dashboard > Edge Functions > Logs');
console.log('   • Supabase Dashboard > Table Editor > beneficiarios');
console.log('   • Network tab para ver requests HTTP');

console.log('\n📝 [DEBUG] Que logs você está vendo no console?');
console.log('   Por favor, compartilhe os logs específicos que aparecem');
console.log('   quando você tenta criar um beneficiário.');

console.log('\n🎲 [DEBUG] Teste alternativo:');
console.log('   1. Vá para Supabase Dashboard');
console.log('   2. Table Editor > beneficiarios');
console.log('   3. Veja se existem registros com checkout_link preenchido');
console.log('   4. Se sim, o problema é na exibição da tabela');
console.log('   5. Se não, o problema é na criação do link');

console.log('\n✅ [DEBUG] Próximos passos após identificar onde falha:');
console.log('   • Envie os logs específicos do console');
console.log('   • Informe em qual passo exato o processo falha');
console.log('   • Poderei então fazer o fix direcionado');