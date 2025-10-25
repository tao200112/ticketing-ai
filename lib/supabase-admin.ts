import { createClient } from '@supabase/supabase-js'

// 检查环境变量是否存在
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// 恢复原来的逻辑，但添加更好的错误处理
export const supabaseAdmin = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseServiceKey || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// 添加调试信息
if (process.env.NODE_ENV === 'production') {
  console.log('Supabase Admin Configuration:', {
    hasUrl: !!supabaseUrl,
    hasServiceKey: !!supabaseServiceKey,
    url: supabaseUrl || 'Not set',
    isConfigured: !!(supabaseUrl && supabaseServiceKey)
  })
}