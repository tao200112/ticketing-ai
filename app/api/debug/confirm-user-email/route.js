/**
 * 调试 API：手动确认用户邮箱
 * 仅用于调试，不应在生产环境使用
 */

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(request) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
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

    // 使用 Service Role Key
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const normalizedEmail = email.trim().toLowerCase()

    // 查找用户
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()

    if (listError) {
      return NextResponse.json(
        { error: 'Failed to list users', details: listError.message },
        { status: 500 }
      )
    }

    const user = users.find(u => u.email?.toLowerCase() === normalizedEmail)

    if (!user) {
      return NextResponse.json(
        { error: 'User not found', email: normalizedEmail },
        { status: 404 }
      )
    }

    // 确认用户邮箱
    const { data: updateData, error: updateError } = await supabase.auth.admin.updateUserById(
      user.id,
      {
        email_confirm: true
      }
    )

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to confirm email', details: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Email confirmed successfully',
      user: {
        id: updateData.user.id,
        email: updateData.user.email,
        emailConfirmed: updateData.user.email_confirmed_at !== null,
        emailConfirmedAt: updateData.user.email_confirmed_at
      }
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

