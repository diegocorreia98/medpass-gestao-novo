// Test checkout URL with existing plan
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yhxoihyjtcgulnfipqej.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InloeG9paHlqdGNndWxuZmlwcWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2MDgyMTMsImV4cCI6MjA2ODE4NDIxM30.EG-a41y4Mjmp_Gw4lDFqlohapfzi6evpBU1r5mie-Ls';

const supabase = createClient(supabaseUrl, supabaseKey);

(async () => {
  try {
    console.log('🔍 Buscando plano existente...');

    const { data: plans, error } = await supabase
      .from('planos')
      .select('id, nome, valor, vindi_plan_id')
      .eq('ativo', true)
      .limit(1);

    if (error) {
      console.error('❌ Erro ao buscar planos:', error);
      return;
    }

    if (plans.length === 0) {
      console.error('❌ Nenhum plano encontrado');
      return;
    }

    const plan = plans[0];
    console.log('✅ Plano encontrado:', plan.nome);
    console.log('📋 Detalhes:', {
      id: plan.id,
      nome: plan.nome,
      valor: plan.valor,
      vindi_plan_id: plan.vindi_plan_id
    });

    // Create a test checkout URL
    const baseUrl = 'http://localhost:8080';
    const checkoutParams = new URLSearchParams({
      plan_id: plan.id,
      customer_name: 'Diego Beu Correia',
      customer_email: 'diego@teste.com',
      customer_document: '08600756995',
      customer_phone: '(11) 99999-9999'
    });

    const checkoutUrl = `${baseUrl}/checkout?${checkoutParams.toString()}`;

    console.log('\\n🔗 URL de teste do checkout:');
    console.log(checkoutUrl);

    console.log('\\n✅ Agora você pode:');
    console.log('1. Iniciar o servidor: npm run dev');
    console.log('2. Acessar a URL acima no navegador');
    console.log('3. Testar o fluxo de checkout');

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
})();