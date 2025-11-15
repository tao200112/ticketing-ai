import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyMerchantToken } from '@/lib/auth/merchant-jwt'

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

  // 2. 商家路由认证（完全独立于用户认证）
  const isMerchantRoute = pathname.startsWith('/merchant') || pathname.startsWith('/api/merchant')
  
  if (isMerchantRoute) {
    // 排除登录和注册页面
    const isMerchantAuthRoute = 
      pathname === '/merchant/auth/login' ||
      pathname === '/merchant/auth/register' ||
      pathname === '/api/merchant/login' ||
      pathname === '/api/merchant/register'
    
    if (!isMerchantAuthRoute) {
      // 需要认证的商家路由
      const token = request.cookies.get('ptx_merchant_token')?.value
      
      if (!token) {
        // 未登录，重定向到商家登录页
        if (pathname.startsWith('/api/')) {
          return NextResponse.json(
            { success: false, error: 'AUTHENTICATION_REQUIRED', message: '请先登录' },
            { status: 401 }
          )
        } else {
          return NextResponse.redirect(new URL('/merchant/auth/login', request.url))
        }
      }
      
      // 验证 token
      const merchantAuth = verifyMerchantToken(token)
      
      if (!merchantAuth) {
        // Token 无效，清除 cookie 并重定向
        const response = pathname.startsWith('/api/')
          ? NextResponse.json(
              { success: false, error: 'INVALID_TOKEN', message: '登录已过期，请重新登录' },
              { status: 401 }
            )
          : NextResponse.redirect(new URL('/merchant/auth/login', request.url))
        
        response.cookies.delete('ptx_merchant_token')
        return response
      }
      
      // Token 有效，继续请求
      return NextResponse.next()
    }
  }
  
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
