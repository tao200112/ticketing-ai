import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * 中间件：路由隔离和认证
 * 
 * 功能：
 * 1. 生产环境拦截调试路由
 * 2. 商家路由认证（完全独立于用户认证）
 * 3. 用户路由继续使用 Supabase Auth（不修改）
 */

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // 1. 生产环境拦截调试路由
  const isProduction = process.env.NODE_ENV === 'production'
  const debugPagesEnabled = process.env.DEBUG_PAGES === 'true'
  
  if (isProduction && !debugPagesEnabled) {
    const isDebugRoute = 
      pathname.startsWith('/debug-') ||
      pathname.startsWith('/fix-') ||
      pathname === '/admin/fix-production-data'
    
    if (isDebugRoute) {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // 2. 商家路由认证交由 RSC 布局处理（基于 Supabase Auth 会话）
  // 这里不做自建 JWT 校验，避免与 Supabase 会话冲突
  
  // 3. 用户路由继续使用 Supabase Auth（不修改）
  // 这里不做任何处理，让 Supabase Auth 中间件处理
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/debug-:path*',
    '/fix-:path*',
    '/admin/fix-production-data',
    '/merchant/:path*',
    '/api/merchant/:path*',
  ],
}
