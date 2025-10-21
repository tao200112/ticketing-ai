import { getEnvInfo } from '@/lib/printEnv.mjs';
import { promises as dns } from 'node:dns';

export async function GET() {
  const start = Date.now();
  const env = getEnvInfo();
  
  let result = {
    ok: false,
    status: null,
    elapsedMs: 0,
    error: null,
    env,
    dns: null,
    conclusion: ''
  };
  
  // 检查环境变量
  if (!env.urlLoaded || !env.anonLoaded) {
    result.conclusion = 'ENV 未加载或 .env.local 填写错误（需要重启 dev）';
    result.elapsedMs = Date.now() - start;
    console.log('[PING] ENV 检查失败:', result.conclusion);
    return Response.json(result);
  }
  
  // 检查 URL 格式
  if (!env.urlHost.endsWith('.supabase.co') || !process.env.NEXT_PUBLIC_SUPABASE_URL.startsWith('https://')) {
    result.conclusion = 'NEXT_PUBLIC_SUPABASE_URL 格式错误';
    result.elapsedMs = Date.now() - start;
    console.log('[PING] URL 格式错误:', result.conclusion);
    return Response.json(result);
  }
  
  // DNS 解析
  try {
    const dnsResult = await dns.resolve(env.urlHost);
    result.dns = dnsResult;
    console.log('[PING] DNS 解析成功:', env.urlHost, '→', dnsResult);
  } catch (dnsError) {
    result.dns = null;
    result.dnsError = dnsError.message;
    console.log('[PING] DNS 解析失败:', dnsError.message);
  }
  
  // Ping Supabase API
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
      headers: {
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    result.ok = response.ok;
    result.status = response.status;
    result.elapsedMs = Date.now() - start;
    
    // 判断结论
    if (response.status === 401 || response.status === 404) {
      result.conclusion = '网络连通正常，可继续建表与数据读写';
    } else {
      result.conclusion = `网络连通正常，但状态码异常: ${response.status}`;
    }
    
    console.log(`[PING] urlHost=${env.urlHost}, status=${response.status}, elapsed=${result.elapsedMs}ms, error=null`);
    
  } catch (error) {
    result.elapsedMs = Date.now() - start;
    result.error = error.message;
    
    if (error.name === 'AbortError') {
      result.conclusion = '请求超时（5秒），可能是网络/代理问题';
    } else if (error.message.includes('fetch failed')) {
      result.conclusion = '网络/代理问题，建议启用系统代理或切换网络再试';
    } else {
      result.conclusion = `未知错误: ${error.message}`;
    }
    
    console.log(`[PING] urlHost=${env.urlHost}, status=null, elapsed=${result.elapsedMs}ms, error=${error.message}`);
  }
  
  return Response.json(result);
}
