// Check beneficiarios and their plan_ids
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yhxoihyjtcgulnfipqej.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InloeG9paHlqdGNndWxuZmlwcWVqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2MDgyMTMsImV4cCI6MjA2ODE4NDIxM30.EG-a41y4Mjmp_Gw4lDFqlohapfzi6evpBU1r5mie-Ls';

const supabase = createClient(supabaseUrl, supabaseKey);

(async () => {
  try {
    console.log('🔍 Verificando beneficiarios e seus plan_ids...');
    const { data: beneficiarios, error } = await supabase
      .from('beneficiarios')
      .select('id, nome, plano_id, plano:planos(id, nome)')
      .limit(5);

    if (error) {
      console.error('❌ Erro:', error);
      return;
    }

    console.log('✅ Beneficiários encontrados:', beneficiarios.length);
    beneficiarios.forEach(b => {
      console.log(`- ${b.nome} | Plan ID: ${b.plano_id} | Plano: ${b.plano?.nome || 'SEM PLANO'}`);
    });

    // Check if Diego Beu Correia exists and his plan_id
    console.log('\n🔍 Procurando Diego Beu Correia...');
    const { data: diego, error: diegoError } = await supabase
      .from('beneficiarios')
      .select('id, nome, cpf, plano_id, plano:planos(id, nome)')
      .eq('cpf', '08600756995')
      .single();

    if (diegoError) {
      console.error('❌ Diego não encontrado:', diegoError);
    } else {
      console.log(`✅ Diego encontrado: ${diego.nome} | Plan ID: ${diego.plano_id} | Plano: ${diego.plano?.nome || 'SEM PLANO'}`);
    }

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
})();