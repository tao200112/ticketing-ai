import { createClient } from '@supabase/supabase-js'

// 1️⃣ 网络层调试逻辑
(async () => {
  const start = Date.now();
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
      headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY }
    });
    const elapsed = Date.now() - start;
    console.log(`🌐 Supabase API 响应时间: ${elapsed}ms`);
    console.log('响应状态:', res.status);
    console.log('是否可访问:', res.ok);
  } catch (err) {
    console.error('❌ Supabase 请求失败:', err.message);
  }
})();

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)
