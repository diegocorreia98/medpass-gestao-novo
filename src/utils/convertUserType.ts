import { supabase } from "@/integrations/supabase/client";

export async function convertToMatriz() {
  console.log("🔄 === CONVERTENDO USUÁRIO PARA MATRIZ ===");

  try {
    // 1. Aguardar sessão de autenticação estar disponível
    console.log("⏳ Aguardando autenticação...");

    let attempts = 0;
    let user = null;

    while (!user && attempts < 10) {
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();

      if (currentUser) {
        user = currentUser;
        break;
      }

      attempts++;
      console.log(`⏳ Tentativa ${attempts}/10 - Aguardando autenticação...`);
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    if (!user) {
      console.error("❌ Nenhum usuário autenticado encontrado após 10 tentativas");
      console.log("💡 Certifique-se de que você está logado na aplicação.");
      console.log("💡 Tente fazer login novamente e aguarde alguns segundos antes de executar o comando.");
      return;
    }

    console.log("👤 Usuário atual autenticado:", user.id);

    // 2. Atualizar profile para tipo matriz
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({
        user_type: 'matriz',
        full_name: 'Usuário Matriz' // Atualizar nome também
      })
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error("❌ Erro ao atualizar profile:", updateError);
      return;
    }

    console.log("✅ Profile atualizado para tipo matriz:", updatedProfile);

    // 3. Verificar resultado
    console.log("🔍 Verificando profiles no banco de dados...");
    const { data: allProfiles, error: verifyError } = await supabase
      .from('profiles')
      .select('user_id, user_type, full_name');

    if (verifyError) {
      console.error("❌ Erro ao verificar profiles:", verifyError);
      return;
    }

    console.log("👥 Todos os profiles agora no sistema:");
    console.table(allProfiles);

    const matrizUsers = allProfiles.filter(p => p.user_type === 'matriz');
    console.log(`🏢 Usuários matriz encontrados: ${matrizUsers.length}`);

    if (matrizUsers.length > 0) {
      console.log("🎉 SUCESSO! Usuário convertido para matriz.");
      console.log("🔄 RECARREGUE A PÁGINA para acessar o painel matriz!");
      console.log("💡 Agora você pode acessar /dashboard, /admin, e outras páginas matriz.");
    }

  } catch (err) {
    console.error("❌ Erro inesperado:", err);
  }

  console.log("🔄 === FIM CONVERSÃO PARA MATRIZ ===");
}

export async function convertToUnidade() {
  console.log("🔄 === CONVERTENDO USUÁRIO PARA UNIDADE ===");

  try {
    // 1. Aguardar sessão de autenticação estar disponível
    console.log("⏳ Aguardando autenticação...");

    let attempts = 0;
    let user = null;

    while (!user && attempts < 10) {
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();

      if (currentUser) {
        user = currentUser;
        break;
      }

      attempts++;
      console.log(`⏳ Tentativa ${attempts}/10 - Aguardando autenticação...`);
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    if (!user) {
      console.error("❌ Nenhum usuário autenticado encontrado após 10 tentativas");
      console.log("💡 Certifique-se de que você está logado na aplicação.");
      return;
    }

    console.log("👤 Usuário atual autenticado:", user.id);

    // 2. Atualizar profile para tipo unidade
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({
        user_type: 'unidade',
        full_name: 'Usuário Unidade'
      })
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error("❌ Erro ao atualizar profile:", updateError);
      return;
    }

    console.log("✅ Profile atualizado para tipo unidade:", updatedProfile);
    console.log("🔄 RECARREGUE A PÁGINA para acessar o painel unidade!");

  } catch (err) {
    console.error("❌ Erro inesperado:", err);
  }

  console.log("🔄 === FIM CONVERSÃO PARA UNIDADE ===");
}

// Exportar para uso global no console
if (typeof window !== 'undefined') {
  (window as any).convertToMatriz = convertToMatriz;
  (window as any).convertToUnidade = convertToUnidade;
}