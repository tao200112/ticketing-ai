import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/**
 * Get Supabase server client for Route Handlers
 * Uses Next.js cookies() to read/write Supabase session cookies
 * This is the unified way to access Supabase Auth on the server
 */
export function getRouteHandlerSupabase() {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('⚠️ Supabase environment variables missing')
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
                // In some contexts (e.g., middleware), setting cookies may fail - this is expected
                console.warn(`[getRouteHandlerSupabase] Failed to set cookie ${name}:`, error)
              }
            })
          },
        },
      }
    )
  } catch (error) {
    console.error('[getRouteHandlerSupabase] Failed to create Supabase client:', error)
    return null
  }
}

/**
 * Get authenticated user from Supabase session (server-side)
 * This function reads Supabase session cookies (sb-access-token, sb-refresh-token)
 * and returns the authenticated user if session exists
 * 
 * @returns {Promise<User | null>} Supabase Auth user or null if not authenticated
 */
export async function getServerUser() {
  const supabase = getRouteHandlerSupabase()
  if (!supabase) {
    console.warn('[getServerUser] Supabase client not available')
    return null
  }

  try {
    // Log available cookies for debugging
    try {
      const cookieStore = cookies() as any
      const allCookies = cookieStore.getAll()
      const supabaseCookies = allCookies.filter(c => 
        c.name.startsWith('sb-') || c.name.includes('supabase')
      )
      console.log('[getServerUser] Available Supabase cookies:', 
        supabaseCookies.map(c => c.name)
      )
    } catch (cookieError) {
      // Ignore cookie reading errors in logging
    }

    // First try getSession() - reads from cookies (sb-access-token, sb-refresh-token)
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      console.warn('[getServerUser] Error getting session:', sessionError.message)
    }
    
    if (session?.user) {
      console.log('[getServerUser] Found user from session:', { 
        id: session.user.id, 
        email: session.user.email 
      })
      return session.user
    }

    // Fallback to getUser() if no session
    // getUser() will attempt to refresh the session using refresh token
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      console.warn('[getServerUser] Error getting user:', userError.message)
    }
    
    if (user) {
      console.log('[getServerUser] Found user from getUser():', { 
        id: user.id, 
        email: user.email 
      })
      return user
    }
    
    console.warn('[getServerUser] No user found in session or getUser()')
    return null
  } catch (error) {
    console.error('[getServerUser] Exception:', error)
    if (error instanceof Error) {
      console.error('[getServerUser] Error message:', error.message)
      console.error('[getServerUser] Error stack:', error.stack)
    }
    return null
  }
}

/**
 * Require authenticated user (throws if not authenticated)
 * Use this in API routes that require authentication
 * 
 * @returns {Promise<User>} Supabase Auth user
 * @throws {AppError} AUTHENTICATION_ERROR if user is not authenticated
 */
export async function requireServerUser() {
  const { ErrorHandler } = await import('./error-handler')
  const user = await getServerUser()
  
  if (!user) {
    throw ErrorHandler.authenticationError(
      'AUTHENTICATION_REQUIRED',
      'User must be logged in to perform this action'
    )
  }
  
  return user
}