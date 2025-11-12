import { NextResponse } from 'next/server'
import { createSupabaseClient, isSupabaseConfigured } from '@/lib/supabase-api'
import { ErrorHandler, handleApiError } from '@/lib/error-handler'
import { createLogger } from '@/lib/logger'
import bcrypt from 'bcryptjs'

const logger = createLogger('merchant-create-api')

export async function POST(request) {
  try {
    const body = await request.json()
    const { businessName, phone, inviteCode, userId, email, password, name, age } = body

    logger.info('Received merchant registration request', { businessName, inviteCode, userId: userId ? 'provided' : 'missing' })

    // 验证必需字段
    if (!businessName || !inviteCode) {
      throw ErrorHandler.validationError(
        'MISSING_FIELDS',
        'Business name and invite code are required'
      )
    }

    if (!isSupabaseConfigured()) {
      throw ErrorHandler.configurationError(
        'CONFIG_ERROR',
        'Supabase is not configured'
      )
    }

    const supabase = createSupabaseClient()

    // 验证邀请码（必须是活跃且未使用的）
    // 使用 maybeSingle() 避免 406 错误
    const { data: inviteCodeData, error: inviteError } = await supabase
      .from('admin_invite_codes')
      .select('*')
      .eq('code', inviteCode.trim().toUpperCase())
      .maybeSingle()

    if (inviteError && inviteError.code !== 'PGRST116') {
      logger.error('Error checking invite code', { error: inviteError, code: inviteCode })
      throw ErrorHandler.databaseError(
        inviteError,
        'INVITE_CODE_CHECK_FAILED',
        'Failed to verify invite code'
      )
    }

    if (!inviteCodeData) {
      throw ErrorHandler.validationError(
        'INVALID_INVITE_CODE',
        '邀请码无效，请检查是否正确'
      )
    }

    // 检查邀请码是否已被使用
    if (inviteCodeData.used_by) {
      throw ErrorHandler.validationError(
        'INVITE_CODE_ALREADY_USED',
        '邀请码已被使用，请联系管理员获取新的邀请码'
      )
    }

    // 检查邀请码是否过期
    if (new Date(inviteCodeData.expires_at) < new Date()) {
      throw ErrorHandler.validationError(
        'INVITE_CODE_EXPIRED',
        '邀请码已过期，请联系管理员获取新的邀请码'
      )
    }

    // 检查邀请码是否活跃
    if (!inviteCodeData.is_active) {
      throw ErrorHandler.validationError(
        'INVITE_CODE_INACTIVE',
        '邀请码已失效，请联系管理员获取新的邀请码'
      )
    }

    let userRecord
    let finalUserId = userId

      // 如果没有 userId，需要先创建用户
      if (!userId) {
        if (!email || !password || !name || !age) {
          throw ErrorHandler.validationError(
            'MISSING_USER_INFO',
            'Email, password, name, and age are required when creating a new user'
          )
        }
        
        // 验证邮箱格式
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        if (!emailRegex.test(email)) {
          throw ErrorHandler.validationError(
            'INVALID_EMAIL',
            '邮箱格式不正确，请检查后重试'
          )
        }

      // 检查邮箱是否已存在（检查所有角色，因为 email 是 UNIQUE 的）
      // 使用 maybeSingle() 避免 406 错误
      const { data: existingUser, error: existingUserError } = await supabase
        .from('users')
        .select('id, role')
        .eq('email', email.trim().toLowerCase())
        .maybeSingle()

      // 如果查询出错（非"不存在"的错误），抛出错误
      if (existingUserError && existingUserError.code !== 'PGRST116') {
        throw ErrorHandler.fromSupabaseError(existingUserError, 'USER_CHECK_FAILED')
      }

      if (existingUser) {
        // 如果用户已存在且是 merchant 角色，抛出错误
        if (existingUser.role === 'merchant') {
          throw ErrorHandler.conflictError(
            'EMAIL_EXISTS',
            '该邮箱已被注册为商家账户，请使用其他邮箱或直接登录'
          )
        }
        // 如果用户已存在但不是 merchant 角色，也抛出错误（邮箱唯一性）
        throw ErrorHandler.conflictError(
          'EMAIL_EXISTS',
          '该邮箱已被注册，请使用其他邮箱或直接登录'
        )
      }

      // 验证密码长度
      if (password.length < 8) {
        throw ErrorHandler.validationError(
          'PASSWORD_TOO_SHORT',
          '密码长度至少为 8 个字符'
        )
      }

      // 验证年龄（数据库约束要求 age >= 16）
      const ageInt = parseInt(age)
      if (isNaN(ageInt) || ageInt < 16) {
        throw ErrorHandler.validationError(
          'INVALID_AGE',
          '年龄必须至少为 16 岁'
        )
      }

      // 加密密码
      const hashedPassword = await bcrypt.hash(password, 12)

      // 创建商家用户
      // 规范化数据以确保符合数据库约束
      const { data: newUser, error: userError } = await supabase
        .from('users')
        .insert([{
          email: email.trim().toLowerCase(), // 规范化邮箱
          name: name.trim(),
          age: ageInt,
          password_hash: hashedPassword,
          role: 'merchant',
          is_active: true // 显式设置默认值
        }])
        .select()
        .single()

      if (userError) {
        // 记录详细的错误信息以便调试
        logger.error('User creation failed', {
          error: userError,
          email: email.trim().toLowerCase(),
          age: ageInt,
          role: 'merchant'
        })
        
        // 检查是否是约束违反错误
        if (userError.code === '23505') { // 唯一约束违反
          throw ErrorHandler.conflictError(
            'EMAIL_EXISTS',
            '该邮箱已被注册，请使用其他邮箱或直接登录'
          )
        }
        
        if (userError.code === '23514') { // 检查约束违反
          if (userError.message?.includes('age')) {
            throw ErrorHandler.validationError(
              'INVALID_AGE',
              '年龄必须至少为 16 岁'
            )
          }
          if (userError.message?.includes('role')) {
            throw ErrorHandler.validationError(
              'INVALID_ROLE',
              '无效的角色设置'
            )
          }
        }
        
        throw ErrorHandler.fromSupabaseError(userError, 'USER_CREATION_FAILED')
      }

      userRecord = newUser
      finalUserId = newUser.id
    } else {
      // 更新现有用户角色为商家
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({ role: 'merchant' })
        .eq('id', userId)
        .select()
        .single()

      if (updateError) {
        throw ErrorHandler.fromSupabaseError(updateError, 'USER_UPDATE_FAILED')
      }

      userRecord = updatedUser
    }

    // 检查用户是否已有商家账户
    // 使用 maybeSingle() 避免 406 错误
    const { data: existingMerchant, error: existingMerchantError } = await supabase
      .from('merchants')
      .select('*')
      .eq('owner_user_id', finalUserId)
      .maybeSingle()

    // 如果查询出错（非"不存在"的错误），抛出错误
    if (existingMerchantError && existingMerchantError.code !== 'PGRST116') {
      throw ErrorHandler.fromSupabaseError(existingMerchantError, 'MERCHANT_CHECK_FAILED')
    }

    if (existingMerchant) {
      throw ErrorHandler.conflictError(
        'MERCHANT_EXISTS',
        '您已经拥有商家账户，请直接登录'
      )
    }

    // 创建商家记录
    const { data: newMerchant, error: merchantError } = await supabase
      .from('merchants')
      .insert([{
        owner_user_id: finalUserId,
        name: businessName,
        description: phone ? `商家联系方式: ${phone}` : null,
        contact_email: userRecord.email,
        verified: false,
        status: 'active'
      }])
      .select()
      .single()

    if (merchantError) {
      throw ErrorHandler.fromSupabaseError(merchantError, 'MERCHANT_CREATION_FAILED')
    }

    // 标记邀请码为已使用（一次性使用，设置is_active为false）
    // 注意：admin_invite_codes 表不包含 used_at 字段
    const { error: updateInviteError } = await supabase
      .from('admin_invite_codes')
      .update({
        used_by: finalUserId,
        is_active: false // 标记为不活跃，防止再次使用
      })
      .eq('id', inviteCodeData.id)

    if (updateInviteError) {
      logger.warn('Failed to update invite code', { error: updateInviteError })
      // 非阻塞性错误，商家已创建成功
    }

    logger.success('Merchant created successfully', { merchantId: newMerchant.id })

    return NextResponse.json({
      ok: true,
      success: true,
      merchant: newMerchant,
      user: userRecord
    })

  } catch (error) {
    return handleApiError(error, request, logger)
  }
}






