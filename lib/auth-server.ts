import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export function getRouteHandlerSupabase() {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('⚠️ Supabase environment variables missing')
    return null
  }

  try {
    const cookieStore = cookies()
    
    return createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          get: (name: string) => {
            try {
              return cookieStore.get(name)?.value
            } catch (error) {
              console.warn('[getRouteHandlerSupabase] Error getting cookie:', name, error)
              return undefined
            }
          },
          set: (name: string, value: string, options: any) => {
            try {
              cookieStore.set({ name, value, ...options })
            } catch (error) {
              // 在某些场景下可能无法设置 cookie（如 middleware）
              console.warn('[getRouteHandlerSupabase] Error setting cookie:', name, error)
            }
          },
          remove: (name: string, options: any) => {
            try {
              cookieStore.set({ name, value: '', ...options })
            } catch (error) {
              // 在某些场景下可能无法删除 cookie
              console.warn('[getRouteHandlerSupabase] Error removing cookie:', name, error)
            }
          },
        },
      }
    )
  } catch (error) {
    console.error('[getRouteHandlerSupabase] Failed to create Supabase client:', error)
    return null
  }
}

export async function getServerUser() {
  try {
    const supabase = getRouteHandlerSupabase()
    if (!supabase) {
      console.warn('[getServerUser] Supabase client not available')
      return null
    }

    const { data, error } = await supabase.auth.getUser()

    if (error) {
      console.warn('[getServerUser] Error getting user:', error.message)
      return null
    }

    if (!data?.user) {
      console.warn('[getServerUser] No user found in session')
      return null
    }

    return data.user
  } catch (error) {
    console.error('[getServerUser] Exception:', error)
    return null
  }
}