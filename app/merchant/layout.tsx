'use server'

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export default async function MerchantLayout({ children }: { children: React.ReactNode }) {
  const supabase = createSupabaseServerClient()
  if (!supabase) {
    redirect('/merchant/auth/login')
  }

  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) {
    redirect('/merchant/auth/login')
  }

  // 通过 email 映射到 merchants 表，作为「是否为商家」的最简判断
  const { data: merchant } = await supabase
    .from('merchants')
    .select('*')
    .eq('email', user.email.toLowerCase())
    .maybeSingle()

  if (!merchant || merchant.status !== 'active') {
    redirect('/merchant/auth/register')
  }

  return <>{children}</>
}


