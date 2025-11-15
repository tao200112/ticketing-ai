/**
 * 商家注册 API
 * 
 * 完全独立于 Supabase Auth 的商家注册系统
 * 使用 bcrypt 加密密码，JWT token 用于会话管理
 */

import { NextResponse } from 'next/server'
import { createSupabaseClient, isSupabaseConfigured } from '@/lib/supabase-api'
import { ErrorHandler, handleApiError } from '@/lib/error-handler'
import { createLogger } from '@/lib/logger'
import bcrypt from 'bcryptjs'
import { generateMerchantToken, setMerchantTokenCookie } from '@/lib/auth/merchant-jwt'

const logger = createLogger('merchant-register-api')

export async function POST(request) {
  try {
    const body = await request.json()
    const { email, password, inviteCode, name } = body

    // 验证必需字段
    if (!email || !password || !inviteCode || !name) {
      throw ErrorHandler.validationError(
        'MISSING_FIELDS',
        '邮箱、密码、邀请码和商家名称都是必需的'
      )
    }

    if (!isSupabaseConfigured()) {
      throw ErrorHandler.configurationError(
        'CONFIG_ERROR',
        'Supabase 未配置'
      )
    }

    const supabase = createSupabaseClient()

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const normalizedEmail = email.trim().toLowerCase()
    
    if (!emailRegex.test(normalizedEmail)) {
      throw ErrorHandler.validationError(
        'INVALID_EMAIL',
        '邮箱格式不正确'
      )
    }

    // 验证密码长度
    if (password.length < 8) {
      throw ErrorHandler.validationError(
        'PASSWORD_TOO_SHORT',
        '密码长度至少为 8 个字符'
      )
    }

    // 1. 验证邀请码
    const normalizedInviteCode = inviteCode.trim().toUpperCase()
    const { data: inviteCodeData, error: inviteError } = await supabase
      .from('invite_codes')
      .select('*')
      .eq('code', normalizedInviteCode)
      .eq('type', 'merchant')
      .maybeSingle()

    if (inviteError && inviteError.code !== 'PGRST116') {
      logger.error('Error checking invite code', { error: inviteError, code: normalizedInviteCode })
      throw ErrorHandler.databaseError(
        inviteError,
        'INVITE_CODE_CHECK_FAILED',
        '验证邀请码失败'
      )
    }

    if (!inviteCodeData) {
      throw ErrorHandler.validationError(
        'INVALID_INVITE_CODE',
        '邀请码无效，请检查是否正确'
      )
    }

    // 检查邀请码是否已被使用
    if (inviteCodeData.used) {
      throw ErrorHandler.validationError(
        'INVITE_CODE_ALREADY_USED',
        '邀请码已被使用，请联系管理员获取新的邀请码'
      )
    }

    // 2. 检查商家邮箱是否已注册
    const { data: existingMerchant, error: merchantCheckError } = await supabase
      .from('merchants')
      .select('id, email')
      .eq('email', normalizedEmail)
      .maybeSingle()

    if (merchantCheckError && merchantCheckError.code !== 'PGRST116') {
      logger.error('Error checking merchant email', { error: merchantCheckError, email: normalizedEmail })
      throw ErrorHandler.databaseError(
        merchantCheckError,
        'MERCHANT_CHECK_FAILED',
        '检查商家邮箱失败'
      )
    }

    if (existingMerchant) {
      throw ErrorHandler.conflictError(
        'MERCHANT_EMAIL_EXISTS',
        '该邮箱已被注册，请使用其他邮箱或直接登录'
      )
    }

    // 3. 加密密码
    const passwordHash = await bcrypt.hash(password, 12)
    logger.info('Password hashed successfully', { email: normalizedEmail })

    // 4. 创建商家记录
    const { data: newMerchant, error: merchantError } = await supabase
      .from('merchants')
      .insert([{
        email: normalizedEmail,
        password_hash: passwordHash,
        name: name.trim(),
        verified: false,
        status: 'active'
      }])
      .select('id, email, name, created_at')
      .single()

    if (merchantError) {
      logger.error('Error creating merchant', { error: merchantError, email: normalizedEmail })
      throw ErrorHandler.fromSupabaseError(merchantError, 'MERCHANT_CREATION_FAILED')
    }

    // 5. 标记邀请码为已使用
    const { error: updateInviteError } = await supabase
      .from('invite_codes')
      .update({
        used: true,
        used_at: new Date().toISOString()
      })
      .eq('id', inviteCodeData.id)

    if (updateInviteError) {
      logger.warn('Failed to update invite code', { error: updateInviteError })
      // 非阻塞性错误，商家已创建成功
    }

    // 6. 生成 JWT token
    const token = generateMerchantToken({
      id: newMerchant.id,
      email: newMerchant.email,
      name: newMerchant.name
    })

    // 7. 创建响应并设置 cookie
    const response = NextResponse.json({
      success: true,
      message: '商家注册成功',
      merchant: {
        id: newMerchant.id,
        email: newMerchant.email,
        name: newMerchant.name
      }
    })

    setMerchantTokenCookie(response, token)

    logger.success('Merchant registered successfully', { 
      merchantId: newMerchant.id, 
      email: normalizedEmail 
    })

    return response

  } catch (error) {
    return handleApiError(error, request, logger)
  }
}

