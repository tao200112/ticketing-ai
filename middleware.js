import { NextResponse } from 'next/server'
import { generateRequestId } from './lib/logger'

/**
 * 中间件 - 处理路由重定向和请求ID
 */
export function middleware(request) {
  const { pathname } = request.nextUrl

  // 生成或获取请求ID
  const requestId = request.headers.get('x-request-id') || generateRequestId()

  // 重定向旧的活动页面到新的 slug 路由
  if (pathname === '/event/ridiculous-chicken') {
    return NextResponse.redirect(new URL('/event/ridiculous-chicken', request.url))
  }

  // 为所有请求添加 requestId 到响应头
  const response = NextResponse.next()
  response.headers.set('x-request-id', requestId)
  
  // 将 requestId 添加到请求头，供后续处理使用
  request.headers.set('x-request-id', requestId)

  return response
}

export const config = {
  matcher: [
    '/event/:path*',
    '/api/:path*'
  ]
}
