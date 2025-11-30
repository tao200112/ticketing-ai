/**
 * Supabase 客户端（向后兼容）
 * 
 * ⚠️ DEPRECATED: 
 * - For browser/client components: Use getSupabaseBrowserClient() from '@/lib/supabase/client'
 * - For server components: Use createSupabaseServerClient() from '@/lib/supabase/server'
 * - For API routes: Use createSupabaseRouteHandlerClient() from '@/lib/supabase/server'
 * 
 * This file is kept for backward compatibility but will be removed in the future.
 */

'use client'

import { getSupabaseBrowserClient } from './supabase/client'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * @deprecated Use getSupabaseBrowserClient() from '@/lib/supabase/client' instead
 */
export function getSupabaseClient(): SupabaseClient | null {
  try {
    return getSupabaseBrowserClient()
  } catch (error) {
    console.error('❌ Supabase 客户端创建失败:', error)
    return null
  }
}

/**
 * @deprecated Use createSupabaseServerClient() from '@/lib/supabase/server' instead
 */
export async function createServerSupabaseClient() {
  const { createSupabaseServerClient } = await import('./supabase/server')
  return createSupabaseServerClient()
}

// 导出默认客户端实例（向后兼容）
export const supabase = getSupabaseClient()
