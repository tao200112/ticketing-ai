/**
 * 安全环境变量检查工具
 * 提供环境变量存在性检查，避免构建失败
 */

/**
 * 检查 Supabase 环境变量是否配置
 * @returns boolean - 是否已配置 Supabase
 */
export function hasSupabase(): boolean {
  const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL
  const hasAnonKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  return hasUrl && hasAnonKey
}

/**
 * 检查 Stripe 环境变量是否配置
 * 检查前端和后端 Stripe 密钥
 * @returns boolean - 是否已配置 Stripe
 */
export function hasStripe(): boolean {
  // 检查前端 Stripe 公钥
  const hasPublicKey = !!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  
  // 检查后端 Stripe 密钥（服务端环境变量）
  const hasSecretKey = !!process.env.STRIPE_SECRET_KEY
  
  return hasPublicKey || hasSecretKey
}

/**
 * 检查数据库环境变量是否配置
 * @returns boolean - 是否已配置数据库
 */
export function hasDatabase(): boolean {
  return !!process.env.DATABASE_URL
}

/**
 * 获取环境变量配置状态
 * @returns object - 各服务的配置状态
 */
export function getEnvStatus() {
  return {
    supabase: hasSupabase(),
    stripe: hasStripe(),
    database: hasDatabase(),
  }
}

/**
 * 安全获取环境变量，避免构建时错误
 * @param key - 环境变量键名
 * @param defaultValue - 默认值
 * @returns string | undefined
 */
export function safeGetEnv(key: string, defaultValue?: string): string | undefined {
  try {
    return process.env[key] || defaultValue
  } catch {
    return defaultValue
  }
}
