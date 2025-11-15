import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export async function getRouteHandlerSupabase() {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('⚠️ Supabase environment variables missing')
    return null
  }

  try {
    // In Next.js App Router API routes, cookies() needs to be awaited
    const cookieStore = await cookies()
    
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
    const supabase = await getRouteHandlerSupabase()
    if (!supabase) {
      console.warn('[getServerUser] Supabase client not available')
      return null
    }

    // First try to get session (which reads from cookies)
    // This is more reliable in API routes than getUser()
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.warn('[getServerUser] Error getting session:', sessionError.message)
      // Fallback to getUser() if getSession() fails
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError) {
        console.warn('[getServerUser] Error getting user:', userError.message)
        return null
      }
      if (!userData?.user) {
        console.warn('[getServerUser] No user found')
        return null
      }
      return userData.user
    }

    // If we have a session, return the user from session
    if (sessionData?.session?.user) {
      return sessionData.session.user
    }

    // If no session, try getUser() as fallback
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError) {
      console.warn('[getServerUser] Error getting user:', userError.message)
      return null
    }

    if (!userData?.user) {
      console.warn('[getServerUser] No user found in session')
      return null
    }

    return userData.user
  } catch (error) {
    console.error('[getServerUser] Exception:', error)
    // Log full error details for debugging
    if (error instanceof Error) {
      console.error('[getServerUser] Error message:', error.message)
      console.error('[getServerUser] Error stack:', error.stack)
    }
    return null
  }
}