'use server'

/**
 * 商家受保护的布局（仅保护 /merchant 下的后台页面，不影响 /merchant/auth/*）
 * 基于 Supabase 会话 + merchants.email 判断是否为商家，非商家跳转到注册页
 */

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export default async function MerchantProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = createSupabaseServerClient()
  if (!supabase) {
    redirect('/merchant/auth/login')
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) {
    redirect('/merchant/auth/login')
  }

  const { data: merchant } = await supabase
    .from('merchants')
    .select('*')
    .eq('email', user.email.toLowerCase())
    .maybeSingle()

  if (!merchant || merchant.status !== 'active') {
    // 仅当用户已登录但不是商家时，引导至商家注册页
    redirect('/merchant/auth/register')
  }

  return <>{children}</>
}


