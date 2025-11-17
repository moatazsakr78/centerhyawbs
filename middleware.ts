import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { hasPageAccess, getUnauthorizedRedirect, type UserRole } from '@/app/lib/auth/roleBasedAccess'

// Define public paths that don't require authentication
const publicPaths = [
  '/',
  '/auth/login',
  '/auth/register',
  '/auth/error',
  '/auth/logout',
  '/api',
  '/_next',
  '/favicon.ico',
  '/images',
  '/fonts',
  '/store',
  '/products',
  '/product',
  '/my-orders',
  '/profile'
]

// Define admin-only paths that require authentication and role check
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
  '/shipping'
]

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public paths without any checks
  if (publicPaths.some(path => pathname.startsWith(path))) {
    return NextResponse.next()
  }

  // Get session token
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET
  })

  // Check if trying to access admin-only path
  const isAdminPath = adminOnlyPaths.some(path => pathname.startsWith(path))

  if (isAdminPath) {
    // If no session, redirect to login
    if (!token) {
      const loginUrl = new URL('/auth/login', request.url)
      loginUrl.searchParams.set('callbackUrl', pathname)
      return NextResponse.redirect(loginUrl)
    }

    // Check role-based access
    const userRole = token.role as UserRole | null

    // If user doesn't have access to this path
    if (!hasPageAccess(userRole, pathname)) {
      const redirectPath = getUnauthorizedRedirect(userRole)

      // Prevent redirect loop - don't redirect if already on the redirect target
      if (pathname === redirectPath || pathname.startsWith(redirectPath + '?')) {
        // Just show access denied instead of redirecting
        return NextResponse.redirect(new URL('/auth/error?error=AccessDenied', request.url))
      }

      const redirectUrl = new URL(redirectPath, request.url)
      return NextResponse.redirect(redirectUrl)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
