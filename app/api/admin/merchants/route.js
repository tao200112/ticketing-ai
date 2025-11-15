import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * GET /api/admin/merchants
 * Get all merchants (admin only, uses service role key to bypass RLS)
 */
export async function GET() {
  try {
    if (!supabaseAdmin) {
      console.error('❌ Supabase admin client not configured')
      return NextResponse.json(
        { error: 'Service not configured' },
        { status: 500 }
      )
    }

    // 查询所有商家（使用 service role key，绕过 RLS）
    const { data: merchants, error } = await supabaseAdmin
      .from('merchants')
      .select(`
        id,
        name,
        contact_email,
        contact_phone,
        status,
        verified,
        max_events,
        owner_supabase_uid,
        owner_user_id,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ 获取商家失败:', error)
      return NextResponse.json(
        { error: 'Failed to fetch merchants', details: error.message },
        { status: 500 }
      )
    }

    // 返回干净的 JSON 数据
    return NextResponse.json(merchants || [])
  } catch (error) {
    console.error('Error fetching merchants:', error)
    return NextResponse.json(
      { error: 'Failed to fetch merchants', details: error.message },
      { status: 500 }
    )
  }
}
