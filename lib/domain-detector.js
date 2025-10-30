/**
 * Domain Detector
 * Detects which portal (customer, merchant, admin) based on hostname
 */

export const DOMAINS = {
  CUSTOMER: 'customer',
  MERCHANT: 'merchant',
  ADMIN: 'admin',
  UNKNOWN: 'unknown'
}

/**
 * Get portal type from request hostname
 * @param {Request|string} request - Request object or hostname string
 * @returns {string} - Portal type: 'customer', 'merchant', 'admin', or 'unknown'
 */
export function getPortalFromHostname(request) {
  let hostname

  if (typeof request === 'string') {
    hostname = request
  } else if (request instanceof Request) {
    hostname = request.headers.get('host') || ''
  } else if (request?.headers?.host) {
    hostname = request.headers.host
  } else {
    return DOMAINS.UNKNOWN
  }

  // Remove port if present
  hostname = hostname.split(':')[0].toLowerCase()

  // Check environment variables for domain configuration
  const customerDomain = process.env.NEXT_PUBLIC_CUSTOMER_DOMAIN || 'app.partytix.com'
  const merchantDomain = process.env.NEXT_PUBLIC_MERCHANT_DOMAIN || 'merchant.partytix.com'
  const adminDomain = process.env.NEXT_PUBLIC_ADMIN_DOMAIN || 'admin.partytix.com'
  const defaultDomain = process.env.NEXT_PUBLIC_DEFAULT_DOMAIN || 'partytix.com'

  // Match exact domain or subdomain
  if (hostname === customerDomain || hostname === defaultDomain || hostname === 'localhost') {
    return DOMAINS.CUSTOMER
  }

  if (hostname === merchantDomain || hostname.startsWith('merchant.')) {
    return DOMAINS.MERCHANT
  }

  if (hostname === adminDomain || hostname.startsWith('admin.')) {
    return DOMAINS.ADMIN
  }

  // For development, check pathname as fallback
  if (process.env.NODE_ENV === 'development') {
    if (hostname.includes('localhost') || hostname.includes('127.0.0.1')) {
      // In development, we'll use pathname to determine portal
      return DOMAINS.UNKNOWN // Let middleware handle it
    }
  }

  return DOMAINS.UNKNOWN
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

