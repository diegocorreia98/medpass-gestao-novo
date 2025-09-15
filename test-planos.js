// Quick test to check if plans exist in database
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yhxoihyjtcgulnfipqej.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InloeG9paHlqdGNndWxuZmlwcWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2MDgyMTMsImV4cCI6MjA2ODE4NDIxM30.EG-a41y4Mjmp_Gw4lDFqlohapfzi6evpBU1r5mie-Ls';

const supabase = createClient(supabaseUrl, supabaseKey);

// Test database connection and fetch plans
(async () => {
  try {
    console.log('🔍 Testando conexão e buscando planos...');

    const { data: planos, error } = await supabase
      .from('planos')
      .select('id, nome, valor, ativo, vindi_plan_id, created_at')
      .order('created_at');

    if (error) {
      console.error('❌ Erro ao buscar planos:', error);
      return;
    }

    console.log('✅ Planos encontrados:', planos.length);
    planos.forEach(plano => {
      console.log(`- ID: ${plano.id} | Nome: ${plano.nome} | Valor: R$ ${plano.valor} | Ativo: ${plano.ativo} | Vindi ID: ${plano.vindi_plan_id}`);
    });

    // Test specific plan lookup
    const testPlanId = planos[0]?.id;
    if (testPlanId) {
      console.log(`\n🔍 Testando busca por ID específico: ${testPlanId}`);
      const found = planos.find(p => p.id === testPlanId);
      console.log('Resultado:', found ? '✅ Encontrado' : '❌ Não encontrado');
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
})();