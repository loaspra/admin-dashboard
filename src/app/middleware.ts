import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const pathname = req.nextUrl.pathname

  // Create supabase middleware client
  const supabase = createMiddlewareClient({ req, res })
  
  // Check auth status
  const { data: { session } } = await supabase.auth.getSession()

  // Auth condition - allow public routes, check auth for protected routes
  const isAuth = !!session
  
  // Public routes
  const isPublicRoute = pathname === '/login'
  
  // Protected routes
  const isProtectedRoute = pathname === '/dashboard' || pathname.startsWith('/dashboard/')

  // Handle authentication
  if (isPublicRoute && isAuth) {
    // If authenticated and on public route, redirect to dashboard
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  if (isProtectedRoute && !isAuth) {
    // If not authenticated and on protected route, redirect to login
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return res
}

export const config = {
  // Apply this middleware to all routes except static files
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}