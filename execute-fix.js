// Execute database fixes
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yhxoihyjtcgulnfipqej.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InloeG9paHlqdGNndWxuZmlwcWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2MDgyMTMsImV4cCI6MjA2ODE4NDIxM30.EG-a41y4Mjmp_Gw4lDFqlohapfzi6evpBU1r5mie-Ls';

const supabase = createClient(supabaseUrl, supabaseKey);

(async () => {
  try {
    console.log('🛠️ Executando correções no banco...');

    // 1. Criar plano Individual
    console.log('📋 Criando plano Individual...');
    const { data: planData, error: planError } = await supabase
      .from('planos')
      .insert({
        nome: 'Mensal 12 Meses - Individual',
        descricao: 'Plano Individual MedPass - Mensal por 12 meses',
        valor: 49.90,
        vindi_plan_id: 539682,
        vindi_product_id: '1804781',
        ativo: true
      })
      .select()
      .single();

    if (planError && !planError.message.includes('duplicate')) {
      console.error('❌ Erro ao criar plano:', planError);
    } else {
      console.log('✅ Plano Individual criado:', planData?.nome || 'já existe');
    }

    // 2. Verificar planos existentes
    console.log('\n📋 Verificando planos...');
    const { data: allPlans, error: plansError } = await supabase
      .from('planos')
      .select('id, nome, valor, vindi_plan_id, ativo')
      .eq('ativo', true)
      .order('valor');

    if (plansError) {
      console.error('❌ Erro ao buscar planos:', plansError);
    } else {
      console.log('✅ Planos ativos encontrados:', allPlans.length);
      allPlans.forEach(p => {
        console.log(`  - ${p.nome} | R$ ${p.valor} | Vindi ID: ${p.vindi_plan_id} | UUID: ${p.id}`);
      });
    }

    // 3. Criar beneficiário Diego
    console.log('\n👤 Criando beneficiário Diego...');
    const individualPlan = allPlans.find(p => p.vindi_plan_id === 539682);

    if (!individualPlan) {
      console.error('❌ Plano Individual não encontrado para criar beneficiário');
      return;
    }

    const { data: beneficiarioData, error: beneficiarioError } = await supabase
      .from('beneficiarios')
      .insert({
        user_id: '49fd2e97-ad5e-445b-a959-ba4c532e277a',
        unidade_id: '239377fc-92bd-40fa-8d9d-c1375329c55e',
        plano_id: individualPlan.id,
        nome: 'Diego Beu Correia',
        cpf: '08600756995',
        email: 'diego@teste.com',
        telefone: '(11) 99999-9999',
        valor_plano: 49.90,
        status: 'ativo',
        payment_status: 'not_requested',
        data_adesao: new Date().toISOString()
      })
      .select()
      .single();

    if (beneficiarioError && !beneficiarioError.message.includes('duplicate')) {
      console.error('❌ Erro ao criar beneficiário:', beneficiarioError);
    } else {
      console.log('✅ Beneficiário Diego criado:', beneficiarioData?.nome || 'já existe');
    }

    // 4. Verificar resultado final
    console.log('\n🔍 Verificação final...');
    const { data: diego, error: diegoError } = await supabase
      .from('beneficiarios')
      .select(`
        id, nome, cpf, plano_id,
        plano:planos(id, nome, vindi_plan_id)
      `)
      .eq('cpf', '08600756995')
      .single();

    if (diegoError) {
      console.error('❌ Diego não encontrado:', diegoError);
    } else {
      console.log('✅ Diego verificado:');
      console.log(`  - Nome: ${diego.nome}`);
      console.log(`  - CPF: ${diego.cpf}`);
      console.log(`  - Plano: ${diego.plano.nome}`);
      console.log(`  - Vindi Plan ID: ${diego.plano.vindi_plan_id}`);
      console.log(`  - Plan UUID: ${diego.plano_id}`);
    }

    console.log('\n🎉 Correções concluídas! Teste o checkout agora.');

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
})();