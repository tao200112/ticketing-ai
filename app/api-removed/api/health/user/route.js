import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/**
 * 用户健康检查端点
 * 
 * 返回：
 * - 当前登录状态摘要
 * - 不暴露 PII 信息
 * - 用户权限状态
 */
export async function GET(request) {
  const startTime = Date.now()
  
  try {
    // 创建 Supabase 客户端（使用 anon key）
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )

    // 获取当前用户信息（不暴露敏感数据）
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError) {
      return NextResponse.json({
        ok: false,
        code: 'AUTH_CHECK_FAILED',
        message: 'Authentication check failed',
        ts: new Date().toISOString(),
        metrics: {
          responseTimeMs: Date.now() - startTime
        },
        error: {
          code: userError.message
        }
      }, { status: 503 })
    }

    // 构建用户状态摘要（不包含 PII）
    const userSummary = {
      isAuthenticated: !!user,
      hasUser: !!user,
      userId: user?.id ? user.id.substring(0, 8) + '...' : null,
      emailVerified: user?.email_confirmed_at ? true : false,
      lastSignIn: user?.last_sign_in_at ? new Date(user.last_sign_in_at).toISOString() : null,
      createdAt: user?.created_at ? new Date(user.created_at).toISOString() : null
    }

    // 检查用户权限（如果有用户）
    let permissions = {}
    if (user) {
      try {
        // 检查用户是否能访问自己的数据
        const { data: userData, error: dataError } = await supabase
          .from('orders')
          .select('id')
          .limit(1)

        permissions = {
          canReadOwnData: !dataError,
          dataAccessError: dataError?.code || null
        }
      } catch (permError) {
        permissions = {
          canReadOwnData: false,
          dataAccessError: permError.message
        }
      }
    }

    return NextResponse.json({
      ok: true,
      code: 'USER_HEALTHY',
      message: 'User health check completed',
      ts: new Date().toISOString(),
      metrics: {
        responseTimeMs: Date.now() - startTime,
        isAuthenticated: userSummary.isAuthenticated,
        hasPermissions: permissions.canReadOwnData
      },
      user: userSummary,
      permissions: permissions
    })

  } catch (error) {
    return NextResponse.json({
      ok: false,
      code: 'USER_HEALTH_CHECK_FAILED',
      message: 'User health check failed',
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
