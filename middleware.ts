import { NextResponse, type NextRequest } from 'next/server'
import { generateRequestId } from './lib/logger'
import { getPortalFromHostname, DOMAINS } from './lib/domain-detector'

/**
 * Middleware - Handle path-based and domain-based routing, redirects, and request ID
 * 
 * IMPORTANT: This middleware does NOT interact with Supabase or session cookies.
 * All Supabase session management is handled in API routes using createSupabaseRouteHandlerClient.
 * This prevents cookie corruption from repeated session refresh operations.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const requestId = request.headers.get('x-request-id') || generateRequestId()
  const portal = getPortalFromHostname(request)

  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  response.headers.set('x-request-id', requestId)
  response.headers.set('x-portal', portal)
  request.headers.set('x-request-id', requestId)
  request.headers.set('x-portal', portal)

  const customerDomain = process.env.NEXT_PUBLIC_CUSTOMER_DOMAIN || ''
  const merchantDomain = process.env.NEXT_PUBLIC_MERCHANT_DOMAIN || ''
  const adminDomain = process.env.NEXT_PUBLIC_ADMIN_DOMAIN || ''

  const isPathBasedRouting =
    customerDomain.includes('/customer') ||
    merchantDomain.includes('/merchant') ||
    adminDomain.includes('/admin')

  if (isPathBasedRouting) {
    if (pathname.startsWith('/admin')) {
      if (portal !== DOMAINS.ADMIN) {
        return response
      }
    } else if (pathname.startsWith('/merchant')) {
      if (portal !== DOMAINS.MERCHANT) {
        return response
      }
    } else if (portal === DOMAINS.CUSTOMER) {
      return response
    } else if (
      (pathname.startsWith('/auth') || pathname === '/' || pathname.startsWith('/events')) &&
      portal !== DOMAINS.CUSTOMER
    ) {
      const baseUrl = request.nextUrl.origin
      const url = new URL(pathname, baseUrl)
      return NextResponse.redirect(url, 301)
    }
  } else {
    if (process.env.NODE_ENV === 'production') {
      if (pathname.startsWith('/admin') && portal !== DOMAINS.ADMIN) {
        const adminHost = process.env.NEXT_PUBLIC_ADMIN_DOMAIN || 'admin.partytix.com'
        const url = new URL(request.url)
        try {
          const adminUrl = new URL(adminHost)
          url.hostname = adminUrl.hostname
        } catch {
          url.hostname = adminHost
        }
        return NextResponse.redirect(url, 301)
      }

      if (pathname.startsWith('/merchant') && portal !== DOMAINS.MERCHANT) {
        const merchantHost = process.env.NEXT_PUBLIC_MERCHANT_DOMAIN || 'merchant.partytix.com'
        const url = new URL(request.url)
        try {
          const merchantUrl = new URL(merchantHost)
          url.hostname = merchantUrl.hostname
        } catch {
          url.hostname = merchantHost
        }
        return NextResponse.redirect(url, 301)
      }
    }
  }

  const uuidMatch = pathname.match(
    /^\/events\/([0-9a-fA-F-]{8}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{12})$/
  )
  if (uuidMatch) {
    const uuid = uuidMatch[1]
    const url = new URL('/api/compat/uuid-to-slug', request.url)
    url.searchParams.set('id', uuid)
    return NextResponse.redirect(url, 302)
  }

  const eventsMatch = pathname.match(/^\/events\/(.+)$/)
  if (eventsMatch) {
    const slug = eventsMatch[1]
    return NextResponse.redirect(new URL(`/event/${slug}`, request.url), 301)
  }

  if (pathname === '/event/ridiculous-chicken') {
    return NextResponse.redirect(new URL('/event/ridiculous-chicken', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
    '/api/checkout_sessions',
    '/api/orders/:path*',
    '/api/tickets/:path*',
    '/api/events/:path*',
    '/api/merchant/:path*',
    '/api/admin/:path*',
    '/api/users/:path*',
    '/api/auth/:path*',
  ],
}

