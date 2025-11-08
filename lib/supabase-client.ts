import { createBrowserSupabaseClient } from '@supabase/auth-helpers-nextjs'
import type { SupabaseClient } from '@supabase/supabase-js'

let clientInstance: SupabaseClient | null = null

export function getSupabaseClient(): SupabaseClient {
  if (!clientInstance) {
    clientInstance = createBrowserSupabaseClient()
  }

  return clientInstance
}

export { getSupabaseClient as createSupabaseBrowserClient }
