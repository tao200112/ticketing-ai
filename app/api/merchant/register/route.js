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
import { createClient } from '@supabase/supabase-js'

const logger = createLogger('merchant-register-api')

/**
 * 创建使用 Service Role Key 的 Supabase 客户端
 * 绕过 RLS 策略，用于商家注册等操作
 */
function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw ErrorHandler.configurationError(
      'CONFIG_ERROR',
      'Supabase Service Role Key 未配置'
    )
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

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

    // 使用 Service Role Key 创建客户端，绕过 RLS 策略
    const supabase = createServiceRoleClient()

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
    // 支持两种表：invite_codes（新表）和 admin_invite_codes（旧表，向后兼容）
    const normalizedInviteCode = inviteCode.trim().toUpperCase()
    let inviteCodeData = null
    let inviteTableName = null

    // 首先尝试查询 admin_invite_codes 表（当前使用的表）
    // 因为 invite_codes 表可能还不存在（迁移未运行）
    const { data: oldInviteCode, error: oldInviteError } = await supabase
      .from('admin_invite_codes')
      .select('*')
      .eq('code', normalizedInviteCode)
      .maybeSingle()

    if (oldInviteCode) {
      // 找到邀请码，使用旧表
      inviteCodeData = oldInviteCode
      inviteTableName = 'admin_invite_codes'
      logger.info('Found invite code in admin_invite_codes', { code: normalizedInviteCode })
    } else if (oldInviteError && oldInviteError.code !== 'PGRST116') {
      // 查询出错（不是"未找到"的错误）
      logger.error('Error checking invite code in admin_invite_codes', { 
        error: oldInviteError, 
        code: normalizedInviteCode,
        errorCode: oldInviteError.code,
        errorMessage: oldInviteError.message
      })
      
      // 尝试查询新表（如果存在）
      const { data: newInviteCode, error: newInviteError } = await supabase
        .from('invite_codes')
        .select('*')
        .eq('code', normalizedInviteCode)
        .eq('type', 'merchant')
        .maybeSingle()

      if (newInviteCode) {
        inviteCodeData = newInviteCode
        inviteTableName = 'invite_codes'
        logger.info('Found invite code in invite_codes', { code: normalizedInviteCode })
      } else if (newInviteError && newInviteError.code !== 'PGRST116') {
        // 新表查询也出错
        logger.error('Error checking invite code in both tables', { 
          oldError: oldInviteError,
          newError: newInviteError,
          code: normalizedInviteCode
        })
        throw ErrorHandler.databaseError(
          oldInviteError,
          'INVITE_CODE_CHECK_FAILED',
          '验证邀请码失败'
        )
      }
    } else {
      // 旧表未找到，尝试新表
      const { data: newInviteCode, error: newInviteError } = await supabase
        .from('invite_codes')
        .select('*')
        .eq('code', normalizedInviteCode)
        .eq('type', 'merchant')
        .maybeSingle()

      if (newInviteCode) {
        inviteCodeData = newInviteCode
        inviteTableName = 'invite_codes'
        logger.info('Found invite code in invite_codes', { code: normalizedInviteCode })
      } else if (newInviteError && newInviteError.code !== 'PGRST116') {
        // 新表查询出错（不是"未找到"）
        logger.error('Error checking invite code in invite_codes', { 
          error: newInviteError, 
          code: normalizedInviteCode 
        })
        throw ErrorHandler.databaseError(
          newInviteError,
          'INVITE_CODE_CHECK_FAILED',
          '验证邀请码失败'
        )
      }
    }

    if (!inviteCodeData) {
      logger.warn('Invite code not found', { code: normalizedInviteCode })
      throw ErrorHandler.validationError(
        'INVALID_INVITE_CODE',
        '邀请码无效，请检查是否正确'
      )
    }

    // 检查邀请码是否已被使用
    // 新表使用 used 字段，旧表使用 used_by 字段
    const isUsed = inviteTableName === 'invite_codes' 
      ? inviteCodeData.used 
      : (inviteCodeData.used_by !== null || inviteCodeData.is_active === false)

    if (isUsed) {
      throw ErrorHandler.validationError(
        'INVITE_CODE_ALREADY_USED',
        '邀请码已被使用，请联系管理员获取新的邀请码'
      )
    }

    // 检查邀请码是否过期（仅对旧表）
    if (inviteTableName === 'admin_invite_codes' && inviteCodeData.expires_at) {
      if (new Date(inviteCodeData.expires_at) < new Date()) {
        throw ErrorHandler.validationError(
          'INVITE_CODE_EXPIRED',
          '邀请码已过期，请联系管理员获取新的邀请码'
        )
      }
    }

    // 检查邀请码是否活跃（仅对旧表）
    if (inviteTableName === 'admin_invite_codes' && !inviteCodeData.is_active) {
      throw ErrorHandler.validationError(
        'INVITE_CODE_INACTIVE',
        '邀请码已失效，请联系管理员获取新的邀请码'
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
    if (inviteTableName === 'invite_codes') {
      // 新表：使用 used 和 used_at 字段
      const updatePayload = {
        used: true,
        used_at: new Date().toISOString()
      }
      
      logger.info('Updating invite code (new table) with payload', { 
        inviteCodeId: inviteCodeData.id,
        payload: updatePayload
      })
      
      const { data: updatedInvite, error: updateInviteError } = await supabase
        .from('invite_codes')
        .update(updatePayload)
        .eq('id', inviteCodeData.id)
        .select()
        .maybeSingle()

      if (updateInviteError) {
        logger.warn('Failed to update invite code (new table)', { 
          error: updateInviteError,
          errorCode: updateInviteError.code,
          errorMessage: updateInviteError.message,
          errorDetails: updateInviteError.details,
          errorHint: updateInviteError.hint,
          payload: updatePayload,
          inviteCodeId: inviteCodeData.id
        })
        // 非阻塞性错误，商家已创建成功
      } else {
        logger.info('Successfully updated invite code (new table)', { 
          inviteCodeId: inviteCodeData.id,
          code: normalizedInviteCode,
          updatedData: updatedInvite
        })
      }
    } else {
      // 旧表 admin_invite_codes：根据实际表结构更新
      // 表结构：id, code, max_events, is_active, used_by (UUID), used_at, expires_at, created_at, created_by
      // 注意：used_by 是 UUID 引用 users(id)，但商家不在 users 表中
      // 只更新 is_active 和 used_at，不更新 used_by（保持原值或 NULL）
      const updatePayload = {
        is_active: false,
        used_at: new Date().toISOString()
        // 不更新 used_by，因为它是外键引用 users(id)，商家不在 users 表中
      }
      
      logger.info('Updating invite code (admin_invite_codes) with payload', { 
        inviteCodeId: inviteCodeData.id,
        code: normalizedInviteCode,
        payload: updatePayload,
        currentInviteCodeData: {
          id: inviteCodeData.id,
          code: inviteCodeData.code,
          is_active: inviteCodeData.is_active,
          used_by: inviteCodeData.used_by,
          used_at: inviteCodeData.used_at
        }
      })
      
      const { data: updatedInvite, error: updateInviteError } = await supabase
        .from('admin_invite_codes')
        .update(updatePayload)
        .eq('id', inviteCodeData.id)
        .select()
        .maybeSingle()

      if (updateInviteError) {
        logger.warn('Invite code update failed after merchant created', { 
          error: updateInviteError,
          errorCode: updateInviteError.code,
          errorMessage: updateInviteError.message,
          errorDetails: updateInviteError.details,
          errorHint: updateInviteError.hint,
          payload: updatePayload,
          inviteCodeId: inviteCodeData.id,
          code: normalizedInviteCode
        })
        // 非阻塞性错误，商家已创建成功，只记录警告
      } else {
        logger.info('Successfully updated invite code (admin_invite_codes)', { 
          inviteCodeId: inviteCodeData.id,
          code: normalizedInviteCode,
          updatedData: updatedInvite
        })
      }
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

