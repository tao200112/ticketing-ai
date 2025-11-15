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
    // cookies() is synchronous in Next.js App Router Route Handlers
    // DO NOT await it - this breaks cookie reading
    // TypeScript may infer it as Promise, but runtime it's synchronous
    const cookieStore = cookies() as any
    
    return createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          get: (name: string) => {
            const cookie = cookieStore.get(name)
            return cookie?.value
          },
          set: (name: string, value: string, options: any) => {
            try {
              cookieStore.set({ name, value, ...options })
            } catch (error) {
              // In middleware context, setting cookies may fail - this is expected
            }
          },
          remove: (name: string, options: any) => {
            try {
              cookieStore.set({ name, value: '', ...options })
            } catch (error) {
              // In middleware context, removing cookies may fail - this is expected
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
  const supabase = getRouteHandlerSupabase()
  if (!supabase) {
    console.warn('[getServerUser] Supabase client not available')
    return null
  }

  try {
    // First try getSession() - reads from cookies (sb-access-token, sb-refresh-token)
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.warn('[getServerUser] Error getting session:', sessionError.message)
    }
    
    if (session?.user) {
      console.log('[getServerUser] Found user from session:', session.user.id)
      return session.user
    }

    // Fallback to getUser() if no session
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      console.warn('[getServerUser] Error getting user:', userError.message)
    }
    
    if (user) {
      console.log('[getServerUser] Found user from getUser():', user.id)
      return user
    }
    
    console.warn('[getServerUser] No user found in session or getUser()')
    return null
  } catch (error) {
    console.error('[getServerUser] Exception:', error)
    return null
  }
}