'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
  hasPageAccess,
  getUserRoleFromProfile,
  UserRole,
  getUnauthorizedMessage,
  getUnauthorizedRedirect
} from '@/app/lib/auth/roleBasedAccess';

interface UseRoleAccessReturn {
  userRole: UserRole | null;
  hasAccess: boolean;
  isLoading: boolean;
  unauthorizedMessage: string;
  checkAccess: (path?: string) => boolean;
  redirectToAuthorized: () => void;
}

export const useRoleAccess = (requiredPath?: string): UseRoleAccessReturn => {
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  // استخدام NextAuth بدلاً من Supabase Auth
  const { data: session, status } = useSession();
  const isLoading = status === 'loading';

  const currentPath = requiredPath || pathname;

  useEffect(() => {
    // عندما تتغير session، حدث role
    if (status === 'loading') {
      return; // انتظر حتى ينتهي التحميل
    }

    if (!session?.user) {
      setUserRole(null);
      return;
    }

    // الحصول على role مباشرة من NextAuth session
    const role = (session.user as any).role as string | undefined;

    if (role && ['عميل', 'جملة', 'موظف', 'أدمن رئيسي'].includes(role)) {
      setUserRole(role as UserRole);
    } else {
      setUserRole(null);
    }
  }, [session, status]);

  const checkAccess = (path?: string): boolean => {
    const pathToCheck = path || currentPath;
    return userRole && pathToCheck ? hasPageAccess(userRole, pathToCheck) : false;
  };

  const redirectToAuthorized = () => {
    const redirectPath = getUnauthorizedRedirect(userRole);
    router.push(redirectPath);
  };

  const hasAccess = checkAccess();
  const unauthorizedMessage = getUnauthorizedMessage(userRole);

  return {
    userRole,
    hasAccess,
    isLoading,
    unauthorizedMessage,
    checkAccess,
    redirectToAuthorized
  };
};

// Hook specifically for protecting pages
export const usePageProtection = (redirectOnUnauthorized: boolean = false) => {
  const { userRole, hasAccess, isLoading, redirectToAuthorized } = useRoleAccess();

  useEffect(() => {
    if (!isLoading && !hasAccess && redirectOnUnauthorized) {
      redirectToAuthorized();
    }
  }, [isLoading, hasAccess, redirectOnUnauthorized, redirectToAuthorized]);

  return {
    userRole,
    hasAccess,
    isLoading,
    shouldRender: isLoading || hasAccess
  };
};