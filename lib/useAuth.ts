'use client';

import { useSession } from 'next-auth/react';
import { useCallback } from 'react';

export interface AuthUser {
  id: string;
  email: string | undefined;
  name: string | undefined;
  avatar: string | undefined;
  phone: string | undefined;
}

export interface AuthState {
  user: AuthUser | null;
  session: any | null;
  loading: boolean;
  initialized: boolean;
}

export function useAuth() {
  // Use NextAuth session
  const { data: session, status } = useSession();

  // Format NextAuth session to our AuthUser format
  const formatUser = useCallback((): AuthUser | null => {
    if (!session?.user) return null;

    return {
      id: (session.user as any).id || '',
      email: session.user.email || undefined,
      name: session.user.name || session.user.email?.split('@')[0] || undefined,
      avatar: session.user.image || undefined,
      phone: undefined
    };
  }, [session]);

  // Sign in with Google (redirect to NextAuth)
  const signInWithGoogle = useCallback(async () => {
    try {
      const { signIn } = await import('next-auth/react');
      await signIn('google', { callbackUrl: '/' });
      return { success: true };
    } catch (error) {
      console.error('Error signing in with Google:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'خطأ في تسجيل الدخول'
      };
    }
  }, []);

  // Sign in with email/password (redirect to NextAuth)
  const signInWithEmail = useCallback(async (email: string, password: string) => {
    try {
      const { signIn } = await import('next-auth/react');
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        return {
          success: false,
          error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
        };
      }

      return { success: true };
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
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name })
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || 'فشل التسجيل'
        };
      }

      return { success: true };
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
      const { signOut: nextAuthSignOut } = await import('next-auth/react');
      await nextAuthSignOut({ callbackUrl: '/' });
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
    user: formatUser(),
    session: session,
    loading: status === 'loading',
    initialized: status !== 'loading',
    isAuthenticated: status === 'authenticated',
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signOut
  };
}