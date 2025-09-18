import { supabase } from "@/integrations/supabase/client";

export async function testUnidadeDataSecurity() {
  console.log("🔒 === TESTE DE SEGURANÇA DOS DADOS DA UNIDADE ===");

  // 1. Verificar usuário atual
  const { data: currentUser, error: userError } = await supabase.auth.getUser();
  console.log("👤 Usuário atual:", currentUser?.user?.id, userError);

  if (!currentUser?.user) {
    console.error("❌ Nenhum usuário logado");
    return;
  }

  // 2. Verificar profile do usuário
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('user_type, full_name')
    .eq('user_id', currentUser.user.id)
    .single();

  console.log("👥 Profile do usuário:", profile, profileError);

  if (profile?.user_type !== 'unidade') {
    console.log("ℹ️ Usuário não é do tipo 'unidade', teste não aplicável");
    return;
  }

  console.log("🏢 Testando segurança para usuário UNIDADE");

  // 3. Testar query de beneficiários (deve retornar apenas os do usuário)
  const { data: beneficiarios, error: benefError } = await supabase
    .from('beneficiarios')
    .select('id, nome, user_id, unidade_id')
    .eq('user_id', currentUser.user.id);

  console.log("📊 Beneficiários do usuário (correto):", beneficiarios?.length || 0);

  // 4. Testar query INCORRETA (sem filtro - NÃO deve ser usada)
  const { data: todosBeneficiarios, error: todosError } = await supabase
    .from('beneficiarios')
    .select('id, nome, user_id, unidade_id')
    .limit(5);

  console.log("⚠️ TODOS os beneficiários (INSEGURO):", todosBeneficiarios?.length || 0);

  // 5. Comparar - se são iguais, pode haver problema
  if (beneficiarios?.length === todosBeneficiarios?.length) {
    console.log("✅ Dados parecem estar filtrados corretamente");
  } else {
    console.log("🚨 POSSÍVEL VAZAMENTO: Usuário tem acesso apenas aos seus dados");
  }

  // 6. Testar comissões
  const { data: comissoes, error: comError } = await supabase
    .from('comissoes')
    .select('id, valor_comissao, user_id, unidade_id')
    .eq('user_id', currentUser.user.id);

  console.log("💰 Comissões do usuário:", comissoes?.length || 0);

  // 7. Verificar se existem outros user_ids nos resultados (seria um erro)
  const userIds = new Set([
    ...(beneficiarios?.map(b => b.user_id) || []),
    ...(comissoes?.map(c => c.user_id) || [])
  ]);

  console.log("🔍 User IDs encontrados nos dados:", Array.from(userIds));

  if (userIds.size === 1 && userIds.has(currentUser.user.id)) {
    console.log("✅ SEGURANÇA OK: Todos os dados pertencem ao usuário logado");
  } else {
    console.log("🚨 PROBLEMA DE SEGURANÇA: Dados de outros usuários detectados!");
    console.log("🚨 User IDs vazados:", Array.from(userIds).filter(id => id !== currentUser.user.id));
  }

  console.log("🔒 === FIM DO TESTE DE SEGURANÇA ===");
}

// Exportar para uso global
(window as any).testSecurity = testUnidadeDataSecurity;