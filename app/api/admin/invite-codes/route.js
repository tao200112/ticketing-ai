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

    // 从数据库获取邀请码
    const { data: inviteCodes, error } = await supabase
      .from('admin_invite_codes')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching invite codes:', error)
      return NextResponse.json([])
    }

    return NextResponse.json(inviteCodes || [])
  } catch (error) {
    console.error('Error fetching invite codes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invite codes' },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { expiresAt, maxEvents } = body

    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseKey)

    // 生成新的邀请码
    const code = Math.random().toString(36).substring(2, 10).toUpperCase()

    // 插入数据库
    const { data: newInviteCode, error } = await supabase
      .from('admin_invite_codes')
      .insert({
        code,
        expires_at: expiresAt || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 默认90天后过期
        max_events: maxEvents || 10,
        is_active: true
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating invite code:', error)
      return NextResponse.json(
        { error: 'Failed to create invite code' },
        { status: 500 }
      )
    }

    return NextResponse.json(newInviteCode)
  } catch (error) {
    console.error('Error creating invite code:', error)
    return NextResponse.json(
      { error: 'Failed to create invite code' },
      { status: 500 }
    )
  }
}
