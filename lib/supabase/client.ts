/**
 * 浏览器端 Supabase 客户端统一入口
 * 
 * 所有客户端代码（页面、组件）都应该从这里获取 Supabase client
 * 
 * 使用单例模式确保整个应用只有一个 GoTrueClient 实例
 * 多个实例会导致 "Auth session missing!" 错误
 */

'use client'

import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

let browserSupabaseClient: ReturnType<typeof createBrowserClient> | null = null

/**
 * 获取浏览器端 Supabase 客户端（单例）
 * 
 * 使用 @supabase/ssr 的 createBrowserClient
 * 自动管理会话 cookies 和 localStorage
 * 
 * 配置说明：
 * - autoRefreshToken: true - 自动刷新 token
 * - persistSession: true - 持久化会话到 localStorage
 * - detectSessionInUrl: true - 检测 URL 中的会话（用于邮箱验证）
 * 
 * @returns {SupabaseClient} Supabase 客户端实例
 */
export function getSupabaseBrowserClient() {
  if (!browserSupabaseClient) {
    browserSupabaseClient = createBrowserClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  }
  return browserSupabaseClient
}

