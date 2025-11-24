/**
 * 商家个人信息 API（受保护）
 * 
 * 基于 Supabase Auth 会话 + merchants 表
 */

import { NextResponse } from 'next/server'
import { ErrorHandler, handleApiError } from '@/lib/error-handler'
import { createLogger } from '@/lib/logger'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

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
  created_at,
  updated_at
`

export async function GET(request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseAnonKey) {
      throw ErrorHandler.configurationError('CONFIG_ERROR', 'Supabase 未配置')
    }

    const cookieStore = cookies()
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        },
      },
    })

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user?.id) {
      logger.warn('Merchant profile: user not authenticated', { error: userError })
      return NextResponse.json(
        {
          success: false,
          error: 'AUTHENTICATION_REQUIRED',
          message: '请先登录',
          type: 'AUTHENTICATION_ERROR'
        },
        { status: 401 }
      )
    }

    const authUserId = user.id

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

    let regionSlug = null
    let regionName = null
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
      region_slug: regionSlug,
      region_name: regionName
    }

    return NextResponse.json({
      success: true,
      merchant: merchantResponse
    })

  } catch (error) {
    return handleApiError(error, request, logger)
  }
}

