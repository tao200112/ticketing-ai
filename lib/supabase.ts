import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * 客户端 Supabase 客户端（用于客户端组件）
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

/**
 * 服务端 Supabase 客户端（用于 API 路由和服务器组件）
 * 使用 createServerClient 和 cookies 进行正确的会话管理
 */
export function createServerSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('⚠️ Supabase 环境变量缺失，服务端客户端未初始化')
    return null
  }

  try {
    return createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          get: (name: string) => {
            return cookies().get(name)?.value
          },
          set: (name: string, value: string, options: any) => {
            cookies().set({ name, value, ...options })
          },
          remove: (name: string, options: any) => {
            cookies().set({ name, value: '', ...options })
          },
        },
      }
    )
  } catch (error) {
    console.error('❌ Supabase 服务端客户端创建失败:', error)
    return null
  }
}

// 导出默认客户端实例（向后兼容）
export const supabase = getSupabaseClient()
