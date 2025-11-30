'use server'

import { revalidatePath } from 'next/cache'
import { supabaseAdmin } from '@/lib/supabase-admin'

type UpdateMerchantRegionInput = {
  merchantId: string
  regionId: string
}

export async function updateMerchantRegion({ merchantId, regionId }: UpdateMerchantRegionInput) {
  if (!supabaseAdmin) {
    throw new Error('Supabase admin client not configured')
  }

  if (!merchantId || !regionId) {
    throw new Error('Merchant and region are required')
  }

  const { data: regionRecord, error: regionError } = await supabaseAdmin
    .from('regions')
    .select('id, slug')
    .eq('id', regionId)
    .maybeSingle()

  if (regionError) {
    throw new Error(regionError.message || 'Failed to load region metadata')
  }

  if (!regionRecord) {
    throw new Error('Region not found')
  }

  const { error: updateError } = await supabaseAdmin
    .from('merchants')
    .update({
      region_id: regionRecord.id,
      region: regionRecord.slug,
    })
    .eq('id', merchantId)

  if (updateError) {
    throw new Error(updateError.message || 'Failed to update merchant region')
  }

  revalidatePath('/admin/merchants')
  return { success: true }
}


