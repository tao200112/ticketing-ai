import { createBrowserSupabaseClient } from '@supabase/auth-helpers-nextjs'

let clientInstance: ReturnType<typeof createBrowserSupabaseClient> | null = null

export function getSupabaseClient() {
  if (!clientInstance) {
    clientInstance = createBrowserSupabaseClient()
  }

  return clientInstance
}

export { getSupabaseClient as createSupabaseBrowserClient }
