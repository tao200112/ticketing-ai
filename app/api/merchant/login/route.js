/**
 * 商家登录 API（基于 Supabase Auth）
 * 
 * 统一使用 Supabase Auth 会话，不再使用自建 JWT
 */

import { NextResponse } from 'next/server'
import { ErrorHandler, handleApiError } from '@/lib/error-handler'
import { createLogger } from '@/lib/logger'
import { cookies } from 'next/headers'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'

const logger = createLogger('merchant-login-api')

export async function POST(request) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      throw ErrorHandler.validationError(
        'MISSING_FIELDS',
        '邮箱和密码都是必需的'
      )
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseAnonKey) {
      throw ErrorHandler.configurationError('CONFIG_ERROR', 'Supabase 未配置')
    }

    // 使用 Supabase Auth Helpers（注意：cookies 必须是函数，不能直接传对象）
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({
      cookies: () => cookieStore
    })

    const normalizedEmail = email.trim().toLowerCase()

    // 记录登录尝试
    logger.info('Merchant login attempt', {
      email: normalizedEmail,
      timestamp: new Date().toISOString()
    })

    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    })

    if (error) {
      // 详细记录错误
      logger.warn('Merchant login failed via Supabase Auth', { 
        email: normalizedEmail, 
        error: error.message,
        errorCode: error.status,
        errorName: error.name,
        fullError: JSON.stringify(error, Object.getOwnPropertyNames(error))
      })
      
      if (error.message?.includes('Email not confirmed') || error.message?.includes('email_not_confirmed')) {
        logger.error('Merchant login failed due to unconfirmed email', {
          email: normalizedEmail,
          error: error.message
        })

        try {
          const { createClient } = await import('@supabase/supabase-js')
          const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
          if (supabaseServiceKey) {
            const admin = createClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL,
              supabaseServiceKey,
              { auth: { autoRefreshToken: false, persistSession: false } }
            )

            const { data: { users } } = await admin.auth.admin.listUsers()
            const user = users.find(u => u.email?.toLowerCase() === normalizedEmail)

            if (user) {
              await admin.auth.admin.updateUserById(user.id, { email_confirm: true })
              logger.info('Auto-confirmed merchant email during login retry', { email: normalizedEmail })

              const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
                email: normalizedEmail,
                password,
              })

              if (!retryError && retryData?.user) {
                logger.info('Merchant login successful after auto-confirm', {
                  userId: retryData.user.id,
                  email: retryData.user.email,
                })

                // 🔥 关键：自动确认后需要刷新 session cookie
                await supabase.auth.getSession();

                return NextResponse.json({
                  success: true,
                  message: '登录成功',
                })
              }
            }
          }
        } catch (autoConfirmError) {
          logger.error('Failed to auto-confirm email during login', {
            email: normalizedEmail,
            error: autoConfirmError.message
          })
        }
        
        throw ErrorHandler.authenticationError(
          'EMAIL_NOT_CONFIRMED', 
          '商家账号邮箱未确认。请联系管理员或使用调试工具确认邮箱。'
        )
      }
      
      if (error.message?.includes('Invalid login credentials') || error.message?.includes('invalid_credentials')) {
        logger.error('Invalid credentials', {
          email: normalizedEmail,
          errorDetails: error
        })
        throw ErrorHandler.authenticationError('INVALID_CREDENTIALS', '邮箱或密码错误')
      }
      
      logger.error('Unknown login error', {
        email: normalizedEmail,
        error: error.message,
        errorCode: error.status,
        fullError: error
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

    // -----------------------------
    // 🔥🔥🔥【关键补丁：写入 Supabase Cookie】🔥🔥🔥
    // -----------------------------
    await supabase.auth.getSession();
    // -----------------------------

    return NextResponse.json({
      success: true,
      message: '登录成功',
    })

  } catch (error) {
    return handleApiError(error, request, logger)
  }
}
