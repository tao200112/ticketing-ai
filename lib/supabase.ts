import { createClient, SupabaseClient } from '@supabase/supabase-js'

/**
 * 安全获取 Supabase 客户端
 * 如果环境变量缺失，返回 null 而不是抛出错误
 */
export function getSupabaseClient(): SupabaseClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('⚠️ Supabase 环境变量缺失，客户端未初始化')
    return null
  }

  try {
    return createClient(supabaseUrl, supabaseAnonKey)
  } catch (error) {
    console.error('❌ Supabase 客户端创建失败:', error)
    return null
  }
}

// 导出默认客户端实例（向后兼容）
export const supabase = getSupabaseClient()
