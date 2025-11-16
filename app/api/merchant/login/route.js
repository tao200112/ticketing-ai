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

    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    })

    if (error) {
      logger.warn('Merchant login failed via Supabase Auth', { 
        email: normalizedEmail, 
        error: error.message,
        errorCode: error.status 
      })
      
      // 提供更详细的错误信息
      if (error.message?.includes('Email not confirmed') || error.message?.includes('email_not_confirmed')) {
        throw ErrorHandler.authenticationError(
          'EMAIL_NOT_CONFIRMED', 
          '请先验证您的邮箱。请检查您的邮箱收件箱并点击验证链接。'
        )
      }
      
      if (error.message?.includes('Invalid login credentials') || error.message?.includes('invalid_credentials')) {
        throw ErrorHandler.authenticationError('INVALID_CREDENTIALS', '邮箱或密码错误')
      }
      
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
