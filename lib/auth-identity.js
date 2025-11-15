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
 * This function is deprecated - use AuthContext directly instead
 * @returns {string|null} Supabase Auth UID (user.id)
 * @deprecated Use useAuth() hook from AuthContext instead
 */
export function getAuthIdentity() {
  // Client-side identity should come from AuthContext, not localStorage
  // This function is kept for backward compatibility but should not be used
  return null
}

/**
 * Get user identity from server-side session (Supabase Auth)
 * 
 * ⚠️ DEPRECATED: Use getSupabaseUser() from '@/lib/supabase/server' directly instead
 * 
 * This function is kept for backward compatibility but will be removed in the future.
 * All new code should use '@/lib/supabase/server' directly.
 * 
 * @returns {Promise<{id: string, email: string}|null>}
 * @deprecated Use getSupabaseUser() from '@/lib/supabase/server' instead
 */
export async function getServerAuthIdentity() {
  const { getSupabaseUser } = await import('./supabase/server')
  const user = await getSupabaseUser()
  
  if (!user) {
    return null
  }

  return {
    id: user.id,       // Supabase Auth UID
    email: user.email
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

