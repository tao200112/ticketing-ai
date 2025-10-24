import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabaseClient'
import { hasSupabase } from '../../../../lib/safeEnv'

// 获取用户的票据历史
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')
    const userId = searchParams.get('userId')

    if (!email && !userId) {
      return NextResponse.json(
        { error: '需要提供邮箱或用户ID' },
        { status: 400 }
      )
    }

    if (hasSupabase()) {
      if (supabase) {
        let query = supabase
          .from('tickets')
          .select(`
            id,
            short_id,
            tier,
            holder_email,
            status,
            used_at,
            created_at,
            qr_payload,
            orders (
              id,
              customer_email,
              total_amount_cents,
              currency,
              status,
              created_at
            ),
            events (
              id,
              title,
              start_at,
              end_at,
              venue_name
            )
          `)
          .order('created_at', { ascending: false })

        if (userId) {
          query = query.eq('user_id', userId)
        } else if (email) {
          query = query.eq('holder_email', email)
        }

        const { data: tickets, error } = await query

        if (error) {
          console.error('获取票据历史失败:', error)
          return NextResponse.json(
            { error: '获取票据历史失败' },
            { status: 500 }
          )
        }

        return NextResponse.json({
          success: true,
          tickets: tickets || []
        })
      }
    }

    // 降级到本地存储
    return NextResponse.json({
      success: true,
      tickets: [],
      message: 'Supabase 不可用，返回空票据列表'
    })

  } catch (error) {
    console.error('获取票据历史错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}
