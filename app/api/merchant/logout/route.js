/**
 * 商家登出 API
 * 
 * 使用 Supabase Auth 会话登出
 */

import { NextResponse } from 'next/server'
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = createSupabaseRouteHandlerClient()
  if (!supabase) {
    return NextResponse.json(
      { success: false, message: 'Supabase 未配置' },
      { status: 500 }
    )
  }

  await supabase.auth.signOut()

  return NextResponse.json({
    success: true,
    message: '登出成功'
  })
}

