import { NextResponse } from 'next/server'
import { generateRequestId } from './lib/logger'
import { getPortalFromHostname, DOMAINS } from './lib/domain-detector'

/**
 * Middleware - Handle domain-based routing, redirects, and request ID
 */
export function middleware(request) {
  const { pathname } = request.nextUrl

  // Generate or get request ID
  const requestId = request.headers.get('x-request-id') || generateRequestId()

  // Detect portal based on hostname
  const portal = getPortalFromHostname(request)
  
  // Add portal info to headers for API routes
  const response = NextResponse.next()
  response.headers.set('x-request-id', requestId)
  response.headers.set('x-portal', portal)
  
  // Set requestId in request headers for downstream use
  request.headers.set('x-request-id', requestId)
  request.headers.set('x-portal', portal)

  // Domain-based routing protection (in production)
  // In development, allow access via pathname
  if (process.env.NODE_ENV === 'production') {
    // Protect admin routes - only accessible from standard domain
    if (pathname.startsWith('/admin') && portal !== DOMAINS.ADMIN) {
      const adminDomain = process.env.NEXT_PUBLIC_ADMIN_DOMAIN || 'admin.partytix.com'
      const url = new URL(request.url)
      url.hostname = adminDomain
      return NextResponse.redirect(url, 301)
    }

    // Protect merchant routes - only accessible from merchant domain
    if (pathname.startsWith('/merchant') && portal !== DOMAINS.MERCHANT) {
      const merchantDomain = process.env.NEXT_PUBLIC_MERCHANT_DOMAIN || 'merchant.partytix.com'
      const url = new URL(request.url)
      url.hostname = merchantDomain
      return NextResponse.redirect(url, 301)
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
    // Match all routes to enable domain-based routing
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
    '/event/:path*',
    '/events/:path*',
    '/merchant/:path*',
    '/admin/:path*'
  ]
}
