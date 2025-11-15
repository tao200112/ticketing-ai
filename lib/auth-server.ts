/**
 * 服务端认证统一入口
 * 
 * ⚠️ 此文件已重构为使用统一的 Supabase 封装
 * 所有函数现在都从 '@/lib/supabase/server' 重新导出
 * 
 * 保持向后兼容性，但新代码应该直接使用 '@/lib/supabase/server'
 */

// Re-export from unified Supabase server module
export { 
  createSupabaseServerClient as getRouteHandlerSupabase,
  getSupabaseUser as getServerUser,
  requireSupabaseUser as requireServerUser
} from './supabase/server'