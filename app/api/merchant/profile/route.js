/**
 * 商家个人信息 API（受保护）
 * 
 * 需要有效的商家 JWT token
 */

import { NextResponse } from 'next/server'
import { createSupabaseClient, isSupabaseConfigured } from '@/lib/supabase-api'
import { ErrorHandler, handleApiError } from '@/lib/error-handler'
import { createLogger } from '@/lib/logger'
import { verifyMerchantAuth } from '@/lib/auth/merchant-jwt'

const logger = createLogger('merchant-profile-api')

export async function GET(request) {
  try {
    // 验证商家认证
    const merchantAuth = verifyMerchantAuth(request)
    
    if (!merchantAuth) {
      throw ErrorHandler.authenticationError(
        'AUTHENTICATION_REQUIRED',
        '请先登录'
      )
    }

    if (!isSupabaseConfigured()) {
      throw ErrorHandler.configurationError(
        'CONFIG_ERROR',
        'Supabase 未配置'
      )
    }

    const supabase = createSupabaseClient()

    // 获取商家详细信息
    const { data: merchant, error: merchantError } = await supabase
      .from('merchants')
      .select('id, email, name, verified, status, created_at')
      .eq('id', merchantAuth.id)
      .single()

    if (merchantError) {
      logger.error('Error fetching merchant profile', { 
        error: merchantError, 
        merchantId: merchantAuth.id 
      })
      throw ErrorHandler.databaseError(
        merchantError,
        'DATABASE_ERROR',
        '获取商家信息失败'
      )
    }

    if (!merchant) {
      throw ErrorHandler.notFoundError(
        'MERCHANT_NOT_FOUND',
        '商家不存在'
      )
    }

    return NextResponse.json({
      success: true,
      merchant
    })

  } catch (error) {
    return handleApiError(error, request, logger)
  }
}

