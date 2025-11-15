import { NextResponse } from 'next/server'
import { generateRequestId } from './lib/logger'
import { getPortalFromHostname, DOMAINS } from './lib/domain-detector'
import { createServerClient } from '@supabase/ssr'

/**
 * Middleware - Handle path-based and domain-based routing, redirects, and request ID
 * Also refreshes Supabase session cookies
 */
export async function middleware(request) {
  const { pathname } = request.nextUrl

  // Generate or get request ID
  const requestId = request.headers.get('x-request-id') || generateRequestId()

  // Detect portal based on pathname (priority) or hostname
  const portal = getPortalFromHostname(request)
  
  // Create response early for Supabase session refresh
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // Refresh Supabase session in middleware
  // This ensures cookies are available for API routes
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (supabaseUrl && supabaseAnonKey) {
      const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              request.cookies.set(name, value)
              response.cookies.set(name, value, options)
            })
          },
        },
      })

      // Refresh session - this updates cookies if needed
      await supabase.auth.getUser()
    }
  } catch (error) {
    // If session refresh fails, continue with request
    // This is expected for unauthenticated requests
    console.warn('[middleware] Session refresh failed:', error.message)
  }
  
  // Add portal info to headers for API routes
  response.headers.set('x-request-id', requestId)
  response.headers.set('x-portal', portal)
  
  // Set requestId in request headers for downstream use
  request.headers.set('x-request-id', requestId)
  request.headers.set('x-portal', portal)

  // Check if using path-based routing
  const customerDomain = process.env.NEXT_PUBLIC_CUSTOMER_DOMAIN || ''
  const merchantDomain = process.env.NEXT_PUBLIC_MERCHANT_DOMAIN || ''
  const adminDomain = process.env.NEXT_PUBLIC_ADMIN_DOMAIN || ''
  
  const isPathBasedRouting = customerDomain.includes('/customer') || 
                             merchantDomain.includes('/merchant') ||
                             adminDomain.includes('/admin')

  if (isPathBasedRouting) {
    // Path-based routing mode
    // Ensure routes match their portal paths
    
    // Admin routes must be under /admin path
    if (pathname.startsWith('/admin')) {
      // Already on /admin path, portal should be admin
      if (portal !== DOMAINS.ADMIN) {
        // This shouldn't happen, but ensure consistency
        return response
      }
    }
    // Merchant routes must be under /merchant path
    else if (pathname.startsWith('/merchant')) {
      if (portal !== DOMAINS.MERCHANT) {
        // This shouldn't happen, but ensure consistency
        return response
      }
    }
    // Customer routes: root, /auth, /events, etc.
    else if (portal === DOMAINS.CUSTOMER) {
      // Customer portal access, allow it
      return response
    }
    // If accessing customer routes but portal detected as merchant/admin, redirect
    else if ((pathname.startsWith('/auth') || pathname === '/' || pathname.startsWith('/events')) && portal !== DOMAINS.CUSTOMER) {
      // Redirect to customer portal if trying to access customer routes from wrong portal
      const baseUrl = request.nextUrl.origin
      const url = new URL(pathname, baseUrl)
      return NextResponse.redirect(url, 301)
    }
  } else {
    // Domain-based routing protection (original implementation)
    if (process.env.NODE_ENV === 'production') {
      // Protect admin routes - only accessible from admin domain
      if (pathname.startsWith('/admin') && portal !== DOMAINS.ADMIN) {
        const adminDomain = process.env.NEXT_PUBLIC_ADMIN_DOMAIN || 'admin.partytix.com'
        const url = new URL(request.url)
        try {
          const adminUrl = new URL(adminDomain)
          url.hostname = adminUrl.hostname
        } catch {
          url.hostname = adminDomain
        }
        return NextResponse.redirect(url, 301)
      }

      // Protect merchant routes - only accessible from merchant domain
      if (pathname.startsWith('/merchant') && portal !== DOMAINS.MERCHANT) {
        const merchantDomain = process.env.NEXT_PUBLIC_MERCHANT_DOMAIN || 'merchant.partytix.com'
        const url = new URL(request.url)
        try {
          const merchantUrl = new URL(merchantDomain)
          url.hostname = merchantUrl.hostname
        } catch {
          url.hostname = merchantDomain
        }
        return NextResponse.redirect(url, 301)
      }
    }
  }

  // UUID format matching: /events/<uuid> → /api/compat/uuid-to-slug?id=<uuid>
  const uuidMatch = pathname.match(/^\/events\/([0-9a-fA-F-]{8}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{12})$/)
  if (uuidMatch) {
    const uuid = uuidMatch[1]
    const url = new URL('/api/compat/uuid-to-slug', request.url)
    url.searchParams.set('id', uuid)
    return NextResponse.redirect(url, 302)
  }

  // Plural to singular redirect: /events/<slug> → /event/<slug>
  const eventsMatch = pathname.match(/^\/events\/(.+)$/)
  if (eventsMatch) {
    const slug = eventsMatch[1]
    return NextResponse.redirect(new URL(`/event/${slug}`, request.url), 301)
  }

  // Redirect old event page to new slug route
  if (pathname === '/event/ridiculous-chicken') {
    return NextResponse.redirect(new URL('/event/ridiculous-chicken', request.url))
  }

  return response
}

export const config = {
  matcher: [
    // Match all routes including API routes to refresh Supabase session
    // Exclude static files and Next.js internals
    '/((?!_next/static|_next/image|favicon.ico).*)',
    // Explicitly include API routes that need authentication
    '/api/checkout_sessions',
    '/api/orders/:path*',
    '/api/tickets/:path*',
    '/api/events/:path*',
    '/api/merchant/:path*',
    '/api/admin/:path*',
    '/api/users/:path*',
    '/api/auth/:path*',
  ]
}
