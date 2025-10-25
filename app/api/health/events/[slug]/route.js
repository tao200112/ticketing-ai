import { NextResponse } from 'next/server'
import { getPublishedEventBySlug } from '@/lib/db'

/**
 * 事件健康检查端点
 * 
 * 验证：
 * - 公开事件可读性
 * - RLS 策略对事件访问的控制
 * - 事件数据完整性
 */
export async function GET(request, { params }) {
  const startTime = Date.now()
  const { slug } = params
  
  try {
    if (!slug) {
      return NextResponse.json({
        ok: false,
        code: 'MISSING_SLUG',
        message: 'Event slug is required',
        ts: new Date().toISOString(),
        metrics: {
          responseTimeMs: Date.now() - startTime
        }
      }, { status: 400 })
    }

    // 尝试获取已发布事件
    const event = await getPublishedEventBySlug(slug)

    if (!event) {
      return NextResponse.json({
        ok: false,
        code: 'EVENT_NOT_FOUND',
        message: 'Event not found or not published',
        ts: new Date().toISOString(),
        metrics: {
          responseTimeMs: Date.now() - startTime,
          slug: slug
        }
      }, { status: 404 })
    }

    // 检查事件数据完整性
    const hasRequiredFields = event.id && event.title && event.status === 'published'
    const hasPrices = event.prices && event.prices.length > 0

    if (!hasRequiredFields) {
      return NextResponse.json({
        ok: false,
        code: 'EVENT_DATA_INCOMPLETE',
        message: 'Event data is incomplete',
        ts: new Date().toISOString(),
        metrics: {
          responseTimeMs: Date.now() - startTime,
          slug: slug,
          hasId: !!event.id,
          hasTitle: !!event.title,
          status: event.status
        }
      }, { status: 503 })
    }

    return NextResponse.json({
      ok: true,
      code: 'EVENT_ACCESSIBLE',
      message: 'Event is accessible and data is complete',
      ts: new Date().toISOString(),
      metrics: {
        responseTimeMs: Date.now() - startTime,
        slug: slug,
        eventId: event.id,
        hasPrices: hasPrices,
        priceCount: event.prices?.length || 0
      }
    })

  } catch (error) {
    return NextResponse.json({
      ok: false,
      code: 'EVENT_HEALTH_CHECK_FAILED',
      message: 'Event health check failed',
      ts: new Date().toISOString(),
      metrics: {
        responseTimeMs: Date.now() - startTime,
        slug: slug
      },
      error: {
        message: error.message
      }
    }, { status: 500 })
  }
}
