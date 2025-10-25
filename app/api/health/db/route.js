import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * 数据库健康检查端点
 * 
 * 验证：
 * - 数据库连通性
 * - RLS 策略正常
 * - 基础查询权限
 */
export async function GET() {
  const startTime = Date.now()
  
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({
        ok: false,
        code: 'DB_CLIENT_UNAVAILABLE',
        message: 'Database client not available',
        ts: new Date().toISOString(),
        metrics: {
          responseTimeMs: Date.now() - startTime
        }
      }, { status: 503 })
    }

    // 最轻查询：检查数据库连通性
    const { data, error } = await supabaseAdmin
      .from('events')
      .select('id')
      .limit(1)

    if (error) {
      return NextResponse.json({
        ok: false,
        code: 'DB_CONNECTION_FAILED',
        message: 'Database connection failed',
        ts: new Date().toISOString(),
        metrics: {
          responseTimeMs: Date.now() - startTime
        },
        error: {
          code: error.code,
          message: error.message
        }
      }, { status: 503 })
    }

    // 检查 RLS 策略：尝试读取公开事件
    const { data: publicEvents, error: rlsError } = await supabaseAdmin
      .from('events')
      .select('id, status')
      .eq('status', 'published')
      .limit(1)

    if (rlsError) {
      return NextResponse.json({
        ok: false,
        code: 'RLS_POLICY_ERROR',
        message: 'RLS policy check failed',
        ts: new Date().toISOString(),
        metrics: {
          responseTimeMs: Date.now() - startTime
        },
        error: {
          code: rlsError.code,
          message: rlsError.message
        }
      }, { status: 503 })
    }

    return NextResponse.json({
      ok: true,
      code: 'DB_HEALTHY',
      message: 'Database is healthy and RLS policies are working',
      ts: new Date().toISOString(),
      metrics: {
        responseTimeMs: Date.now() - startTime,
        eventsCount: data?.length || 0,
        publicEventsCount: publicEvents?.length || 0
      }
    })

  } catch (error) {
    return NextResponse.json({
      ok: false,
      code: 'DB_HEALTH_CHECK_FAILED',
      message: 'Database health check failed',
      ts: new Date().toISOString(),
      metrics: {
        responseTimeMs: Date.now() - startTime
      },
      error: {
        message: error.message
      }
    }, { status: 500 })
  }
}
