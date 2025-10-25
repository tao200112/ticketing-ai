/**
 * 浏览器端 Supabase 客户端
 * 仅使用 NEXT_PUBLIC_* 环境变量
 * 自动启用 RLS，基于浏览器 cookies 管理会话
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase client environment variables missing')
}

// 浏览器端客户端实例
let clientInstance: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient {
  if (!clientInstance) {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Supabase client environment variables are required')
    }

    clientInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  }

  return clientInstance
}

export { clientInstance as supabase }
