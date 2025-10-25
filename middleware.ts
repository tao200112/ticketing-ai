import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * 中间件：生产环境拦截调试路由
 * 
 * 拦截的路由：
 * - /debug-*
 * - /fix-*
 * - /admin/fix-production-data
 * 
 * 例外：
 * - DEBUG_PAGES=true 时允许访问（用于紧急调试）
 */

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // 检查是否为生产环境
  const isProduction = process.env.NODE_ENV === 'production'
  
  // 检查是否启用调试页
  const debugPagesEnabled = process.env.DEBUG_PAGES === 'true'
  
  // 如果在生产环境且未启用调试页
  if (isProduction && !debugPagesEnabled) {
    // 检查是否为调试路由
    const isDebugRoute = 
      pathname.startsWith('/debug-') ||
      pathname.startsWith('/fix-') ||
      pathname === '/admin/fix-production-data'
    
    if (isDebugRoute) {
      // 重定向到首页
      return NextResponse.redirect(new URL('/', request.url))
    }
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/debug-:path*',
    '/fix-:path*',
    '/admin/fix-production-data',
  ],
}
