/**
 * 商家登录 API（基于 Supabase Auth）
 * 需要确保 Supabase Route Handler helper 正确地写入 session cookie
 */

import { NextResponse } from 'next/server'
import { ErrorHandler, handleApiError } from '@/lib/error-handler'
import { createLogger } from '@/lib/logger'
import { createSupabaseRouteHandlerClient } from '@/lib/supabase/server'
import { ensureMerchantRegionByAuthId } from '@/lib/db/ensureMerchantRegion'

const logger = createLogger('merchant-login-api')

interface MerchantLoginPayload {
  email?: string
  password?: string
}

async function attemptAutoConfirmAndRetry(
  supabase: ReturnType<typeof createSupabaseRouteHandlerClient>,
  normalizedEmail: string,
  password: string
) {
  const { supabaseAdmin } = await import('@/lib/supabase-admin')
  if (!supabaseAdmin) {
    logger.error('缺少 Supabase service role key，无法自动确认邮箱', { email: normalizedEmail })
    return null
  }

  const admin = supabaseAdmin

  const { data: { users } = { users: [] } } = await admin.auth.admin.listUsers()
  const user = users?.find(u => u.email?.toLowerCase() === normalizedEmail)

  if (!user) {
    return null
  }

  await admin.auth.admin.updateUserById(user.id, { email_confirm: true })
  logger.info('Auto-confirmed merchant email during login retry', { email: normalizedEmail })

  const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  })

  if (retryError || !retryData?.user) {
    logger.warn('Merchant login retry after auto-confirm failed', {
      email: normalizedEmail,
      error: retryError?.message,
    })
    return null
  }

  logger.info('Merchant login successful after auto-confirm', {
    userId: retryData.user.id,
    email: retryData.user.email,
  })

  await supabase.auth.getSession()
  return NextResponse.json({
    success: true,
    message: '登录成功',
  })
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as MerchantLoginPayload
    const { email, password } = body

    if (!email || !password) {
      throw ErrorHandler.validationError('MISSING_FIELDS', '邮箱和密码都是必需的')
    }

    const supabase = createSupabaseRouteHandlerClient()
    if (!supabase) {
      throw ErrorHandler.configurationError('CONFIG_ERROR', 'Supabase 未配置')
    }

    const normalizedEmail = email.trim().toLowerCase()

    logger.info('Merchant login attempt', {
      email: normalizedEmail,
      timestamp: new Date().toISOString(),
    })

    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    })

    if (error) {
      logger.warn('Merchant login failed via Supabase Auth', {
        email: normalizedEmail,
        error: error.message,
        errorCode: error.status,
        errorName: error.name,
        fullError: JSON.stringify(error, Object.getOwnPropertyNames(error)),
      })

      if (
        error.message?.includes('Email not confirmed') ||
        error.message?.includes('email_not_confirmed')
      ) {
        logger.error('Merchant login failed due to unconfirmed email', {
          email: normalizedEmail,
          error: error.message,
        })

        const autoConfirmResponse = await attemptAutoConfirmAndRetry(
          supabase,
          normalizedEmail,
          password
        )

        if (autoConfirmResponse) {
          return autoConfirmResponse
        }

        throw ErrorHandler.authenticationError(
          'EMAIL_NOT_CONFIRMED',
          '商家账号邮箱未确认。请联系管理员或使用调试工具确认邮箱。'
        )
      }

      if (
        error.message?.includes('Invalid login credentials') ||
        error.message?.includes('invalid_credentials')
      ) {
        logger.error('Invalid credentials', {
          email: normalizedEmail,
          errorDetails: error,
        })
        throw ErrorHandler.authenticationError('INVALID_CREDENTIALS', '邮箱或密码错误')
      }

      logger.error('Unknown login error', {
        email: normalizedEmail,
        error: error.message,
        errorCode: error.status,
        fullError: error,
      })

      throw ErrorHandler.authenticationError(
        'LOGIN_FAILED',
        error.message || '登录失败，请重试'
      )
    }

    if (!data?.user) {
      logger.error('Merchant login returned no user data', { email: normalizedEmail })
      throw ErrorHandler.authenticationError('LOGIN_FAILED', '登录失败，未返回用户数据')
    }

    logger.info('Merchant login via Supabase Auth success', {
      userId: data.user.id,
      email: data.user.email,
    })

    await supabase.auth.getSession()

    // 确保商家有 region_id（如果缺失则自动分配）
    try {
      const ensuredRegionId = await ensureMerchantRegionByAuthId(data.user.id)
      if (ensuredRegionId) {
        logger.info('Merchant region ensured after login', {
          userId: data.user.id,
          regionId: ensuredRegionId
        })
      } else {
        logger.warn('Failed to ensure merchant region after login', {
          userId: data.user.id
        })
      }
    } catch (regionError) {
      // 非阻塞性错误：登录成功，region 修复失败不影响登录流程
      logger.warn('Error ensuring merchant region after login (non-blocking)', {
        userId: data.user.id,
        error: regionError instanceof Error ? regionError.message : String(regionError)
      })
    }

    return NextResponse.json({
      success: true,
      message: '登录成功',
    })
  } catch (error) {
    return handleApiError(error, request, logger)
  }
}

