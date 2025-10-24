import { createClient } from '@supabase/supabase-js'

// 安全创建 Supabase 客户端
let supabase = null;

try {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    console.log('✅ Supabase 客户端初始化成功');
  } else {
    console.warn('⚠️ Supabase 环境变量缺失，客户端未初始化');
  }
} catch (error) {
  console.error('❌ Supabase 客户端创建失败:', error);
}

export { supabase };
