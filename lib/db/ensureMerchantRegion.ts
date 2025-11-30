/**
 * 确保商家始终有 region_id 的工具函数
 * 
 * 功能：
 * 1. 查询 merchant_profile (merchants 表) 的 region_id
 * 2. 如果存在 → 返回它
 * 3. 否则获取默认 region
 * 4. 如果没有任何 region → 创建 fallback region
 * 5. 更新 merchant_profile.region_id = defaultRegion.id
 * 6. 返回 region_id
 */

import 'server-only'
import { createLogger } from '@/lib/logger'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { getDefaultRegion } from '@/lib/regions'

const logger = createLogger('ensureMerchantRegion')

/**
 * 确保商家有 region_id，如果没有则自动分配
 * 
 * @param merchantId - 商家 ID (merchants 表的 id)
 * @returns 保证返回的 region_id，如果失败则返回 null
 */
export async function ensureMerchantRegion(merchantId: string): Promise<string | null> {
  if (!merchantId) {
    logger.warn('ensureMerchantRegion called with empty merchantId')
    return null
  }

  if (!supabaseAdmin) {
    logger.error('Supabase admin client not available')
    return null
  }

  try {
    // 1. 查询 merchant_profile (merchants 表) 的 region_id
    const { data: merchant, error: merchantError } = await supabaseAdmin
      .from('merchants')
      .select('id, region_id')
      .eq('id', merchantId)
      .maybeSingle()

    if (merchantError) {
      logger.error('Error querying merchant', { 
        merchantId, 
        error: merchantError 
      })
      return null
    }

    if (!merchant) {
      logger.warn('Merchant not found', { merchantId })
      return null
    }

    // 2. 如果 region_id 存在且不为 null，直接返回
    const regionId = (merchant as any).region_id
    if (regionId) {
      logger.info('Merchant already has region_id', { 
        merchantId, 
        regionId 
      })
      return regionId
    }

    logger.info('Merchant missing region_id, attempting to assign default', { 
      merchantId 
    })

    // 3. 获取默认 region
    let defaultRegion = await getDefaultRegion()

    // 4. 如果没有任何 region，创建 fallback region
    if (!defaultRegion) {
      logger.warn('No regions exist, creating fallback region')
      
      const fallbackRegion = {
        id: 'default-region',
        name: 'Default Region',
        slug: 'default-region',
        timezone: 'America/New_York',
        is_active: true
      }

      // 尝试插入 fallback region（使用 upsert 避免重复）
      const { data: insertedRegion, error: insertError } = await supabaseAdmin
        .from('regions')
        .upsert(fallbackRegion as any, { 
          onConflict: 'id',
          ignoreDuplicates: false 
        })
        .select()
        .single()

      if (insertError) {
        // 如果插入失败，尝试查询是否已存在
        const { data: existingRegion } = await supabaseAdmin
          .from('regions')
          .select('*')
          .eq('id', 'default-region')
          .maybeSingle()

        if (existingRegion) {
          defaultRegion = existingRegion as any
        } else {
          logger.error('Failed to create fallback region', { error: insertError })
          return null
        }
      } else {
        defaultRegion = insertedRegion as any
        logger.info('Created fallback region', { regionId: (defaultRegion as any).id })
      }
    }

    // 如果仍然没有 defaultRegion，尝试获取任何 region（按 ID 排序，取最小的）
    if (!defaultRegion) {
      logger.warn('Still no default region, fetching any region with lowest ID')
      const { data: anyRegion } = await supabaseAdmin
        .from('regions')
        .select('*')
        .eq('is_active', true)
        .order('id', { ascending: true })
        .limit(1)
        .maybeSingle()

      if (anyRegion) {
        defaultRegion = anyRegion
        logger.info('Using region with lowest ID', { regionId: defaultRegion.id })
      }
    }

    if (!defaultRegion?.id) {
      logger.error('Failed to get or create default region')
      return null
    }

    // 5. 更新 merchant_profile.region_id = defaultRegion.id
    const regionIdToUpdate = (defaultRegion as any).id
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = (supabaseAdmin as any)
      .from('merchants')
      .update({ region_id: regionIdToUpdate })
      .eq('id', merchantId)

    if (updateError) {
      logger.error('Failed to update merchant region_id', { 
        merchantId, 
        regionId: regionIdToUpdate,
        error: updateError 
      })
      return null
    }

    logger.success('Successfully assigned region to merchant', { 
      merchantId, 
      regionId: regionIdToUpdate 
    })

    // 6. 返回 region_id
    return regionIdToUpdate

  } catch (error) {
    logger.error('Exception in ensureMerchantRegion', { 
      merchantId, 
      error: error instanceof Error ? error.message : String(error) 
    })
    return null
  }
}

/**
 * 通过 auth user ID 确保商家有 region_id
 * 
 * @param authUserId - Supabase Auth 用户 ID (owner_supabase_uid)
 * @returns 保证返回的 region_id，如果失败则返回 null
 */
export async function ensureMerchantRegionByAuthId(authUserId: string): Promise<string | null> {
  if (!authUserId) {
    logger.warn('ensureMerchantRegionByAuthId called with empty authUserId')
    return null
  }

  if (!supabaseAdmin) {
    logger.error('Supabase admin client not available')
    return null
  }

  try {
    // 通过 owner_supabase_uid 查找商家
    const { data: merchant, error: merchantError } = await supabaseAdmin
      .from('merchants')
      .select('id, region_id, owner_supabase_uid')
      .eq('owner_supabase_uid', authUserId)
      .maybeSingle()

    if (merchantError) {
      logger.error('Error querying merchant by auth user ID', { 
        authUserId, 
        error: merchantError 
      })
      return null
    }

    if (!merchant) {
      logger.warn('Merchant not found for auth user ID', { authUserId })
      return null
    }

    // 使用主函数确保 region_id
    const merchantId = (merchant as any).id
    return await ensureMerchantRegion(merchantId)

  } catch (error) {
    logger.error('Exception in ensureMerchantRegionByAuthId', { 
      authUserId, 
      error: error instanceof Error ? error.message : String(error) 
    })
    return null
  }
}

