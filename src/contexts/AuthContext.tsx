import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export type UserType = 'matriz' | 'unidade';

export interface Profile {
  id: string;
  user_id: string;
  full_name: string | null;
  user_type: UserType;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string, userType: UserType) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName: string, userType: UserType) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updatePassword: (password: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const cleanupAuthState = () => {
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      localStorage.removeItem(key);
    }
  });
  Object.keys(sessionStorage || {}).forEach((key) => {
    if (key.startsWith('supabase.auth.') || key.includes('sb-')) {
      sessionStorage.removeItem(key);
    }
  });
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error fetching profile:', error);
      return null;
    }
  };

  const autoUpdateInviteStatus = async (userEmail: string, userId: string, userType: UserType) => {
    try {
      console.log('Checking for pending invites for:', userEmail, 'Type:', userType);

      // Only process for unidade users
      if (userType !== 'unidade') {
        return;
      }

      // Check for pending franchise invites
      const { data: pendingInvites, error: inviteError } = await supabase
        .from('convites_franqueados')
        .select('id, unidade_id, aceito, expires_at')
        .eq('email', userEmail)
        .eq('aceito', false);

      if (inviteError) {
        console.error('Error checking pending invites:', inviteError);
        return;
      }

      if (!pendingInvites || pendingInvites.length === 0) {
        console.log('No pending invites found for:', userEmail);
        return;
      }

      // Process valid (non-expired) invites
      const validInvites = pendingInvites.filter(invite =>
        new Date(invite.expires_at) > new Date()
      );

      if (validInvites.length === 0) {
        console.log('All invites expired for:', userEmail);
        return;
      }

      console.log(`Found ${validInvites.length} valid pending invites for ${userEmail}`);

      // Update invites to accepted and associate with user
      for (const invite of validInvites) {
        try {
          // Mark invite as accepted
          const { error: updateInviteError } = await supabase
            .from('convites_franqueados')
            .update({
              aceito: true,
              user_id_aceito: userId,
              updated_at: new Date().toISOString()
            })
            .eq('id', invite.id);

          if (updateInviteError) {
            console.error('Error updating invite:', invite.id, updateInviteError);
            continue;
          }

          // Associate unit with user
          const { error: updateUnitError } = await supabase
            .from('unidades')
            .update({ user_id: userId })
            .eq('id', invite.unidade_id);

          if (updateUnitError) {
            console.error('Error associating unit to user:', updateUnitError);
            // Don't throw - invite is still marked as accepted
          }

          console.log(`Successfully updated invite ${invite.id} and associated unit ${invite.unidade_id}`);
        } catch (error) {
          console.error('Error processing invite:', invite.id, error);
        }
      }

    } catch (error) {
      console.error('Error in autoUpdateInviteStatus:', error);
      // Don't throw - this is a background process
    }
  };

  useEffect(() => {
    let isInitialLoad = true;

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user?.id);

        // Skip if this is the initial SIGNED_IN event to avoid double fetching
        if (isInitialLoad && event === 'SIGNED_IN') {
          isInitialLoad = false;
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          console.log('Fetching profile for user:', session.user.id);
          const profileData = await fetchProfile(session.user.id);
          console.log('Profile fetched:', profileData);
          setProfile(profileData);

          // Auto-update invite status when user logs in
          if (profileData && session.user.email) {
            await autoUpdateInviteStatus(session.user.email, session.user.id, profileData.user_type);
          }
        } else {
          console.log('No session, clearing profile');
          setProfile(null);
        }

        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log('Checking existing session:', session?.user?.id);
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        console.log('Fetching profile for existing session:', session.user.id);
        const profileData = await fetchProfile(session.user.id);
        console.log('Profile fetched for existing session:', profileData);
        setProfile(profileData);

        // Auto-update invite status when checking existing session
        if (profileData && session.user.email) {
          await autoUpdateInviteStatus(session.user.email, session.user.id, profileData.user_type);
        }
      }

      setLoading(false);
      isInitialLoad = false;
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string, userType: UserType) => {
    try {
      setLoading(true);
      
      // Clean up existing state
      cleanupAuthState();
      
      // Attempt global sign out
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        // Continue even if this fails
      }
      
      // Sign in with email/password
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) return { error };
      
      if (data.user) {
        // Fetch profile to verify user type
        const profileData = await fetchProfile(data.user.id);
        
        if (!profileData) {
          await supabase.auth.signOut();
          return { error: { message: 'Perfil de usuário não encontrado.' } };
        }
        
        if (profileData.user_type !== userType) {
          await supabase.auth.signOut();
          return { 
            error: { 
              message: `Acesso negado. Esta conta é do tipo '${profileData.user_type}', mas você está tentando acessar '${userType}'.` 
            } 
          };
        }
        
        // Let React Router handle navigation - no forced redirects
        setProfile(profileData);
      }
      
      return { error: null };
    } catch (error) {
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, fullName: string, userType: UserType) => {
    try {
      setLoading(true);
      
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName,
            user_type: userType
          }
        }
      });
      
      return { error };
    } catch (error) {
      return { error };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      cleanupAuthState();
      
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        // Ignore errors
      }
      
      // Let React Router handle navigation
      setUser(null);
      setSession(null);
      setProfile(null);
    } catch (error) {
      console.error('Error signing out:', error);
      // Force clear state on error
      setUser(null);
      setSession(null);
      setProfile(null);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      console.log('Sending password reset to:', email);
      
      const { error } = await supabase.functions.invoke('send-password-reset', {
        body: { 
          email,
          redirectOrigin: window.location.origin
        }
      });

      if (error) {
        console.error('Error sending password reset email:', error);
        return { error };
      }

      console.log('Password reset email sent successfully');
      return { error: null };
    } catch (error) {
      console.error('Unexpected error in resetPassword:', error);
      return { error };
    }
  };

  const updatePassword = async (password: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });
      
      return { error };
    } catch (error) {
      return { error };
    }
  };

  const value = {
    user,
    session,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
  };

  // Prevent rendering if children is not valid
  if (!children || (typeof children === 'object' && !React.isValidElement(children) && !Array.isArray(children))) {
    console.error('AuthProvider: Invalid children provided');
    return null;
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};