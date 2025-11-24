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
    // 不再查询 temp_password，所有密码由 Supabase Auth 处理
    const { data: merchants, error } = await supabaseAdmin
      .from('merchants')
      .select(`
        id,
        name,
        email,
        contact_phone,
        status,
        verified,
        max_events,
        region_id,
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

    let enrichedMerchants = merchants || []
    const regionIds = Array.from(
      new Set(
        (enrichedMerchants || [])
          .map((merchant) => merchant.region_id)
          .filter(Boolean)
      )
    )

    if (regionIds.length > 0) {
      const { data: regions, error: regionsError } = await supabaseAdmin
        .from('regions')
        .select('id, name, slug')
        .in('id', regionIds)

      if (regionsError) {
        console.warn('⚠️ Failed to load region metadata for merchants', regionsError)
      } else {
        const regionMap = new Map(regions.map((region) => [region.id, region]))
        enrichedMerchants = enrichedMerchants.map((merchant) => ({
          ...merchant,
          region: regionMap.get(merchant.region_id) || null,
        }))
      }
    }

    // 返回干净的 JSON 数据
    return NextResponse.json(enrichedMerchants)
  } catch (error) {
    console.error('Error fetching merchants:', error)
    return NextResponse.json(
      { error: 'Failed to fetch merchants', details: error.message },
      { status: 500 }
    )
  }
}
