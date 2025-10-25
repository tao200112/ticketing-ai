import { createClient } from '@supabase/supabase-js'

// 检查环境变量是否存在
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// 如果环境变量不存在，创建一个虚拟客户端
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
    isConfigured: !!supabaseAdmin
  })
}