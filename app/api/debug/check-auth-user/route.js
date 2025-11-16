/**
 * 调试 API：检查 Supabase Auth 中的用户
 * 仅用于调试，不应在生产环境使用
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    if (!email) {
      return NextResponse.json(
        { error: 'Email parameter is required' },
        { status: 400 }
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { error: 'Supabase configuration missing' },
        { status: 500 }
      )
    }

    // 使用 Service Role Key 来查询用户
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const normalizedEmail = email.trim().toLowerCase()

    // 查询 Supabase Auth 中的用户
    const { data: { users }, error } = await supabase.auth.admin.listUsers()

    if (error) {
      return NextResponse.json(
        { error: 'Failed to list users', details: error.message },
        { status: 500 }
      )
    }

    // 查找匹配的用户
    const user = users.find(u => u.email?.toLowerCase() === normalizedEmail)

    if (!user) {
      return NextResponse.json({
        found: false,
        message: 'User not found in Supabase Auth',
        email: normalizedEmail
      })
    }

    // 返回用户信息（不包含敏感信息）
    return NextResponse.json({
      found: true,
      user: {
        id: user.id,
        email: user.email,
        emailConfirmed: user.email_confirmed_at !== null,
        emailConfirmedAt: user.email_confirmed_at,
        createdAt: user.created_at,
        lastSignInAt: user.last_sign_in_at,
        confirmedAt: user.confirmed_at,
        phone: user.phone,
        phoneConfirmed: user.phone_confirmed_at !== null,
        metadata: user.user_metadata,
        appMetadata: user.app_metadata
      }
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

