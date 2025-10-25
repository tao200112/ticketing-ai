import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createLogger } from '@/lib/logger'
import { getRequestId } from '@/lib/request-id'

const logger = createLogger('health/by-session')

export async function GET(request) {
  const requestId = getRequestId(request)
  const startTime = Date.now()
  
  try {
    logger.start({ requestId, fn: 'health/by-session' })
    
    const url = new URL(request.url)
    const sessionId = url.searchParams.get('session_id')
    
    if (!sessionId) {
      logger.warn('Missing session_id parameter', { requestId })
      return NextResponse.json({
        ok: false,
        code: 'MISSING_PARAM',
        message: 'session_id parameter required'
      })
    }
    
    // 检查 Supabase 配置
    if (!supabaseAdmin) {
      logger.error('Supabase admin not available', { requestId })
      return NextResponse.json({
        ok: false,
        code: 'CONFIG_ERROR',
        message: 'Database not configured'
      })
    }
    
    // 尝试查询订单
    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select('id, stripe_session_id, customer_email, status')
      .eq('stripe_session_id', sessionId)
      .single()
    
    if (error) {
      if (error.code === 'PGRST116') {
        // 订单不存在
        logger.info('Order not found', { 
          requestId, 
          sessionId: sessionId.substring(0, 8) + '...',
          supabaseError: error.code
        })
        return NextResponse.json({
          ok: false,
          code: 'ORDER_NOT_FOUND',
          message: 'Order not found'
        })
      } else {
        // 其他数据库错误
        logger.error('Database query failed', error, { 
          requestId, 
          sessionId: sessionId.substring(0, 8) + '...',
          supabaseError: error.code
        })
        return NextResponse.json({
          ok: false,
          code: 'DB_ERROR',
          message: 'Database query failed'
        })
      }
    }
    
    if (!order) {
      logger.info('Order not found (null result)', { 
        requestId, 
        sessionId: sessionId.substring(0, 8) + '...'
      })
      return NextResponse.json({
        ok: false,
        code: 'ORDER_NOT_FOUND',
        message: 'Order not found'
      })
    }
    
    // 检查订单状态
    if (order.status === 'cancelled' || order.status === 'failed') {
      logger.info('Order in failed state', { 
        requestId, 
        orderId: order.id,
        status: order.status
      })
      return NextResponse.json({
        ok: false,
        code: 'ORDER_FAILED',
        message: 'Order is in failed state'
      })
    }
    
    logger.success('Order found and accessible', {
      requestId,
      orderId: order.id,
      status: order.status,
      duration_ms: Date.now() - startTime
    })
    
    return NextResponse.json({
      ok: true,
      code: 'OK',
      message: 'Order accessible',
      orderId: order.id,
      status: order.status
    })
    
  } catch (error) {
    logger.error('Health check failed', error, {
      requestId,
      duration_ms: Date.now() - startTime,
      needs_attention: true
    })
    
    return NextResponse.json({
      ok: false,
      code: 'INTERNAL_ERROR',
      message: 'Internal server error'
    }, { status: 500 })
  }
}
