/**
 * Google OAuth user password placeholder utility
 * Used to provide compatibility when database still requires password_hash to be non-null
 *
 * Note: Once the database allows password_hash to be NULL, this placeholder logic can be removed.
 */

// Use a stable hash from existing examples to avoid dynamic generation in Edge Runtime
export const GOOGLE_OAUTH_PASSWORD_PLACEHOLDER_HASH =
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8Kz8Kz8'

/**
 * Check if the given password_hash is a Google OAuth placeholder
 */
export function isGoogleOauthPasswordPlaceholder(hash) {
  if (!hash) return false
  return hash === GOOGLE_OAUTH_PASSWORD_PLACEHOLDER_HASH
}

/**
 * Check if user needs to set up a password (for frontend state display)
 */
export function requiresPasswordSetup(user) {
  if (!user) return false
  if (user.auth_provider !== 'google') return false
  return (
    !user.password_hash || isGoogleOauthPasswordPlaceholder(user.password_hash)
  )
}


