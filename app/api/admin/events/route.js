import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export async function GET() {
  try {
    // 如果没有配置 Supabase，返回空数组
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json([])
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // 从 Supabase 获取所有活动
    const { data: events, error } = await supabase
      .from('events')
      .select(`
        *,
        merchants (
          id,
          name,
          contact_email
        ),
        prices (
          id,
          name,
          amount_cents,
          inventory
        )
      `)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ 获取活动失败:', error)
      return NextResponse.json([])
    }

    return NextResponse.json(events || [])
  } catch (error) {
    console.error('Error fetching events:', error)
    return NextResponse.json([])
  }
}
