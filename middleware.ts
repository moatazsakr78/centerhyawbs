import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { hasPageAccess, getUnauthorizedRedirect, type UserRole } from '@/app/lib/auth/roleBasedAccess'

// Paths that don't need any authentication or authorization
const alwaysPublicPaths = [
  '/auth/login',
  '/auth/register',
  '/auth/error',
  '/auth/logout',
  '/api/auth', // NextAuth API routes
]

// Paths that require authentication and specific roles
const adminOnlyPaths = [
  '/dashboard',
  '/pos',
  '/inventory',
  '/customers',
  '/suppliers',
  '/records',
  '/reports',
  '/permissions',
  '/admin',
  '/customer-orders',
  '/shipping',
  '/products', // النظام (مش المتجر)
  '/settings',
]

// Paths for customers only (admins should use customer-orders instead)
const customerOnlyPaths = [
  '/my-orders',
  '/cart',
  '/checkout',
]

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  console.log('🔍 Middleware checking:', pathname)

  // Skip NextAuth internal routes and static files
  if (pathname.startsWith('/api/auth') ||
      pathname.startsWith('/_next') ||
      pathname.startsWith('/favicon') ||
      pathname.startsWith('/images') ||
      pathname.startsWith('/fonts')) {
    return NextResponse.next()
  }

  // Allow always-public paths (login, register, etc.)
  if (alwaysPublicPaths.some(path => pathname === path || pathname.startsWith(path + '/'))) {
    console.log('✅ Public path, allowing')
    return NextResponse.next()
  }

  // Get session token
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET
  })

  console.log('👤 User role:', token?.role || 'Not authenticated')

  const userRole = token?.role as UserRole | null

  // Check if it's an admin-only path
  const isAdminPath = adminOnlyPaths.some(path =>
    pathname === path || pathname.startsWith(path + '/')
  )

  // Check if it's a customer-only path
  const isCustomerPath = customerOnlyPaths.some(path =>
    pathname === path || pathname.startsWith(path + '/')
  )

  // Block admin paths for non-admins
  if (isAdminPath) {
    console.log('🔒 Admin-only path detected')

    // If no session, redirect to login
    if (!token) {
      console.log('❌ No token, redirecting to login')
      const loginUrl = new URL('/auth/login', request.url)
      loginUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Check if user has access
    const hasAccess = hasPageAccess(userRole, pathname)
    console.log('🔍 Admin path - Role:', userRole, '→ Access:', hasAccess)

    if (!hasAccess) {
      console.log('❌ Access denied! Redirecting to home')
      return NextResponse.redirect(new URL('/', request.url))
    }

    console.log('✅ Access granted')
  }

  // Block customer paths for admins (they should use customer-orders instead of my-orders)
  if (isCustomerPath && userRole) {
    console.log('🔒 Customer-only path detected')

    const isAdmin = userRole === 'أدمن رئيسي' || userRole === 'موظف'

    if (isAdmin) {
      console.log('❌ Admins cannot access customer pages, redirecting to customer-orders')
      // Redirect admin to customer-orders instead of my-orders
      if (pathname.startsWith('/my-orders')) {
        return NextResponse.redirect(new URL('/customer-orders', request.url))
      }
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }

    console.log('✅ Customer access granted')
  }

  console.log('✅ Allowing access to:', pathname)
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes (handled separately)
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
