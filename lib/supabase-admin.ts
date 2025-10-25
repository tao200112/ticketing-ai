import { createClient } from '@supabase/supabase-js'

// 完全恢复到原来的简单逻辑
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)