/**
 * 商家登录 API
 * 
 * 完全独立于 Supabase Auth 的商家登录系统
 * 使用 bcrypt 验证密码，JWT token 用于会话管理
 */

import { NextResponse } from 'next/server'
import { createSupabaseClient, isSupabaseConfigured } from '@/lib/supabase-api'
import { ErrorHandler, handleApiError } from '@/lib/error-handler'
import { createLogger } from '@/lib/logger'
import bcrypt from 'bcryptjs'
import { generateMerchantToken, setMerchantTokenCookie } from '@/lib/auth/merchant-jwt'

const logger = createLogger('merchant-login-api')

export async function POST(request) {
  try {
    const body = await request.json()
    const { email, password } = body

    // 验证必需字段
    if (!email || !password) {
      throw ErrorHandler.validationError(
        'MISSING_FIELDS',
        '邮箱和密码都是必需的'
      )
    }

    if (!isSupabaseConfigured()) {
      throw ErrorHandler.configurationError(
        'CONFIG_ERROR',
        'Supabase 未配置'
      )
    }

    const supabase = createSupabaseClient()

    // 规范化邮箱
    const normalizedEmail = email.trim().toLowerCase()

    // 查找商家
    const { data: merchant, error: merchantError } = await supabase
      .from('merchants')
      .select('id, email, password_hash, name, status')
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (merchantError && merchantError.code !== 'PGRST116') {
      logger.error('Error fetching merchant', { error: merchantError, email: normalizedEmail })
      throw ErrorHandler.databaseError(
        merchantError,
        'DATABASE_ERROR',
        '数据库查询错误'
      )
    }

    if (!merchant) {
      logger.warn('Merchant not found', { email: normalizedEmail })
      throw ErrorHandler.authenticationError(
        'INVALID_CREDENTIALS',
        '邮箱或密码错误'
      )
    }

    // 检查商家状态
    if (merchant.status !== 'active') {
      logger.warn('Merchant account inactive', { merchantId: merchant.id, status: merchant.status })
      throw ErrorHandler.authenticationError(
        'ACCOUNT_INACTIVE',
        '商家账户已被停用，请联系管理员'
      )
    }

    // 验证密码
    if (!merchant.password_hash) {
      logger.error('Merchant has no password hash', { merchantId: merchant.id })
      throw ErrorHandler.authenticationError(
        'INVALID_CREDENTIALS',
        '邮箱或密码错误'
      )
    }

    const isValidPassword = await bcrypt.compare(password, merchant.password_hash)

    if (!isValidPassword) {
      logger.warn('Invalid password', { merchantId: merchant.id, email: normalizedEmail })
      throw ErrorHandler.authenticationError(
        'INVALID_CREDENTIALS',
        '邮箱或密码错误'
      )
    }

    // 生成 JWT token
    const token = generateMerchantToken({
      id: merchant.id,
      email: merchant.email,
      name: merchant.name
    })

    // 创建响应并设置 cookie
    const response = NextResponse.json({
      success: true,
      message: '登录成功',
      merchant: {
        id: merchant.id,
        email: merchant.email,
        name: merchant.name
      }
    })

    setMerchantTokenCookie(response, token)

    logger.success('Merchant logged in successfully', { 
      merchantId: merchant.id, 
      email: normalizedEmail 
    })

    return response

  } catch (error) {
    return handleApiError(error, request, logger)
  }
}
