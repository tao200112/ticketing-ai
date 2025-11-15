/**
 * Unified Identity System
 * 
 * This module provides a unified way to get user identity across the application.
 * It uses AuthContext (Supabase Auth) as the single source of truth.
 * 
 * The user identity is the Supabase Auth UID (user.id from AuthContext).
 * This replaces all user_id and supabase_uid references.
 */

/**
 * Get user identity from AuthContext (client-side)
 * @returns {string|null} Supabase Auth UID (user.id)
 */
export function getAuthIdentity() {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    // Try to get from AuthContext via localStorage or session
    const sessionData = localStorage.getItem('userSession')
    if (sessionData) {
      const parsed = JSON.parse(sessionData)
      return parsed.id || null
    }
  } catch (error) {
    console.warn('[getAuthIdentity] Failed to read from localStorage:', error)
  }

  return null
}

/**
 * Get user identity from server-side session (Supabase Auth)
 * This is the unified identity that should be used everywhere
 * @returns {Promise<{id: string, email: string}|null>}
 */
export async function getServerAuthIdentity() {
  try {
    const { getServerUser } = await import('./auth-server')
    const user = await getServerUser()
    
    if (!user || !user.id) {
      return null
    }

    return {
      id: user.id, // Supabase Auth UID - this is the unified identity
      email: user.email
    }
  } catch (error) {
    console.error('[getServerAuthIdentity] Error:', error)
    return null
  }
}

/**
 * Validate that an ID is a valid Supabase Auth UID (UUID format)
 */
export function isValidAuthIdentity(id) {
  if (!id || typeof id !== 'string') {
    return false
  }
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(id)
}

