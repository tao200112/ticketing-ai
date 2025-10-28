import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export async function GET() {
  try {
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json([])
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // 查询所有商家
    const { data: merchants, error } = await supabase
      .from('merchants')
      .select(`
        *,
        users!merchants_owner_user_id_fkey (
          id,
          email,
          name
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ 获取商家失败:', error)
      return NextResponse.json([])
    }

    return NextResponse.json(merchants || [])
  } catch (error) {
    console.error('Error fetching merchants:', error)
    return NextResponse.json(
      { error: 'Failed to fetch merchants' },
      { status: 500 }
    )
  }
}
