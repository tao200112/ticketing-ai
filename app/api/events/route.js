import { supabase } from '@/lib/supabaseClient';

export async function GET() {
  const start = Date.now();
  
  // 检查环境变量
  const urlLoaded = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anonLoaded = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  const maskedAnonKey = anonLoaded ? 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 4) + '***' + 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length - 4) : 
    'not-loaded';
  
  console.log(`[API-EVENTS] ENV检查: URL=${urlLoaded}, Key=${anonLoaded ? 'loaded' : 'missing'}, MaskedKey=${maskedAnonKey}`);
  
  if (!urlLoaded || !anonLoaded) {
    const elapsed = Date.now() - start;
    console.log(`[API-EVENTS] 结论: ENV未加载, elapsed=${elapsed}ms`);
    return Response.json({ 
      ok: false, 
      data: [], 
      error: 'ENV 未加载或 .env.local 填写错误' 
    });
  }
  
  try {
    // 设置 5 秒超时
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('start_time', { ascending: true });
    
    clearTimeout(timeoutId);
    const elapsed = Date.now() - start;
    
    if (error) {
      // 处理表不存在的情况
      if (error.code === 'PGRST116' || error.message.includes('relation') || error.message.includes('does not exist')) {
        console.log(`[API-EVENTS] 结论: 表不存在, elapsed=${elapsed}ms`);
        return Response.json({ 
          ok: false, 
          data: [], 
          error: 'table_missing' 
        });
      }
      
      console.log(`[API-EVENTS] 结论: Supabase错误, elapsed=${elapsed}ms, error=${error.message}`);
      return Response.json({ 
        ok: false, 
        data: [], 
        error: error.message 
      });
    }
    
    console.log(`[API-EVENTS] 结论: 成功, elapsed=${elapsed}ms, 数据量=${data?.length || 0}`);
    return Response.json({ 
      ok: true, 
      data: data || [] 
    });
    
  } catch (err) {
    const elapsed = Date.now() - start;
    
    if (err.name === 'AbortError') {
      console.log(`[API-EVENTS] 结论: 超时, elapsed=${elapsed}ms`);
      return Response.json({ 
        ok: false, 
        data: [], 
        error: '请求超时（5秒）' 
      });
    }
    
    console.log(`[API-EVENTS] 结论: 网络错误, elapsed=${elapsed}ms, error=${err.message}`);
    return Response.json({ 
      ok: false, 
      data: [], 
      error: err.message 
    });
  }
}
