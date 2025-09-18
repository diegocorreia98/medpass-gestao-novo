import { supabase } from "@/integrations/supabase/client";

export async function createMissingProfile() {
  console.log("🔧 === CRIANDO PROFILE AUSENTE ===");

  try {
    // 1. Get current authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("❌ No authenticated user found:", userError?.message);
      console.log("💡 Please make sure you are logged in to the application.");
      return;
    }

    console.log("👤 Current authenticated user:", user.id, user.email);

    // 2. Check if profile already exists
    const { data: existingProfile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error("❌ Error checking existing profile:", profileError);
      return;
    }

    if (existingProfile) {
      console.log("👤 User already has profile:", existingProfile);
      return existingProfile;
    }

    // 3. Create profile for current user
    console.log("📝 Creating profile for current user...");

    // Determine user type based on email
    let userType = 'unidade'; // Default
    if (user.email?.includes('marketing@franquiascotafacil.com.br')) {
      userType = 'matriz';
    }

    const profileData = {
      user_id: user.id,
      full_name: user.email?.split('@')[0] || 'Usuário',
      user_type: userType
    };

    const { data: newProfile, error: insertError } = await supabase
      .from('profiles')
      .insert(profileData)
      .select()
      .single();

    if (insertError) {
      console.error("❌ Error creating profile:", insertError);
      return;
    }

    console.log("✅ Profile created successfully:", newProfile);

    // 4. Verify all profiles now
    console.log("🔍 Verifying all profiles...");
    const { data: allProfiles, error: verifyError } = await supabase
      .from('profiles')
      .select('user_id, user_type, full_name');

    if (verifyError) {
      console.error("❌ Error verifying profiles:", verifyError);
      return;
    }

    console.log("👥 All profiles in system:");
    console.table(allProfiles);

    const unidadeUsers = allProfiles.filter(p => p.user_type === 'unidade');
    console.log(`🏢 Unidade users found: ${unidadeUsers.length}`);

    if (unidadeUsers.length > 0) {
      console.log("🎉 SUCCESS! Unidade users now exist. Notifications should work!");
      console.log("💡 Try sending a notification to unidades again.");
    }

    return newProfile;

  } catch (err) {
    console.error("❌ Unexpected error:", err);
  }

  console.log("🔧 === END CREATE MISSING PROFILE ===");
}

// Also create a function to create a test unidade user
export async function createTestUnidadeUser() {
  console.log("🔧 === CRIANDO USUÁRIO TESTE UNIDADE ===");

  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("❌ No authenticated user found");
      return;
    }

    // Check current profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      console.log("📝 No profile found, creating one...");
      await createMissingProfile();
      return;
    }

    // Update to unidade type
    const { data: updatedProfile, error: updateError } = await supabase
      .from('profiles')
      .update({ user_type: 'unidade' })
      .eq('user_id', user.id)
      .select()
      .single();

    if (updateError) {
      console.error("❌ Error updating profile:", updateError);
      return;
    }

    console.log("✅ Profile updated to unidade:", updatedProfile);
    console.log("🔄 Reload the page to see changes take effect.");

  } catch (err) {
    console.error("❌ Error:", err);
  }

  console.log("🔧 === END CREATE TEST UNIDADE USER ===");
}

// Export to window for console usage
if (typeof window !== 'undefined') {
  (window as any).createMissingProfile = createMissingProfile;
  (window as any).createTestUnidadeUser = createTestUnidadeUser;
}