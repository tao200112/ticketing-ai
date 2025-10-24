import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../lib/supabase-admin'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // 检查环境变量
    const envCheck = {
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      ADMIN_INVITE_CODES: !!process.env.ADMIN_INVITE_CODES
    }

    // 检查数据库连接和统计
    let dbStats: any = {}
    try {
      const [
        { count: users },
        { count: merchants },
        { count: events },
        { count: orders },
        { count: tickets },
        { count: inviteCodes }
      ] = await Promise.all([
        supabaseAdmin.from('users').select('*', { count: 'exact', head: true }),
        supabaseAdmin.from('merchants').select('*', { count: 'exact', head: true }),
        supabaseAdmin.from('events').select('*', { count: 'exact', head: true }),
        supabaseAdmin.from('orders').select('*', { count: 'exact', head: true }),
        supabaseAdmin.from('tickets').select('*', { count: 'exact', head: true }),
        supabaseAdmin.from('admin_invite_codes').select('*', { count: 'exact', head: true })
      ])

      dbStats = {
        users: users || 0,
        merchants: merchants || 0,
        events: events || 0,
        orders: orders || 0,
        tickets: tickets || 0,
        inviteCodes: inviteCodes || 0
      }
    } catch (dbError) {
      dbStats = { error: 'Database connection failed', details: dbError instanceof Error ? dbError.message : 'Unknown error' }
    }

    // 检查邀请码
    let inviteCodeCheck = {}
    try {
      const { data: codes } = await supabaseAdmin
        .from('admin_invite_codes')
        .select('code, is_active, expires_at')
        .eq('is_active', true)
        .limit(5)

      inviteCodeCheck = {
        activeCodes: codes?.length || 0,
        codes: codes || []
      }
    } catch (error) {
      inviteCodeCheck = { error: 'Failed to fetch invite codes' }
    }

    return NextResponse.json({
      status: 'Production diagnostic',
      timestamp: new Date().toISOString(),
      environment: envCheck,
      database: dbStats,
      inviteCodes: inviteCodeCheck,
      recommendations: {
        merchantRegistration: envCheck.SUPABASE_SERVICE_ROLE_KEY ? 'Service role configured' : 'Missing SUPABASE_SERVICE_ROLE_KEY',
        adminStats: dbStats.users > 0 ? 'Database has data' : 'Database appears empty - check user sync trigger',
        inviteCodes: inviteCodeCheck.activeCodes > 0 ? 'Active invite codes available' : 'No active invite codes found'
      }
    })
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Diagnostic failed',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
