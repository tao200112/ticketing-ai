/**
 * Google OAuth 用户密码占位符工具
 * 用于在数据库仍然要求 password_hash 非空时提供兼容方案
 *
 * 注意：一旦数据库允许 password_hash 为 NULL，可以移除占位符逻辑。
 */

// 使用已有示例中的稳定 hash，避免在 Edge Runtime 中动态生成
export const GOOGLE_OAUTH_PASSWORD_PLACEHOLDER_HASH =
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8Kz8Kz8'

/**
 * 判断给定 password_hash 是否为 Google OAuth 占位符
 */
export function isGoogleOauthPasswordPlaceholder(hash) {
  if (!hash) return false
  return hash === GOOGLE_OAUTH_PASSWORD_PLACEHOLDER_HASH
}

/**
 * 判断用户是否需要设置密码（用于前端状态显示）
 */
export function requiresPasswordSetup(user) {
  if (!user) return false
  if (user.auth_provider !== 'google') return false
  return (
    !user.password_hash || isGoogleOauthPasswordPlaceholder(user.password_hash)
  )
}

