/**
 * 商家个人信息 API（受保护）
 */

import { NextResponse } from 'next/server'
import { ErrorHandler, handleApiError } from '@/lib/error-handler'
import { createLogger } from '@/lib/logger'
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/server'

const logger = createLogger('merchant-profile-api')

const MERCHANT_FIELDS = `
  id,
  auth_user_id,
  email,
  name,
  contact_phone,
  status,
  verified,
  max_events,
  region_id,
  region,
  created_at,
  updated_at
`

async function unauthorizedResponse() {
  return NextResponse.json(
    {
      success: false,
      error: 'AUTHENTICATION_REQUIRED',
      message: '请先登录',
      type: 'AUTHENTICATION_ERROR',
      session_user_id: null,
    },
    { status: 401 }
  )
}

export async function GET(request: Request) {
  try {
    const supabase = createSupabaseRouteHandlerClient()
    if (!supabase) {
      throw ErrorHandler.configurationError('CONFIG_ERROR', 'Supabase 未配置')
    }

    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession()

    if (sessionError || !session?.user?.id) {
      logger.warn('Merchant profile: user not authenticated', { error: sessionError })
      return unauthorizedResponse()
    }

    const authUserId = session.user.id

    const { data: merchant, error: merchantError } = await supabase
      .from('merchants')
      .select(MERCHANT_FIELDS)
      .eq('auth_user_id', authUserId)
      .maybeSingle()

    if (merchantError) {
      throw ErrorHandler.databaseError(
        merchantError,
        'DATABASE_ERROR',
        '获取商家信息失败'
      )
    }

    if (!merchant) {
      logger.warn('Merchant not found', { authUserId })
      throw ErrorHandler.notFoundError(
        'MERCHANT_NOT_FOUND',
        '商家不存在，请先注册商家账户'
      )
    }

    let regionSlug: string | null = null
    let regionName: string | null = null
    if (merchant.region_id) {
      const { data: regionRecord } = await supabase
        .from('regions')
        .select('slug, name')
        .eq('id', merchant.region_id)
        .maybeSingle()

      regionSlug = regionRecord?.slug || null
      regionName = regionRecord?.name || null
    }

    const merchantResponse = {
      ...merchant,
      region: merchant.region || regionSlug,
      region_slug: regionSlug,
      region_name: regionName,
    }

    return NextResponse.json({
      success: true,
      merchant: merchantResponse,
      session_user_id: authUserId,
    })
  } catch (error) {
    return handleApiError(error, request, logger)
  }
}

