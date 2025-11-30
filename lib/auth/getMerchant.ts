import 'server-only'

import { createSupabaseServerClient } from '@/lib/supabase/server'

export type MerchantProfile = {
  id: string
  auth_user_id: string
  email: string
  name: string | null
  contact_phone: string | null
  status: string | null
  verified: boolean
  max_events: number | null
  region_id: string | null
  region: string | null
  region_name: string | null
  region_slug: string | null
}

export async function getMerchantProfile(): Promise<MerchantProfile | null> {
  const supabase = createSupabaseServerClient()
  if (!supabase) {
    return null
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user?.id) {
    return null
  }

  const { data: merchant, error: merchantError } = await supabase
    .from('merchants')
    .select(
      `
      id,
      auth_user_id,
      email,
      name,
      contact_phone,
      status,
      verified,
      max_events,
      region_id,
      region
    `,
    )
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (merchantError || !merchant) {
    return null
  }

  let regionSlug = merchant.region as string | null
  let regionName: string | null = null

  if (merchant.region_id) {
    const { data: regionRecord } = await supabase
      .from('regions')
      .select('slug, name')
      .eq('id', merchant.region_id)
      .maybeSingle()

    regionSlug = regionSlug || regionRecord?.slug || null
    regionName = regionRecord?.name || null
  }

  return {
    ...merchant,
    region: regionSlug,
    region_slug: regionSlug,
    region_name: regionName,
  }
}


