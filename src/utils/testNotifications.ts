import { supabase } from "@/integrations/supabase/client";

export async function debugNotificationSystem() {
  console.log("🔍 === DEBUG SISTEMA DE NOTIFICAÇÕES ===");

  // 1. Verificar usuário atual
  const { data: currentUser, error: userError } = await supabase.auth.getUser();
  console.log("👤 Usuário atual:", currentUser?.user?.id, userError);

  // 2. Verificar todos os profiles
  const { data: allProfiles, error: profilesError } = await supabase
    .from('profiles')
    .select('user_id, user_type, full_name');

  console.log("👥 Todos os profiles:", allProfiles?.length, "erro:", profilesError);
  console.log("📊 Detalhes dos profiles:", allProfiles);

  // 3. Verificar especificamente usuários unidade
  const { data: unidadeUsers, error: unidadeError } = await supabase
    .from('profiles')
    .select('user_id, user_type, full_name')
    .eq('user_type', 'unidade');

  console.log("🏢 Usuários unidade:", unidadeUsers?.length, "erro:", unidadeError);
  console.log("📋 Detalhes usuários unidade:", unidadeUsers);

  // 4. Tentar inserir uma notificação teste diretamente
  if (unidadeUsers && unidadeUsers.length > 0) {
    const testNotification = {
      user_id: unidadeUsers[0].user_id,
      titulo: 'Teste Debug Direto',
      mensagem: 'Esta é uma notificação de teste inserida diretamente',
      tipo: 'info'
    };

    console.log("📝 Tentando inserir notificação teste:", testNotification);

    const { data: insertResult, error: insertError } = await supabase
      .from('notificacoes')
      .insert(testNotification)
      .select();

    console.log("✅ Resultado da inserção:", insertResult, "erro:", insertError);
  } else {
    console.warn("⚠️ Nenhum usuário unidade encontrado para teste");
  }

  // 5. Verificar notificações existentes
  const { data: existingNotifications, error: notifError } = await supabase
    .from('notificacoes')
    .select('*')
    .limit(5);

  console.log("📬 Notificações existentes (últimas 5):", existingNotifications, "erro:", notifError);

  console.log("🔍 === FIM DEBUG ===");
}

// Exportar para uso global
(window as any).debugNotifications = debugNotificationSystem;