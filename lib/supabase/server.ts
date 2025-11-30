/**
 * 服务端 Supabase 客户端统一入口
 *
 * 所有 Route Handler / Server Component 都应该从这里获取 Supabase client 和 user
 *
 * 这是项目中唯一的服务端 Supabase 认证来源
 * 
 * 使用 @supabase/ssr 的 createServerClient 统一管理 cookies
 */

import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/types/db'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

function isSupabaseConfigured() {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('⚠️ Supabase environment variables missing')
    return false
  }
  return true
}

/**
 * 创建 Route Handler Supabase 客户端（API Routes）
 * 
 * 使用 @supabase/ssr 的 createServerClient 统一管理 cookies
 * 确保与浏览器端使用相同的 cookie 格式
 */
export function createSupabaseRouteHandlerClient() {
  if (!isSupabaseConfigured()) {
    console.warn('[createSupabaseRouteHandlerClient] Supabase environment variables missing')
    return null
  }

  try {
    const cookieStore = cookies()
    return createServerClient<Database>(
      supabaseUrl!,
      supabaseAnonKey!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            try {
              cookieStore.set({ name, value, ...options })
            } catch (error) {
              // 在 Route Handler 中，cookies() 返回的是 ReadonlyRequestCookies
              // 某些情况下可能无法写入，这是正常的
              console.warn('[createSupabaseRouteHandlerClient] Failed to set cookie:', name)
            }
          },
          remove(name: string, options: any) {
            try {
              cookieStore.set({ name, value: '', ...options })
            } catch (error) {
              console.warn('[createSupabaseRouteHandlerClient] Failed to remove cookie:', name)
            }
          },
        },
      }
    )
  } catch (error) {
    console.error('[createSupabaseRouteHandlerClient] Failed to create Supabase client:', error)
    return null
  }
}

/**
 * 创建 Server Component Supabase 客户端
 * 
 * 使用 @supabase/ssr 的 createServerClient 统一管理 cookies
 * 确保与浏览器端使用相同的 cookie 格式
 */
export function createSupabaseServerClient() {
  if (!isSupabaseConfigured()) {
    console.warn('[createSupabaseServerClient] Supabase environment variables missing')
    return null
  }

  try {
    const cookieStore = cookies()
    return createServerClient<Database>(
      supabaseUrl!,
      supabaseAnonKey!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            try {
              cookieStore.set({ name, value, ...options })
            } catch (error) {
              // 在 Server Component 中，cookies() 返回的是 ReadonlyRequestCookies
              // 某些情况下可能无法写入，这是正常的
              console.warn('[createSupabaseServerClient] Failed to set cookie:', name)
            }
          },
          remove(name: string, options: any) {
            try {
              cookieStore.set({ name, value: '', ...options })
            } catch (error) {
              console.warn('[createSupabaseServerClient] Failed to remove cookie:', name)
            }
          },
        },
      }
    )
  } catch (error) {
    console.error('[createSupabaseServerClient] Failed to create Supabase client:', error)
    return null
  }
}

/**
 * 从 Supabase 会话获取当前登录用户（服务端）
 *
 * @returns {Promise<User | null>} Supabase Auth user 或 null（如果未认证）
 */
export async function getSupabaseUser() {
  const supabase = createSupabaseRouteHandlerClient()
  if (!supabase) {
    console.warn('[getSupabaseUser] Supabase client not available')
    return null
  }

  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError) {
      console.warn('[getSupabaseUser] Error getting user:', userError.message)
      return null
    }

    if (user) {
      console.log('[getSupabaseUser] Found authenticated user:', {
        id: user.id,
        email: user.email,
      })
      return user
    }

    console.warn('[getSupabaseUser] No user found - user not authenticated')
    return null
  } catch (error) {
    console.error('[getSupabaseUser] Exception:', error)
    if (error instanceof Error) {
      console.error('[getSupabaseUser] Error message:', error.message)
      console.error('[getSupabaseUser] Error stack:', error.stack)
    }
    return null
  }
}

/**
 * 要求用户必须已登录（服务端）
 *
 * 如果用户未登录，会抛出 AUTHENTICATION_ERROR
 */
export async function requireSupabaseUser() {
  const { ErrorHandler } = await import('../error-handler')
  const user = await getSupabaseUser()

  if (!user) {
    throw ErrorHandler.authenticationError(
      'AUTHENTICATION_REQUIRED',
      'User must be logged in to perform this action'
    )
  }

  return user
}
