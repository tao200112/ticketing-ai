import { NextResponse } from 'next/server'
import { generateRequestId } from './lib/logger'

/**
 * 中间件 - 处理路由重定向和请求ID
 */
export function middleware(request) {
  const { pathname } = request.nextUrl

  // 生成或获取请求ID
  const requestId = request.headers.get('x-request-id') || generateRequestId()

  // UUID 格式匹配：/events/<uuid> → /api/compat/uuid-to-slug?id=<uuid>
  const uuidMatch = pathname.match(/^\/events\/([0-9a-fA-F-]{8}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{4}-[0-9a-fA-F-]{12})$/)
  if (uuidMatch) {
    const uuid = uuidMatch[1]
    const url = new URL('/api/compat/uuid-to-slug', request.url)
    url.searchParams.set('id', uuid)
    return NextResponse.redirect(url, 302)
  }

  // 复数到单数重定向：/events/<slug> → /event/<slug>
  const eventsMatch = pathname.match(/^\/events\/(.+)$/)
  if (eventsMatch) {
    const slug = eventsMatch[1]
    return NextResponse.redirect(new URL(`/event/${slug}`, request.url), 301)
  }

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
    // 只匹配特定路由，避免干扰其他页面
    '/event/:path*',
    '/events/:path*'
  ]
}
