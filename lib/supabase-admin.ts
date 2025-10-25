import { createClient } from '@supabase/supabase-js'

// 安全的数据库连接配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// 只有在环境变量存在时才创建客户端
export const supabaseAdmin = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null

// 添加调试信息
if (process.env.NODE_ENV === 'production') {
  console.log('Supabase Admin Configuration:', {
    hasUrl: !!supabaseUrl,
    hasServiceKey: !!supabaseServiceKey,
    isConfigured: !!supabaseAdmin,
    url: supabaseUrl || 'Not set'
  })
}