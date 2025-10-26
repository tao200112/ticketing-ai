import { supabaseAdmin } from '../../../../lib/supabase-admin'

export async function GET() {
  try {
    console.log('[Database Test] Starting database connection test...')
    
    // 检查Supabase配置
    if (!supabaseAdmin) {
      console.error('[Database Test] Supabase admin client is null')
      return Response.json({
        success: false,
        message: 'Supabase admin client is not configured',
        details: {
          hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
          url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not set'
        }
      }, { status: 500 })
    }

    console.log('[Database Test] Supabase admin client is configured')

    // 测试数据库连接
    try {
      const { data, error } = await supabaseAdmin
        .from('events')
        .select('id, title, created_at')
        .limit(5)

      if (error) {
        console.error('[Database Test] Database query error:', error)
        return Response.json({
          success: false,
          message: 'Database query failed',
          error: error.message,
          details: error
        }, { status: 500 })
      }

      console.log('[Database Test] Database query successful:', data?.length || 0, 'events found')

      return Response.json({
        success: true,
        message: `Database connection successful. Found ${data?.length || 0} events.`,
        data: data,
        details: {
          hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
          url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not set',
          eventsCount: data?.length || 0
        }
      })

    } catch (dbError) {
      console.error('[Database Test] Database connection error:', dbError)
      return Response.json({
        success: false,
        message: 'Database connection failed',
        error: dbError.message,
        details: {
          hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
          url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not set'
        }
      }, { status: 500 })
    }

  } catch (error) {
    console.error('[Database Test] Unexpected error:', error)
    return Response.json({
      success: false,
      message: 'Unexpected error occurred',
      error: error.message
    }, { status: 500 })
  }
}
