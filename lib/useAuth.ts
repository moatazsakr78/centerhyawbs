'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/app/lib/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { getOAuthRedirectUrl } from './utils/auth-urls';

export interface AuthUser {
  id: string;
  email: string | undefined;
  name: string | undefined;
  avatar: string | undefined;
  phone: string | undefined;
}

export interface AuthState {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    loading: true,
    initialized: false
  });

  // Convert Supabase user to our AuthUser format
  const formatUser = useCallback((user: User | null): AuthUser | null => {
    if (!user) return null;
    
    return {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0],
      avatar: user.user_metadata?.avatar_url || user.user_metadata?.picture,
      phone: user.phone
    };
  }, []);

  // Initialize auth state
  useEffect(() => {
    let mounted = true;

    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
        }

        if (mounted) {
          setAuthState({
            user: formatUser(session?.user ?? null),
            session,
            loading: false,
            initialized: true
          });
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        if (mounted) {
          setAuthState({
            user: null,
            session: null,
            loading: false,
            initialized: true
          });
        }
      }
    };

    initializeAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (mounted) {
          setAuthState({
            user: formatUser(session?.user ?? null),
            session,
            loading: false,
            initialized: true
          });
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [formatUser]);

  // Sign in with Google
  const signInWithGoogle = useCallback(async () => {
    try {
      const redirectUrl = getOAuthRedirectUrl('/auth/callback');
      console.log('🔗 OAuth Debug Info:');
      console.log('- Redirect URL:', redirectUrl);
      console.log('- Current window origin:', typeof window !== 'undefined' ? window.location.origin : 'server-side');
      console.log('- Environment NEXT_PUBLIC_SITE_URL:', process.env.NEXT_PUBLIC_SITE_URL);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl
        }
      });

      if (error) {
        console.error('❌ OAuth Error:', error);
        throw error;
      }

      console.log('✅ OAuth initiated successfully');
      return { success: true, data };
    } catch (error) {
      console.error('Error signing in with Google:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'خطأ في تسجيل الدخول' 
      };
    }
  }, []);

  // Sign in with email/password
  const signInWithEmail = useCallback(async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        throw error;
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error signing in with email:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'خطأ في تسجيل الدخول' 
      };
    }
  }, []);

  // Sign up with email/password
  const signUpWithEmail = useCallback(async (email: string, password: string, name?: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name
          }
        }
      });

      if (error) {
        throw error;
      }

      return { success: true, data };
    } catch (error) {
      console.error('Error signing up:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'خطأ في إنشاء الحساب' 
      };
    }
  }, []);

  // Sign out
  const signOut = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        throw error;
      }

      return { success: true };
    } catch (error) {
      console.error('Error signing out:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'خطأ في تسجيل الخروج' 
      };
    }
  }, []);

  return {
    user: authState.user,
    session: authState.session,
    loading: authState.loading,
    initialized: authState.initialized,
    isAuthenticated: !!authState.user,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signOut
  };
}