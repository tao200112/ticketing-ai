// TODO: implement Supabase integration later
// import { supabase } from '@/lib/supabaseClient';

export async function GET() {
  const start = Date.now();
  
  // 检查环境变量
  const urlLoaded = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anonLoaded = Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  
  console.log(`[API-EVENTS] ENV检查: URL=${urlLoaded}, Key=${anonLoaded ? 'loaded' : 'missing'}`);
  
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
    // TODO: implement Supabase integration later
    // 暂时返回模拟数据
    const elapsed = Date.now() - start;
    
    console.log(`[API-EVENTS] 结论: 模拟数据, elapsed=${elapsed}ms`);
    return Response.json({ 
      ok: true, 
      data: [
        {
          id: 'ridiculous-chicken',
          name: 'Ridiculous Chicken Event',
          description: 'A fun chicken-themed event',
          start_time: new Date().toISOString(),
          location: '201 N Main St SUITE A, Blacksburg, VA 24060'
        }
      ]
    });
    
  } catch (err) {
    const elapsed = Date.now() - start;
    
    console.log(`[API-EVENTS] 结论: 错误, elapsed=${elapsed}ms, error=${err.message}`);
    return Response.json({ 
      ok: false, 
      data: [], 
      error: err.message 
    });
  }
}


