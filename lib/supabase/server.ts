/**
 * 服务端 Supabase 客户端统一入口
 * 
 * 所有 Route Handler / Server Component / Middleware 都应该从这里获取 Supabase client 和 user
 * 
 * 这是项目中唯一的服务端 Supabase 认证来源
 */

import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase environment variables missing')
}

/**
 * 创建 Supabase 服务端客户端
 * 
 * 使用 Next.js cookies() 和 @supabase/ssr 的 createServerClient
 * 自动管理 Supabase 会话 cookies (sb-access-token, sb-refresh-token)
 */
export function createSupabaseServerClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('[createSupabaseServerClient] Supabase environment variables missing')
    return null
  }

  try {
    // cookies() is synchronous in Next.js App Router Route Handlers
    // DO NOT await it - this breaks cookie reading
    const cookieStore = cookies() as any
    
    return createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              try {
                cookieStore.set(name, value, options)
              } catch (error) {
                // In some contexts (e.g., static build), setting cookies may fail - this is expected
                console.warn(`[createSupabaseServerClient] Failed to set cookie ${name}:`, error)
              }
            })
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
 * 读取 Supabase 会话 cookies (sb-access-token, sb-refresh-token)
 * 并返回认证用户，如果未登录则返回 null
 * 
 * @returns {Promise<User | null>} Supabase Auth user 或 null（如果未认证）
 */
export async function getSupabaseUser() {
  const supabase = createSupabaseServerClient()
  if (!supabase) {
    console.warn('[getSupabaseUser] Supabase client not available')
    return null
  }

  try {
    // Use getUser() for security - authenticates user by contacting Supabase Auth server
    // This is more secure than getSession() which reads from cookies directly
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      console.warn('[getSupabaseUser] Error getting user:', userError.message)
      return null
    }
    
    if (user) {
      console.log('[getSupabaseUser] Found authenticated user:', { 
        id: user.id, 
        email: user.email 
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
 * 
 * @returns {Promise<User>} Supabase Auth user
 * @throws {AppError} AUTHENTICATION_ERROR 如果用户未登录
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

