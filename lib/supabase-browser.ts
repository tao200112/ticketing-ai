/**
 * Browser-side Supabase Client Singleton
 * 
 * ⚠️ DEPRECATED: Use getSupabaseBrowserClient() from '@/lib/supabase/client' instead
 * 
 * This file is kept for backward compatibility but will be removed in the future.
 * All new code should use '@/lib/supabase/client'
 */

import { getSupabaseBrowserClient } from './supabase/client'

/**
 * @deprecated Use getSupabaseBrowserClient() from '@/lib/supabase/client' instead
 */
export function getSupabaseBrowser() {
  return getSupabaseBrowserClient()
}

