/**
 * 商家登出 API
 * 
 * 使用 Supabase Auth 会话登出
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

export async function POST() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { success: false, message: 'Supabase 未配置' },
      { status: 500 }
    )
  }

  const supabase = createRouteHandlerClient({
    cookies,
  })

  await supabase.auth.signOut()

  return NextResponse.json({
    success: true,
    message: '登出成功'
  })
}

