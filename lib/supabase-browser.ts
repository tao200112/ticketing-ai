/**
 * Browser-side Supabase Client Singleton
 * 
 * This ensures EXACTLY ONE GoTrueClient instance per browser context.
 * Multiple instances cause "Auth session missing!" errors.
 */

import { createClient } from '@supabase/supabase-js'

let supabase: ReturnType<typeof createClient> | null = null

export function getSupabaseBrowser() {
  if (!supabase) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase environment variables')
    }

    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    })
  }

  return supabase
}

