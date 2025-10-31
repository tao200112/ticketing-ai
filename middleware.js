import { NextResponse } from 'next/server'
import { generateRequestId } from './lib/logger'
import { getPortalFromHostname, DOMAINS } from './lib/domain-detector'

/**
 * Middleware - Handle path-based and domain-based routing, redirects, and request ID
 */
export function middleware(request) {
  const { pathname } = request.nextUrl

  // Generate or get request ID
  const requestId = request.headers.get('x-request-id') || generateRequestId()

  // Detect portal based on pathname (priority) or hostname
  const portal = getPortalFromHostname(request)
  
  // Add portal info to headers for API routes
  const response = NextResponse.next()
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
    // Match all routes to enable path-based and domain-based routing
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
    '/event/:path*',
    '/events/:path*',
    '/merchant/:path*',
    '/admin/:path*'
  ]
}
