/**
 * Portal Detector
 * Detects which portal (customer, merchant, admin) based on pathname or hostname
 * Supports both path-based and domain-based routing
 */

export const DOMAINS = {
  CUSTOMER: 'customer',
  MERCHANT: 'merchant',
  ADMIN: 'admin',
  UNKNOWN: 'unknown'
}

/**
 * Get portal type from request (checks pathname first, then hostname)
 * @param {Request|string} request - Request object or pathname string
 * @returns {string} - Portal type: 'customer', 'merchant', 'admin', or 'unknown'
 */
export function getPortalFromHostname(request) {
  let pathname = ''
  let hostname = ''

  // Extract pathname and hostname from request
  if (typeof request === 'string') {
    // If it's a pathname string
    if (request.startsWith('/')) {
      pathname = request
    } else {
      hostname = request
    }
  } else if (request instanceof Request) {
    const url = new URL(request.url)
    pathname = url.pathname
    hostname = request.headers.get('host') || ''
  } else if (request?.url) {
    const url = new URL(request.url)
    pathname = url.pathname
    hostname = request.headers?.host || ''
  } else if (request?.pathname) {
    pathname = request.pathname
    hostname = request.headers?.host || ''
  }

  // Priority 1: Check pathname for path-based routing
  if (pathname) {
    if (pathname.startsWith('/admin')) {
      return DOMAINS.ADMIN
    }
    if (pathname.startsWith('/merchant')) {
      return DOMAINS.MERCHANT
    }
    // Customer routes: root, /auth, /events, /account, /customer
    if (
      pathname.startsWith('/customer') || 
      pathname === '/' || 
      pathname.startsWith('/auth') || 
      pathname.startsWith('/events') || 
      pathname.startsWith('/account') ||
      pathname.startsWith('/event/') ||
      pathname.startsWith('/qr-scanner') ||
      pathname.startsWith('/contact') ||
      pathname.startsWith('/success')
    ) {
      return DOMAINS.CUSTOMER
    }
  }

  // Priority 2: Check if using path-based routing from environment variables
  const customerDomain = process.env.NEXT_PUBLIC_CUSTOMER_DOMAIN || ''
  const merchantDomain = process.env.NEXT_PUBLIC_MERCHANT_DOMAIN || ''
  const adminDomain = process.env.NEXT_PUBLIC_ADMIN_DOMAIN || ''
  
  const isPathBasedRouting = customerDomain.includes('/customer') || 
                             merchantDomain.includes('/merchant') ||
                             adminDomain.includes('/admin')

  if (isPathBasedRouting) {
    // In path-based mode, we've already checked pathname above
    // If we get here and pathname is empty, default to customer
    if (!pathname) {
      return DOMAINS.CUSTOMER
    }
    // Pathname was checked above, should have returned already
    return DOMAINS.CUSTOMER
  }

  // Priority 3: Check hostname for domain-based routing (fallback)
  if (hostname) {
    hostname = hostname.split(':')[0].toLowerCase()

    // Extract hostname from URLs if environment variables contain full URLs
    const getHostFromConfig = (config) => {
      if (!config) return ''
      try {
        const url = new URL(config)
        return url.hostname
      } catch {
        // If not a valid URL, treat as hostname
        return config.split('/')[0].split(':')[0]
      }
    }

    const customerHost = getHostFromConfig(customerDomain)
    const merchantHost = getHostFromConfig(merchantDomain)
    const adminHost = getHostFromConfig(adminDomain)
    const defaultDomain = process.env.NEXT_PUBLIC_DEFAULT_DOMAIN || ''
    const defaultHost = getHostFromConfig(defaultDomain)

    // Match domain
    if (hostname === customerHost || hostname === defaultHost || hostname === 'localhost' || hostname.includes('vercel.app')) {
      // If using path-based routing, already handled above
      if (!isPathBasedRouting) {
        return DOMAINS.CUSTOMER
      }
    }

    if (merchantHost && (hostname === merchantHost || hostname.startsWith('merchant.'))) {
      return DOMAINS.MERCHANT
    }

    if (adminHost && (hostname === adminHost || hostname.startsWith('admin.'))) {
      return DOMAINS.ADMIN
    }
  }

  // Default to customer portal
  return DOMAINS.CUSTOMER
}

/**
 * Get role based on portal type
 * @param {string} portal - Portal type
 * @returns {string} - Role: 'user', 'merchant', 'admin'
 */
export function getRoleFromPortal(portal) {
  const roleMap = {
    [DOMAINS.CUSTOMER]: 'user',
    [DOMAINS.MERCHANT]: 'merchant',
    [DOMAINS.ADMIN]: 'admin'
  }
  return roleMap[portal] || 'user'
}

/**
 * Get portal from role
 * @param {string} role - User role
 * @returns {string} - Portal type
 */
export function getPortalFromRole(role) {
  const portalMap = {
    'user': DOMAINS.CUSTOMER,
    'merchant': DOMAINS.MERCHANT,
    'admin': DOMAINS.ADMIN
  }
  return portalMap[role] || DOMAINS.CUSTOMER
}

/**
 * Check if user should have access to current portal
 * @param {string} userRole - User's role
 * @param {string} currentPortal - Current portal
 * @returns {boolean}
 */
export function hasPortalAccess(userRole, currentPortal) {
  const requiredRole = getRoleFromPortal(currentPortal)
  return userRole === requiredRole
}
