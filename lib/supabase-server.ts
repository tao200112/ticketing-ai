/**
 * 服务端 Supabase 客户端
 * 使用 createServerClient 基于 cookies 管理会话
 * 自动遵守 RLS 策略
 * 
 * ⚠️ 不要在此处暴露 Service Role Key
 * Service Role 仅用于 lib/supabase-admin.ts
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export function getSupabaseServer() {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('⚠️ Supabase server environment variables missing')
    return null
  }

  // cookies() is synchronous in Route Handlers - DO NOT await
  const cookieStore = cookies() as any

  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get: (name: string) => {
          return cookieStore.get(name)?.value
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        set: (name: string, value: string, options: any) => {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // 在某些场景下（如 middleware）可能无法设置 cookie
          }
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        remove: (name: string, options: any) => {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // 在某些场景下可能无法删除 cookie
          }
        },
      },
    }
  )
}
