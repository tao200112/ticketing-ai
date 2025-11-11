import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

export function getRouteHandlerSupabase() {
  return createRouteHandlerClient({ cookies })
}

export async function getServerUser() {
  const supabase = getRouteHandlerSupabase()
  const { data, error } = await supabase.auth.getUser()

  if (error || !data?.user) {
    return null
  }

  return data.user
}