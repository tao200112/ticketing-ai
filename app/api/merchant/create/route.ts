export const runtime = 'nodejs'

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient as createBrowser } from '@supabase/supabase-js'
import { createClient as createAdmin } from '@supabase/supabase-js'

const anon = () =>
  createBrowser(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: { get: (k) => cookies().get(k)?.value }
  })

const admin = () =>
  createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

export async function POST(req: Request) {
  try {
    const { businessName, phone, inviteCode } = await req.json()
    
    if (!businessName || !phone || !inviteCode) {
      return NextResponse.json({ ok: false, reason: 'Missing required fields' }, { status: 400 })
    }

    const auth = anon()
    const { data: { user }, error: userError } = await auth.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ ok: false, reason: 'not_authenticated' }, { status: 401 })
    }

    const db = admin()

    // 1) 表内校验邀请码
    let valid = false
    const { data: row } = await db.from('admin_invite_codes')
      .select('code,is_active,expires_at')
      .eq('code', inviteCode.trim())
      .maybeSingle()
    
    if (row && row.is_active && (!row.expires_at || new Date(row.expires_at) > new Date())) {
      valid = true
    }

    // 2) ENV 兜底
    if (!valid && process.env.ADMIN_INVITE_CODES) {
      try {
        const list = JSON.parse(process.env.ADMIN_INVITE_CODES)
        const hit = list.find((x: any) => (x.code || '').trim().toUpperCase() === inviteCode.trim().toUpperCase())
        if (hit) {
          valid = !hit.expires || new Date(hit.expires) > new Date()
        }
      } catch (e) {
        console.error('Error parsing ADMIN_INVITE_CODES:', e)
      }
    }

    if (!valid) {
      return NextResponse.json({ ok: false, reason: 'invalid_invite' }, { status: 400 })
    }

    // 检查是否已经是商户
    const { data: existingMerchant } = await db.from('merchants')
      .select('id')
      .eq('owner_user_id', user.id)
      .maybeSingle()

    if (existingMerchant) {
      return NextResponse.json({ ok: false, reason: 'merchant_exists' }, { status: 400 })
    }

    // 创建商户
    const { data: merchant, error } = await db.from('merchants')
      .insert({ 
        owner_user_id: user.id, 
        name: businessName, 
        contact_email: user.email,
        contact_phone: phone,
        status: 'active',
        verified: false,
        max_events: 10
      })
      .select('*')
      .single()

    if (error?.code === '23505') { // unique violation
      return NextResponse.json({ ok: false, reason: 'merchant_exists' }, { status: 400 })
    }

    if (error) {
      console.error('Merchant creation error:', error)
      return NextResponse.json({ ok: false, reason: error.message }, { status: 400 })
    }

    return NextResponse.json({ ok: true, merchant }, { status: 200 })

  } catch (error) {
    console.error('Merchant create API error:', error)
    return NextResponse.json({ ok: false, reason: 'Internal server error' }, { status: 500 })
  }
}
