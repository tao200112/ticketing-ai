export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient as createAuthClient } from '@supabase/supabase-js'
import { createClient as createAdminClient } from '@supabase/supabase-js'

function supaAuthFromCookies() {
  return createAuthClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

const supaAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: Request) {
  try {
    const { businessName, phone, inviteCode } = await req.json()
    
    if (!businessName || !phone || !inviteCode) {
      return NextResponse.json({ ok: false, reason: 'Missing required fields' }, { status: 400 })
    }

    // 1) 读取会话（必须通过 cookies）
    const auth = supaAuthFromCookies()
    const { data: { user }, error: sessErr } = await auth.auth.getUser()
    if (sessErr || !user) {
      return NextResponse.json({ ok: false, reason: 'not_authenticated' }, { status: 401 })
    }

    // 2) 验证邀请码：先查表，表无再查 ENV
    const code = String(inviteCode || '').trim()
    let valid = false

    const { data: codeRow } = await supaAdmin
      .from('admin_invite_codes')
      .select('code,is_active,expires_at')
      .eq('code', code)
      .maybeSingle()

    if (codeRow && codeRow.is_active && (!codeRow.expires_at || new Date(codeRow.expires_at) > new Date())) {
      valid = true
    } else if (process.env.ADMIN_INVITE_CODES) {
      try {
        const list = JSON.parse(process.env.ADMIN_INVITE_CODES)
        const hit = list.find((x: any) => (x.code || '').trim().toUpperCase() === code.toUpperCase())
        if (hit) valid = !hit.expires || new Date(hit.expires) > new Date()
      } catch {}
    }
    if (!valid) {
      return NextResponse.json({ ok: false, reason: 'invalid_invite' }, { status: 400 })
    }

    // 3) 插入商家（service_role）
    const { data: merchant, error } = await supaAdmin
      .from('merchants')
      .insert({ 
        owner_user_id: user.id, 
        name: businessName, 
        contact_phone: phone,
        contact_email: user.email,
        status: 'active',
        verified: false,
        max_events: 10
      })
      .select('*')
      .single()

    if (error?.code === '23505') {
      return NextResponse.json({ ok: false, reason: 'merchant_exists' }, { status: 400 })
    }
    if (error) {
      return NextResponse.json({ ok: false, reason: error.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true, merchant }, { status: 200 })

  } catch (error) {
    console.error('Merchant create API error:', error)
    return NextResponse.json({ ok: false, reason: 'Internal server error' }, { status: 500 })
  }
}
