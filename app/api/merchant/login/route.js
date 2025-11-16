/**
 * 商家登录 API（基于 Supabase Auth）
 * 
 * 统一使用 Supabase Auth 会话，不再使用自建 JWT
 */

import { NextResponse } from 'next/server'
import { ErrorHandler, handleApiError } from '@/lib/error-handler'
import { createLogger } from '@/lib/logger'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

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

    // 使用 @supabase/ssr + cookies() 让 Supabase 写入会话 cookie
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
      // 详细记录错误信息用于调试
      logger.warn('Merchant login failed via Supabase Auth', { 
        email: normalizedEmail, 
        error: error.message,
        errorCode: error.status,
        errorName: error.name,
        fullError: JSON.stringify(error, Object.getOwnPropertyNames(error))
      })
      
      // 提供更详细的错误信息
      // 注意：商家账号不应该遇到邮箱未验证的错误，因为注册时已自动确认
      if (error.message?.includes('Email not confirmed') || error.message?.includes('email_not_confirmed')) {
        logger.error('Merchant login failed due to unconfirmed email - this should not happen', {
          email: normalizedEmail,
          error: error.message
        })
        // 对于商家账号，如果遇到邮箱未验证错误，尝试自动确认
        // 这可能是注册时自动确认失败的情况
        try {
          const { createClient } = await import('@supabase/supabase-js')
          const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
          if (supabaseServiceKey) {
            const admin = createClient(
              process.env.NEXT_PUBLIC_SUPABASE_URL,
              supabaseServiceKey,
              { auth: { autoRefreshToken: false, persistSession: false } }
            )
            // 查找用户并确认邮箱
            const { data: { users } } = await admin.auth.admin.listUsers()
            const user = users.find(u => u.email?.toLowerCase() === normalizedEmail)
            if (user) {
              await admin.auth.admin.updateUserById(user.id, { email_confirm: true })
              logger.info('Auto-confirmed merchant email during login retry', { email: normalizedEmail })
              // 重试登录
              const { data: retryData, error: retryError } = await supabase.auth.signInWithPassword({
                email: normalizedEmail,
                password,
              })
              if (!retryError && retryData?.user) {
                logger.info('Merchant login successful after auto-confirm', {
                  userId: retryData.user.id,
                  email: retryData.user.email,
                })
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
        // 记录更详细的错误信息
        logger.error('Invalid credentials - checking if user exists in Supabase Auth', {
          email: normalizedEmail,
          errorDetails: error
        })
        throw ErrorHandler.authenticationError('INVALID_CREDENTIALS', '邮箱或密码错误')
      }
      
      // 记录未知错误
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
      emailConfirmed: data.user.email_confirmed_at !== null,
    })

    // 可选：这里不直接检查 merchants 表，由 RSC/layout 统一做商家身份鉴权
    return NextResponse.json({
      success: true,
      message: '登录成功',
    })
  } catch (error) {
    return handleApiError(error, request, logger)
  }
}
