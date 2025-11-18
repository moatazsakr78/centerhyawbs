import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { hasPageAccess, rolePermissions, type UserRole } from '@/app/lib/auth/roleBasedAccess'
import { jwtVerify } from 'jose'

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

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🔍 MIDDLEWARE START - Path:', pathname)
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')

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

  // Check for NextAuth session cookie
  const sessionCookie = request.cookies.get(
    process.env.NODE_ENV === 'production'
      ? '__Secure-next-auth.session-token'
      : 'next-auth.session-token'
  )

  const hasSession = !!sessionCookie
  console.log('👤 Session cookie exists:', hasSession)

  // Try to read role from JWT token
  let userRole: UserRole | null = null

  if (sessionCookie?.value) {
    try {
      const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET)
      const { payload } = await jwtVerify(sessionCookie.value, secret)

      console.log('🔍 Full JWT payload:', JSON.stringify(payload, null, 2))

      userRole = payload.role as UserRole | null
      console.log('👤 Role from JWT:', userRole, '(Type:', typeof userRole, ')')

      if (!userRole) {
        console.log('⚠️ WARNING: No role found in JWT! User needs to re-login.')
      }
    } catch (error) {
      console.error('❌ Error reading JWT:', error)
      console.error('Error details:', error instanceof Error ? error.message : String(error))
    }
  }

  // Check if it's an admin-only path
  const isAdminPath = adminOnlyPaths.some(path =>
    pathname === path || pathname.startsWith(path + '/')
  )

  // Check if it's a customer-only path
  const isCustomerPath = customerOnlyPaths.some(path =>
    pathname === path || pathname.startsWith(path + '/')
  )

  // Block admin paths for non-authenticated users
  if (isAdminPath) {
    console.log('🔒 Admin-only path detected:', pathname)

    // If no session cookie, redirect to login
    if (!hasSession) {
      console.log('❌ No session, redirecting to login')
      const loginUrl = new URL('/auth/login', request.url)
      loginUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Check if user has access based on role
    const hasAccess = hasPageAccess(userRole, pathname)
    console.log('🔍 Authorization check:', {
      path: pathname,
      userRole: userRole,
      hasAccess: hasAccess,
      allowedRoles: ['أدمن رئيسي', 'موظف']
    })

    if (!hasAccess) {
      console.log('❌ Access DENIED! Redirecting to homepage')
      return NextResponse.redirect(new URL('/', request.url))
    }

    console.log('✅ Access GRANTED!')
  }

  // Customer paths - just check for session
  if (isCustomerPath && hasSession) {
    console.log('✅ Customer path with session, allowing')
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
