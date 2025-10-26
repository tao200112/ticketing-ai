import { supabaseAdmin } from '../../../../lib/supabase-admin'

export async function GET() {
  try {
    console.log('[SupabaseTest] Starting Supabase connection test...')
    
    // 检查Supabase配置
    if (!supabaseAdmin) {
      console.error('[SupabaseTest] Supabase admin client is null')
      return Response.json({
        success: false,
        message: 'Supabase admin client is not configured',
        details: {
          hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
          url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not set'
        }
      }, { status: 503 })
    }

    console.log('[SupabaseTest] Supabase admin client is configured')

    // 测试数据库连接
    try {
      const { data, error } = await supabaseAdmin
        .from('users')
        .select('id, email, name')
        .limit(1)

      if (error) {
        console.error('[SupabaseTest] Database query error:', error)
        return Response.json({
          success: false,
          message: 'Database query failed',
          error: error.message,
          details: error
        }, { status: 500 })
      }

      console.log('[SupabaseTest] Database query successful:', data?.length || 0, 'users found')

      return Response.json({
        success: true,
        message: `Supabase connection successful. Found ${data?.length || 0} users.`,
        data: data,
        details: {
          hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
          url: process.env.NEXT_PUBLIC_SUPABASE_URL || 'Not set',
          usersCount: data?.length || 0
        }
      })

    } catch (dbError) {
      console.error('[SupabaseTest] Database connection error:', dbError)
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
    console.error('[SupabaseTest] Unexpected error:', error)
    return Response.json({
      success: false,
      message: 'Unexpected error occurred',
      error: error.message
    }, { status: 500 })
  }
}
