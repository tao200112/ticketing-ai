import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * GET /api/admin/invite-codes
 * Get all invite codes (admin only, uses service role key to bypass RLS)
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

    // 从数据库获取邀请码（使用 service role key，绕过 RLS）
    const { data: inviteCodes, error } = await supabaseAdmin
      .from('admin_invite_codes')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Error fetching invite codes:', error)
      return NextResponse.json(
        { error: 'Failed to fetch invite codes', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(inviteCodes || [])
  } catch (error) {
    console.error('❌ Error fetching invite codes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invite codes', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/invite-codes
 * Create a new invite code (admin only, uses service role key to bypass RLS)
 */
export async function POST(request) {
  try {
    if (!supabaseAdmin) {
      console.error('❌ Supabase admin client not configured')
      return NextResponse.json(
        { error: 'Service not configured' },
        { status: 500 }
      )
    }

    const body = await request.json().catch(() => ({}))
    const { expiresAt, maxEvents } = body

    // 生成唯一的邀请码（格式：INV_XXXXXXXX）
    // 使用时间戳 + 随机字符串确保唯一性
    const generateUniqueCode = () => {
      const timestamp = Date.now().toString(36).toUpperCase()
      const random = Math.random().toString(36).substring(2, 8).toUpperCase()
      return `INV_${timestamp}_${random}`
    }

    let code = generateUniqueCode()
    let attempts = 0
    const maxAttempts = 5

    // 确保生成的 code 是唯一的（最多尝试 5 次）
    while (attempts < maxAttempts) {
      const { data: existing } = await supabaseAdmin
        .from('admin_invite_codes')
        .select('id')
        .eq('code', code)
        .maybeSingle()

      if (!existing) {
        break // Code is unique
      }

      code = generateUniqueCode()
      attempts++
    }

    if (attempts >= maxAttempts) {
      console.error('❌ Failed to generate unique invite code after', maxAttempts, 'attempts')
      return NextResponse.json(
        { error: 'Failed to generate unique invite code' },
        { status: 500 }
      )
    }

    // 计算过期时间（默认 90 天后）
    const defaultExpiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString()
    const expires_at = expiresAt || defaultExpiresAt

    // 插入数据库（新邀请码默认为未使用状态）
    const { data: newInviteCode, error } = await supabaseAdmin
      .from('admin_invite_codes')
      .insert({
        code,
        expires_at,
        max_events: maxEvents || 10, // 默认 max_events 为 10（与表结构一致）
        is_active: true, // 新邀请码默认为活跃状态
        used_by: null, // 未使用
        used_at: null // 未使用
      })
      .select()
      .single()

    if (error) {
      console.error('❌ Error creating invite code:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      })
      return NextResponse.json(
        { 
          error: 'Failed to create invite code',
          details: error.message,
          code: error.code
        },
        { status: 500 }
      )
    }

    console.log('✅ Successfully created invite code:', newInviteCode.code)
    return NextResponse.json(newInviteCode, { status: 201 })
  } catch (error) {
    console.error('❌ Error creating invite code:', {
      message: error.message,
      stack: error.stack
    })
    return NextResponse.json(
      { 
        error: 'Failed to create invite code',
        details: error.message
      },
      { status: 500 }
    )
  }
}
