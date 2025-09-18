import { supabase } from "@/integrations/supabase/client";

export async function debugNotificationIssue() {
  console.log("🐛 === DEBUG NOTIFICATION ISSUE ===");

  try {
    // 1. Check all profiles in the table
    console.log("1️⃣ Fetching ALL profiles from table...");
    const { data: allProfiles, error: allError } = await supabase
      .from('profiles')
      .select('user_id, user_type, full_name')
      .order('user_type');

    if (allError) {
      console.error("❌ Error fetching all profiles:", allError);
      return;
    }

    console.log(`📊 Total profiles found: ${allProfiles.length}`);
    console.table(allProfiles);

    // 2. Group by user_type
    const groupedByType = allProfiles.reduce((acc, profile) => {
      const type = profile.user_type || 'null/undefined';
      if (!acc[type]) acc[type] = [];
      acc[type].push(profile);
      return acc;
    }, {} as Record<string, any[]>);

    console.log("📊 Profiles grouped by user_type:");
    Object.entries(groupedByType).forEach(([type, profiles]) => {
      console.log(`🏷️ Type "${type}": ${profiles.length} users`);
      profiles.forEach(profile => {
        console.log(`   - ${profile.full_name || 'No Name'} (ID: ${profile.user_id})`);
      });
    });

    // 3. Specific query for 'unidade' type (exactly as the notification service does)
    console.log("\n2️⃣ Testing EXACT query used by notification service...");
    const { data: unidadeProfiles, error: unidadeError } = await supabase
      .from('profiles')
      .select('user_id, user_type, full_name')
      .eq('user_type', 'unidade');

    if (unidadeError) {
      console.error("❌ Error fetching unidade profiles:", unidadeError);
    } else {
      console.log(`🏢 Unidade profiles found: ${unidadeProfiles.length}`);
      console.table(unidadeProfiles);
    }

    // 4. Check for case sensitivity issues
    console.log("\n3️⃣ Checking for case sensitivity issues...");
    const possibleVariations = ['unidade', 'Unidade', 'UNIDADE', 'unidade ', ' unidade'];

    for (const variation of possibleVariations) {
      const { data: testProfiles, error: testError } = await supabase
        .from('profiles')
        .select('user_id, user_type, full_name')
        .eq('user_type', variation);

      if (!testError && testProfiles.length > 0) {
        console.log(`✅ Found ${testProfiles.length} profiles with user_type="${variation}"`);
      }
    }

    // 5. Check exact values in user_type column
    console.log("\n4️⃣ Getting unique user_type values...");
    const { data: uniqueTypes, error: typesError } = await supabase
      .from('profiles')
      .select('user_type')
      .not('user_type', 'is', null);

    if (!typesError) {
      const uniqueValues = [...new Set(uniqueTypes.map(p => p.user_type))];
      console.log("🔍 Unique user_type values found:", uniqueValues);
    }

    // 6. Test notification creation manually
    console.log("\n5️⃣ Testing manual notification creation for unidade users...");
    if (unidadeProfiles && unidadeProfiles.length > 0) {
      const testUserId = unidadeProfiles[0].user_id;
      console.log(`📝 Creating test notification for user: ${testUserId}`);

      const { data: testNotification, error: notifError } = await supabase
        .from('notificacoes')
        .insert({
          user_id: testUserId,
          titulo: 'Debug Test Notification',
          mensagem: 'This is a test notification to debug the issue',
          tipo: 'info'
        })
        .select()
        .single();

      if (notifError) {
        console.error("❌ Error creating test notification:", notifError);
      } else {
        console.log("✅ Test notification created successfully:", testNotification);

        // Clean up test notification
        await supabase
          .from('notificacoes')
          .delete()
          .eq('id', testNotification.id);
        console.log("🧹 Test notification cleaned up");
      }
    }

  } catch (err) {
    console.error("❌ Unexpected error in debug function:", err);
  }

  console.log("🐛 === END DEBUG NOTIFICATION ISSUE ===");
}

// Export to window for console usage
if (typeof window !== 'undefined') {
  (window as any).debugNotificationIssue = debugNotificationIssue;
}