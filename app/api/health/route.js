import { NextResponse } from 'next/server'

/**
 * 应用健康检查端点
 * 
 * 返回：
 * - 应用存活状态
 * - 版本信息
 * - 构建信息
 * - 当前时间
 */
export async function GET() {
  const startTime = Date.now()
  
  try {
    const healthData = {
      ok: true,
      code: 'HEALTHY',
      message: 'Application is healthy',
      ts: new Date().toISOString(),
      metrics: {
        responseTimeMs: Date.now() - startTime,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        nodeVersion: process.version,
        platform: process.platform
      },
      version: {
        app: process.env.NEXT_PUBLIC_APP_VERSION || 'dev',
        build: process.env.NEXT_PUBLIC_BUILD_TIME || new Date().toISOString(),
        git: process.env.NEXT_PUBLIC_GIT_SHA || 'unknown'
      }
    }

    return NextResponse.json(healthData, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error) {
    return NextResponse.json({
      ok: false,
      code: 'HEALTH_CHECK_FAILED',
      message: 'Health check failed',
      ts: new Date().toISOString(),
      metrics: {
        responseTimeMs: Date.now() - startTime
      }
    }, { status: 500 })
  }
}
