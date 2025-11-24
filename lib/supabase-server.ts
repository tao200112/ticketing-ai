/**
 * 服务端 Supabase 客户端
 * 兼容旧的导入路径，内部复用 '@/lib/supabase/server'
 */

import { createSupabaseServerClient } from '@/lib/supabase/server'

export function getSupabaseServer() {
  return createSupabaseServerClient()
}
