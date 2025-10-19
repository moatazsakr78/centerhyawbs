'use client';

import { usePageProtection } from '@/app/lib/hooks/useRoleAccess';
import UnauthorizedAccess from '@/app/components/auth/UnauthorizedAccess';


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userRole, hasAccess, isLoading } = usePageProtection();

  // Show loading state while checking permissions
  if (isLoading) {
    return (
      <div className="h-screen bg-[#2B3544] flex items-center justify-center">
        <div className="text-white text-xl">جاري التحميل...</div>
      </div>
    );
  }

  // Check if user has admin access (موظف or أدمن رئيسي)
  const hasAdminAccess = userRole === 'موظف' || userRole === 'أدمن رئيسي';

  // Show unauthorized page if user is authenticated but doesn't have access
  if (userRole && !hasAdminAccess) {
    return (
      <UnauthorizedAccess
        userRole={userRole}
        message="هذه الصفحة للمشرفين فقط، غير مصرح لك بالدخول"
      />
    );
  }

  // Render children
  return <>{children}</>;
}