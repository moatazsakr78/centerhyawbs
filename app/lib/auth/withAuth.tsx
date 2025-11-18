'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { type UserRole } from './roleBasedAccess'

interface WithAuthOptions {
  allowedRoles?: UserRole[]
  redirectTo?: string
}

/**
 * HOC لحماية الصفحات - يتحقق من الـ session والـ role
 */
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  options: WithAuthOptions = {}
) {
  return function ProtectedComponent(props: P) {
    const { data: session, status } = useSession()
    const router = useRouter()

    useEffect(() => {
      // لو مفيش session، روح login
      if (status === 'unauthenticated') {
        router.push('/auth/login')
        return
      }

      // لو في roles محددة، تحقق منها
      if (status === 'authenticated' && options.allowedRoles) {
        const userRole = session?.user?.role as UserRole

        if (!options.allowedRoles.includes(userRole)) {
          // لو مش مصرح، روح للصفحة المناسبة
          const redirectPath = options.redirectTo || (
            userRole === 'عميل' || userRole === 'جملة' ? '/' : '/dashboard'
          )
          router.push(redirectPath)
        }
      }
    }, [status, session, router])

    // لو لسه بيحمل
    if (status === 'loading') {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900">
          <div className="text-white text-xl">جاري التحميل...</div>
        </div>
      )
    }

    // لو مفيش session
    if (status === 'unauthenticated') {
      return null
    }

    // لو في roles محددة وما تطابقش
    if (options.allowedRoles && session?.user?.role) {
      const userRole = session.user.role as UserRole
      if (!options.allowedRoles.includes(userRole)) {
        return null
      }
    }

    // كل حاجة تمام، اعرض الصفحة
    return <Component {...props} />
  }
}

/**
 * Hook للتحقق من الصلاحيات
 */
export function useRequireAuth(allowedRoles?: UserRole[]) {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'loading') return

    if (status === 'unauthenticated') {
      router.push('/auth/login')
      return
    }

    if (allowedRoles && session?.user?.role) {
      const userRole = session.user.role as UserRole
      if (!allowedRoles.includes(userRole)) {
        router.push('/')
      }
    }
  }, [status, session, router, allowedRoles])

  return {
    session,
    loading: status === 'loading',
    authenticated: status === 'authenticated',
    userRole: session?.user?.role as UserRole | undefined
  }
}

/**
 * Component لحماية جزء من الصفحة
 */
export function ProtectedSection({
  allowedRoles,
  children,
  fallback = null
}: {
  allowedRoles: UserRole[]
  children: React.ReactNode
  fallback?: React.ReactNode
}) {
  const { data: session } = useSession()
  const userRole = session?.user?.role as UserRole | undefined

  if (!userRole || !allowedRoles.includes(userRole)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
