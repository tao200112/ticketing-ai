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
    if (userError || !user?.email) {
      throw ErrorHandler.authenticationError(
        'AUTHENTICATION_REQUIRED',
        '请先登录'
      )
    }

    const normalizedEmail = user.email.toLowerCase()

    const { data: merchant, error: merchantError } = await supabase
      .from('merchants')
      .select('id, email, name, verified, status, created_at')
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (merchantError) {
      logger.error('Error fetching merchant profile', { error: merchantError, email: normalizedEmail })
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

